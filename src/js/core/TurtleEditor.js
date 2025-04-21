/**
 * Turtle RDF Editor component
 * @module core/TurtleEditor
 */

import { EditorState } from '@codemirror/state'
import { EditorView, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { RDFParser } from './Parser.js'
import { URIUtils } from '../utils/URIUtils.js'

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
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            this._onContentChange()
          }
        })
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

    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: content
      }
    })

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

    // Skip if empty
    if (!content.trim()) {
      this.changeSyntaxCheckState('passed')
      return
    }

    // Parse the content
    this.parser.parse(content, {
      onError: (error) => {
        this.changeSyntaxCheckState('failed', error.message)
      },
      onTriple: (triple) => {
        // Add to dynamic names
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
      }
    })
  }

  /**
   * Add a name to dynamic names
   * @private
   * @param {string} namespace - The namespace
   * @param {string} name - The local name
   */
  _addToDynamicNames(namespace, name) {
    if (!namespace || !name) return

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

    console.log(`Highlighting node: ${nodeId}`)

    // Since we don't have full CodeMirror 6 extensions set up,
    // we'll just log the action instead of actual highlighting
  }

  /**
   * Change the syntax check state
   * @param {string} newState - The new state ('pending', 'working', 'passed', 'failed', 'off')
   * @param {string} [error] - Error message, if any
   */
  changeSyntaxCheckState(newState, error) {
    if (newState === this.syntaxCheckState) return

    this.syntaxCheckState = newState

    // Notify state change
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
   * @param {Function} callback - The callback function to call on change
   */
  onChange(callback) {
    this.changeCallbacks.push(callback)
  }

  /**
   * Remove a change listener
   * @param {Function} callback - The callback function to remove
   */
  offChange(callback) {
    const index = this.changeCallbacks.indexOf(callback)
    if (index !== -1) {
      this.changeCallbacks.splice(index, 1)
    }
  }

  /**
   * Get the prefixes used in the document
   * @returns {Object} - The prefixes
   */
  getPrefixes() {
    return this.prefixes
  }

  /**
   * Get the dynamic names used in the document
   * @returns {Object} - The dynamic names
   */
  getDynamicNames() {
    return this.dynamicNames
  }
}