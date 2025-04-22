import { EditorState } from '@codemirror/state'
import { EditorView, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { RDFParser } from './Parser.js'
import { URIUtils } from '../utils/URIUtils.js'
import { turtle } from './TurtleMode.js'
import { syntaxErrorHighlighter, setSyntaxError } from './SyntaxErrorHighlighter.js'
import { nodeHighlighter, setHighlightedNode } from './NodeHighlighter.js'

/**
 * Editor component with Turtle syntax support and error highlighting
 */
export class TurtleEditor {
  /**
   * Create a new TurtleEditor
   * 
   * @param {HTMLElement} textareaElement - The textarea to replace with the editor
   * @param {LoggerService} logger - The logger service
   */
  constructor(textareaElement, logger) {
    this.element = textareaElement
    this.logger = logger
    this.view = null

    this.parser = new RDFParser(logger)
    this.changeCallbacks = []
    this.syntaxCheckState = 'pending'

    // Store for prefixes and dynamic names found in the content
    this.prefixes = {}
    this.dynamicNames = {}

    // Debounce syntax checking
    this.syntaxCheckTimeout = null
  }

  /**
   * Initialize the editor with CodeMirror
   */
  initialize() {
    // Create initial editor state
    const startState = EditorState.create({
      doc: this.element.value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        turtle(),
        syntaxErrorHighlighter(),
        nodeHighlighter(),
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            this._onContentChange()
          }
        })
      ]
    })

    // Create editor view and replace the textarea
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
   * Handle content changes in the editor
   */
  _onContentChange() {
    // Update the hidden textarea value for form submission
    this.element.value = this.getValue()

    // Debounce syntax checking to avoid too frequent checks
    clearTimeout(this.syntaxCheckTimeout)
    this.syntaxCheckTimeout = setTimeout(() => {
      this.checkSyntax()
    }, 500)

    // Notify change listeners
    this._notifyChangeListeners()
  }

  /**
   * Notify all registered change listeners with the current content
   */
  _notifyChangeListeners() {
    const content = this.getValue()
    this.changeCallbacks.forEach(callback => callback(content))
  }

  /**
   * Get the current editor content
   * 
   * @returns {string} The editor content
   */
  getValue() {
    return this.view ? this.view.state.doc.toString() : this.element.value
  }

  /**
   * Set the editor content
   * 
   * @param {string} content - The content to set
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

    // Reset prefixes and dynamic names
    this.prefixes = {}
    this.dynamicNames = {}

    // Check syntax for the new content
    this.checkSyntax()
  }

  /**
   * Check syntax of the current content
   */
  checkSyntax() {
    this.changeSyntaxCheckState('working')

    const content = this.getValue()

    // Skip empty content
    if (!content.trim()) {
      this.changeSyntaxCheckState('passed')
      return
    }

    // Parse the content to check syntax
    this.parser.parse(content, {
      onError: (error) => {
        this.changeSyntaxCheckState('failed', error.message)

        // Highlight the error line in the editor
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
        // Extract and store namespaces and names for autocompletion
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

        // Clear error highlighting
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
   * Change the syntax check state and dispatch event
   * 
   * @param {string} newState - The new state
   * @param {string} error - The error message (if any)
   */
  changeSyntaxCheckState(newState, error) {
    if (newState === this.syntaxCheckState) return

    this.syntaxCheckState = newState

    // Dispatch custom event to notify UI
    const event = new CustomEvent('syntax-check-state-change', {
      detail: {
        state: newState,
        error: error
      }
    })

    document.dispatchEvent(event)
  }

  /**
   * Register a callback to be called when content changes
   * 
   * @param {function} callback - The callback function
   */
  onChange(callback) {
    this.changeCallbacks.push(callback)
  }

  /**
   * Remove a previously registered change callback
   * 
   * @param {function} callback - The callback to remove
   */
  offChange(callback) {
    const index = this.changeCallbacks.indexOf(callback)
    if (index !== -1) {
      this.changeCallbacks.splice(index, 1)
    }
  }

  /**
   * Get the prefixes found in the content
   * 
   * @returns {Object} The prefixes
   */
  getPrefixes() {
    return this.prefixes
  }

  /**
   * Get the dynamic names found in the content
   * 
   * @returns {Object} The dynamic names
   */
  getDynamicNames() {
    return this.dynamicNames
  }
}