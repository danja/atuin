import { turtleTheme } from './TurtleTheme.js'
import { EditorState } from '@codemirror/state'
import { EditorView, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { RDFParser } from './Parser.js'
import { URIUtils } from '../utils/URIUtils.js'
import { turtle } from './TurtleMode.js'
import { syntaxErrorHighlighter, setSyntaxError } from './SyntaxErrorHighlighter.js'
import { nodeHighlighter, setHighlightedNode } from './NodeHighlighter.js'

/**
 * Editor component for RDF Turtle syntax with syntax highlighting
 */
export class TurtleEditor {
  /**
   * Creates a new TurtleEditor
   *
   * @param {HTMLElement} textareaElement - The textarea element to replace
   * @param {Object} logger - Logger service
   */
  constructor(textareaElement, logger) {
    this.element = textareaElement
    this.logger = logger
    this.view = null

    this.parser = new RDFParser(logger)
    this.changeCallbacks = []
    this.syntaxCheckState = 'pending'

    // Store prefixes and dynamic names for autocompletion
    this.prefixes = {}
    this.dynamicNames = {}

    // Debounce syntax checking
    this.syntaxCheckTimeout = null
  }

  /**
   * Initialize the editor with CodeMirror
   */
  initialize() {
    // Add the syntax highlighting styles
    this._addSyntaxStyles()

    // Create the editor
    const startState = EditorState.create({
      doc: this.element.value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        turtle(),
        turtleTheme, // <-- This line was missing in the original code
        syntaxErrorHighlighter(),
        nodeHighlighter(),
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            this._onContentChange()
          }
        })
      ]
    })

    // Create the editor view
    this.view = new EditorView({
      state: startState,
      parent: this.element.parentNode
    })

    // Hide the original textarea
    this.element.style.display = 'none'

    // Initial syntax check
    this._onContentChange()

    this.logger.debug('Editor initialized with Turtle syntax highlighting')
  }

  /**
   * Add syntax highlighting styles to the document
   */
  _addSyntaxStyles() {
    const styleEl = document.createElement('style')
    styleEl.textContent = `
      /* CodeMirror 6 syntax highlighting */
      .cm-content .tok-keyword { color: #7e57c2; font-weight: bold; }
      .cm-content .tok-definition { color: #0277bd; font-weight: bold; }
      .cm-content .tok-string { color: #d81b60; }
      .cm-content .tok-comment { color: #546e7a; font-style: italic; }
      .cm-content .tok-number { color: #00796b; }
      .cm-content .tok-bool { color: #2e7d32; }
      .cm-content .tok-operator { color: #ff6f00; font-weight: bold; }
      .cm-content .tok-propertyName { color: #6200ea; font-weight: bold; }
      .cm-content .tok-atom { color: #f57c00; font-weight: bold; }
      .cm-content .tok-typeName { color: #039be5; }
      .cm-content .tok-invalid { color: #c62828; text-decoration: wavy underline; }
      .cm-content .tok-bracket { color: #616161; }

      /* Node highlighting */
      .cm-highlight {
        background-color: rgba(144, 238, 144, 0.4);
        border-radius: 2px;
        transition: background-color 0.2s ease;
        text-decoration: underline;
        text-decoration-style: wavy;
        text-decoration-color: darkgreen;
      }

      .cm-highlight:hover {
        background-color: rgba(144, 238, 144, 0.7);
      }

      @keyframes highlight-pulse {
        0% { background-color: rgba(144, 238, 144, 0.3); }
        50% { background-color: rgba(144, 238, 144, 0.8); }
        100% { background-color: rgba(144, 238, 144, 0.3); }
      }

      .cm-highlight.pulse {
        animation: highlight-pulse 1s ease;
      }
    `
    document.head.appendChild(styleEl)
  }

  /**
   * Handler for content changes
   */
  _onContentChange() {
    // Update the original textarea value
    this.element.value = this.getValue()

    // Debounce syntax checking
    clearTimeout(this.syntaxCheckTimeout)
    this.syntaxCheckTimeout = setTimeout(() => {
      this.checkSyntax()
    }, 500)

    // Notify change listeners
    this._notifyChangeListeners()
  }

  /**
   * Notify all registered change listeners
   */
  _notifyChangeListeners() {
    const content = this.getValue()
    this.changeCallbacks.forEach(callback => callback(content))
  }

  /**
   * Get the current editor content
   *
   * @returns {string} Current editor content
   */
  getValue() {
    return this.view ? this.view.state.doc.toString() : this.element.value
  }

  /**
   * Set the editor content
   *
   * @param {string} content - The new content
   */
  setValue(content) {
    if (!this.view) {
      this.element.value = content
      return
    }

    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: content
      }
    })

    // Reset cached data
    this.prefixes = {}
    this.dynamicNames = {}

    // Check syntax
    this.checkSyntax()
  }

  /**
   * Check the syntax of the current content
   */
  checkSyntax() {
    this.changeSyntaxCheckState('working')

    const content = this.getValue()

    // Skip empty content
    if (!content.trim()) {
      this.changeSyntaxCheckState('passed')
      return
    }

    // Parse the content
    this.parser.parse(content, {
      onError: (error) => {
        this.changeSyntaxCheckState('failed', error.message)

        // Highlight the error in the editor
        if (this.view && error.line) {
          this.view.dispatch({
            effects: setSyntaxError.of({
              line: error.line,
              message: error.message
            })
          })
        }
      },
      onTriple: (triple) => {
        // Extract namespace and name for autocompletion
        const subjects = URIUtils.splitNamespace(triple.subject)
        const predicates = URIUtils.splitNamespace(triple.predicate)
        const objects = URIUtils.splitNamespace(triple.object)

        this._addToDynamicNames(subjects.namespace, subjects.name)
        this._addToDynamicNames(predicates.namespace, predicates.name)
        this._addToDynamicNames(objects.namespace, objects.name)
      },
      onComplete: (prefixes) => {
        this.prefixes = prefixes || {}
        this.changeSyntaxCheckState('passed')

        // Clear error highlights
        if (this.view) {
          this.view.dispatch({
            effects: setSyntaxError.of({
              line: 0,
              message: ''
            })
          })
        }
      }
    })
  }

  /**
   * Add namespace and name to dynamic names for autocompletion
   *
   * @param {string} namespace - The namespace
   * @param {string} name - The local name
   */
  _addToDynamicNames(namespace, name) {
    if (!namespace || !name) return

    this.dynamicNames[namespace] = this.dynamicNames[namespace] || {}
    this.dynamicNames[namespace][name] = true
  }

  /**
   * Highlight a node in the editor when selected in the graph visualization
   *
   * @param {string} nodeId - The ID of the node to highlight
   */
  highlightNode(nodeId) {
    if (!nodeId || !this.view) return

    // Dispatch the effect to highlight this node
    this.view.dispatch({
      effects: setHighlightedNode.of(nodeId)
    })

    this.logger.debug(`Highlighting node: ${nodeId}`)

    // Find and scroll to the first occurrence of the node
    const doc = this.view.state.doc.toString()
    let searchVariations = [
      `<${nodeId}>`, // Full URI with angle brackets
      URIUtils.isLiteral(nodeId) ? null : URIUtils.shrinkUri(nodeId, this.prefixes) // Shortened form
    ].filter(Boolean)

    if (URIUtils.isLiteral(nodeId)) {
      searchVariations.push(nodeId) // The literal value itself

      // Also look for the raw value without quotes
      if (nodeId.startsWith('"') && nodeId.endsWith('"')) {
        searchVariations.push(nodeId.substring(1, nodeId.length - 1))
      }
    }

    // Find the first occurrence of any variation
    let firstPos = -1
    for (const variation of searchVariations) {
      const pos = doc.indexOf(variation)
      if (pos !== -1 && (firstPos === -1 || pos < firstPos)) {
        firstPos = pos
      }
    }

    // If found, scroll to the position
    if (firstPos !== -1) {
      const line = this.view.state.doc.lineAt(firstPos)
      this.view.dispatch({
        effects: EditorView.scrollIntoView(firstPos, {
          y: "center"
        })
      })

      // Flash the highlight briefly to make it more noticeable
      setTimeout(() => {
        const highlights = document.querySelectorAll('.cm-highlight')
        highlights.forEach(highlight => {
          highlight.classList.add('pulse')

          setTimeout(() => {
            highlight.classList.remove('pulse')
          }, 1000)
        })
      }, 100)
    }
  }

  /**
   * Change the syntax check state
   *
   * @param {string} newState - The new state
   * @param {string} error - Optional error message
   */
  changeSyntaxCheckState(newState, error) {
    if (newState === this.syntaxCheckState) return

    this.syntaxCheckState = newState

    // Dispatch event for UI to update
    const event = new CustomEvent('syntax-check-state-change', {
      detail: {
        state: newState,
        error: error
      }
    })

    document.dispatchEvent(event)
  }

  /**
   * Register a change listener
   *
   * @param {Function} callback - Callback function
   */
  onChange(callback) {
    this.changeCallbacks.push(callback)
  }

  /**
   * Remove a change listener
   *
   * @param {Function} callback - Callback to remove
   */
  offChange(callback) {
    const index = this.changeCallbacks.indexOf(callback)
    if (index !== -1) {
      this.changeCallbacks.splice(index, 1)
    }
  }

  /**
   * Get the current prefixes
   *
   * @returns {Object} Map of prefixes to namespaces
   */
  getPrefixes() {
    return this.prefixes
  }

  /**
   * Get the dynamic names for autocompletion
   *
   * @returns {Object} Map of namespaces to names
   */
  getDynamicNames() {
    return this.dynamicNames
  }
}