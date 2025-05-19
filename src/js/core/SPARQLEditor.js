import { sparqlTheme } from './SPARQLTheme.js'
import { EditorState } from '@codemirror/state'
import { EditorView, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { sparql } from './SPARQLMode.js'

/**
 * Editor component for SPARQL syntax with syntax highlighting
 */
export class SPARQLEditor {
  /**
   * Creates a new SPARQLEditor
   * @param {HTMLElement} textareaElement - The textarea element to replace
   * @param {Object} logger - Logger service
   */
  constructor(textareaElement, logger) {
    this.element = textareaElement
    this.logger = logger
    this.view = null
    this.changeCallbacks = []
  }

  /**
   * Initialize the editor with CodeMirror
   */
  initialize() {
    // Create the editor with theme and language support
    const startState = EditorState.create({
      doc: this.element.value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        sparql(),
        sparqlTheme,  // Apply the theme as an extension
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            this._onContentChange()
          }
        })
      ]
    })

    this.view = new EditorView({
      state: startState,
      parent: this.element.parentNode
    })

    // Hide the original textarea
    this.element.style.display = 'none'
  }

  /**
   * Register a callback for content changes
   * @param {Function} callback - Callback function
   */
  onContentChange(callback) {
    this.changeCallbacks.push(callback)
  }

  /**
   * Internal handler for content changes
   */
  _onContentChange() {
    const content = this.view.state.doc.toString()
    this.changeCallbacks.forEach(cb => cb(content))
  }

  /**
   * Set the editor content
   * @param {string} content - SPARQL code
   */
  setValue(content) {
    this.view.dispatch({
      changes: { from: 0, to: this.view.state.doc.length, insert: content }
    })
  }

  /**
   * Get the current editor content
   * @returns {string} - SPARQL code
   */
  getValue() {
    return this.view.state.doc.toString()
  }
}
