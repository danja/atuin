/**
 * Turtle RDF Editor component
 * @module core/TurtleEditor
 */

import { EditorState } from '@codemirror/state'
import { EditorView, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { RDFParser } from './Parser.js'
import { URIUtils } from '../utils/URIUtils.js'
import { StreamLanguage } from '@codemirror/language'
// Import the new mode definition
import { turtleMode } from './turtle-cm6-mode.js'

/**
 * Manages the Turtle editor component
 */
export class TurtleEditor {
  /**
   * Create a new TurtleEditor
   * @param {HTMLTextAreaElement} textareaElement - The textarea element to replace
   * @param {Object} logger - Logger service
   */
  constructor(textareaElement, logger) {
    this.element = textareaElement
    this.logger = logger
    this.view = null

    this.parser = new RDFParser(logger)
    this.changeCallbacks = []
    this.syntaxCheckState = 'pending'

    // Custom editor state for prefixes
    this.prefixes = {}
    this.dynamicNames = {}

    // Syntax check debounce
    this.syntaxCheckTimeout = null
  }

  /**
   * Initialize the editor
   */
  initialize() {
    // Create a simple editor state
    const startState = EditorState.create({
      doc: this.element.value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        // Use StreamLanguage.define with the imported mode object
        StreamLanguage.define(turtleMode), // <-- Use the adapted Turtle mode
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            this._onContentChange()
          }
        })
        // Potentially add more extensions like basicSetup, history, etc. if needed
      ]
    })

    // Create editor view
    this.view = new EditorView({
      state: startState,
      parent: this.element.parentNode
    })

    // Hide original textarea
    this.element.style.display = 'none'

    // Check syntax for initial content
    this._onContentChange()

    this.logger.debug('Editor initialized')
  }

  /**
   * Handle content changes
   * @private
   */
  _onContentChange() {
    // Update the original textarea value
    this.element.value = this.getValue()

    // Debounce syntax checking
    clearTimeout(this.syntaxCheckTimeout)
    this.syntaxCheckTimeout = setTimeout(() => {
      this.checkSyntax()
    }, 500)

    // Notify subscribers
    this._notifyChangeListeners()
  }

  /**
   * Notify change listeners
   * @private
   */
  _notifyChangeListeners() {
    const content = this.getValue()
    this.changeCallbacks.forEach(callback => callback(content))
  }

  /**
   * Get the current editor content
   * @returns {string} - The editor content
   */
  getValue() {
    return this.view ? this.view.state.doc.toString() : this.element.value
  }

  /**
   * Set the editor content
   * @param {string} content - The content to set
   */
  setValue(content) {
    if (!this.view) {
      this.element.value = content
      return
    }

    // Check if view is already destroyed (can happen during teardown)
    if (!this.view.dispatch) {
      console.warn("Attempted to set value on a destroyed editor view.")
      this.element.value = content // Fallback
      return
    }

    try {
      this.view.dispatch({
        changes: {
          from: 0,
          to: this.view.state.doc.length,
          insert: content
        }
      })
    } catch (e) {
      console.error("Error dispatching editor update:", e)
      // Fallback if dispatch fails for some reason
      this.element.value = content
      // Potentially try to re-initialize or handle the error state
    }

    // Reset state
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

    // Reset dynamic names before parsing
    this.dynamicNames = {}

    // Skip if empty
    if (!content.trim()) {
      this.changeSyntaxCheckState('passed')
      this.prefixes = {} // Clear prefixes if content is empty
      return
    }

    // Parse the content
    this.parser.parse(content, {
      onError: (error) => {
        this.changeSyntaxCheckState('failed', error.message)
      },
      onTriple: (triple) => {
        // Add to dynamic names
        if (triple.subject.termType === 'NamedNode' || triple.subject.termType === 'BlankNode') {
          const subjects = URIUtils.splitNamespace(triple.subject.value, triple.subject.termType === 'BlankNode')
          this._addToDynamicNames(subjects.namespace, subjects.name)
        }
        if (triple.predicate.termType === 'NamedNode') {
          const predicates = URIUtils.splitNamespace(triple.predicate.value)
          this._addToDynamicNames(predicates.namespace, predicates.name)
        }
        if (triple.object.termType === 'NamedNode' || triple.object.termType === 'BlankNode') {
          const objects = URIUtils.splitNamespace(triple.object.value, triple.object.termType === 'BlankNode')
          this._addToDynamicNames(objects.namespace, objects.name)
        } else if (triple.object.termType === 'Literal' && triple.object.datatype?.termType === 'NamedNode') {
          // Add datatype URIs to dynamic names as well
          const datatypes = URIUtils.splitNamespace(triple.object.datatype.value)
          this._addToDynamicNames(datatypes.namespace, datatypes.name)
        }
      },
      onComplete: (prefixes) => {
        this.prefixes = prefixes || {}
        this.changeSyntaxCheckState('passed')
      },
      onPrefix: (prefix, iri) => {
        // Also add prefixes themselves to dynamic names for potential highlighting/linking
        this._addToDynamicNames('prefix', prefix) // Use a pseudo-namespace 'prefix'
        const iriParts = URIUtils.splitNamespace(iri.value)
        this._addToDynamicNames(iriParts.namespace, iriParts.name)
      }
    })
  }

  /**
   * Add a name to dynamic names
   * @private
   * @param {string} namespace - The namespace or pseudo-namespace (like 'prefix', '_:')
   * @param {string} name - The local name
   */
  _addToDynamicNames(namespace, name) {
    // Ensure namespace/name are valid strings before adding
    if (typeof namespace !== 'string' || typeof name !== 'string' || !name) return

    // Normalize blank node namespace
    if (namespace === '_:') {
      namespace = '_:' // Consistent blank node pseudo-namespace
    }

    this.dynamicNames[namespace] = this.dynamicNames[namespace] || {}
    this.dynamicNames[namespace][name] = true
  }

  /**
   * Highlight nodes in the editor
   * @param {string} nodeId - The node ID to highlight
   */
  highlightNode(nodeId) {
    // Simplified highlighting without using state effects
    if (!nodeId || !this.view) return

    this.logger.debug(`Highlighting node (placeholder): ${nodeId}`)

    // Since we don't have full CodeMirror 6 extensions set up for highlighting,
    // we'll just log the action. Implementing actual highlighting would require
    // creating decorations and managing them through state fields/effects,
    // which is more involved.
  }

  /**
   * Change the syntax check state and notify listeners
   * @private
   * @param {'pending' | 'working' | 'passed' | 'failed'} state - The new state
   * @param {string} [message] - Optional error message
   */
  changeSyntaxCheckState(state, message = '') {
    if (this.syntaxCheckState !== state) {
      this.syntaxCheckState = state
      this.logger.debug(`Syntax check state: ${state}${message ? ` (${message})` : ''}`)

      // Dispatch a custom event or call a method to update UI (e.g., status indicator)
      // Example:
      const event = new CustomEvent('syntax-check-change', {
        detail: { state, message }
      })
      this.view?.dom.dispatchEvent(event) // Dispatch from the editor's DOM element
    }
  }

  /**
   * Register a callback for content changes
   * @param {Function} callback - The callback function
   */
  onChange(callback) {
    if (typeof callback === 'function') {
      this.changeCallbacks.push(callback)
    }
  }

  /**
   * Destroy the editor instance
   */
  destroy() {
    if (this.view) {
      this.view.destroy()
      this.view = null
      this.logger.debug('Editor destroyed')
    }
    // Make original textarea visible again if needed
    // this.element.style.display = ''; // Uncomment if needed
    this.changeCallbacks = [] // Clear listeners
    clearTimeout(this.syntaxCheckTimeout) // Clear any pending check
  }
}
