/**
 * RDF Parser for Turtle documents
 * @module core/Parser
 */

import * as N3 from 'n3'

/**
 * Handles parsing of RDF Turtle syntax
 */
export class RDFParser {
  /**
   * Create a new RDFParser
   * @param {Object} logger - Logger service
   */
  constructor(logger) {
    this.logger = logger
  }

  /**
   * Parse Turtle content
   * @param {string} content - The content to parse
   * @param {Object} handlers - Callback handlers
   * @param {Function} handlers.onError - Called on parsing error
   * @param {Function} handlers.onTriple - Called for each triple
   * @param {Function} handlers.onComplete - Called when parsing completes
   */
  parse(content, handlers = {}) {
    const parser = new N3.Parser()
    const store = new N3.Store()

    try {
      parser.parse(content, (error, triple, prefixes) => {
        if (error) {
          if (handlers.onError) {
            handlers.onError(this._formatError(error))
          }
          return
        }

        if (triple) {
          if (handlers.onTriple) {
            handlers.onTriple(triple)
          }

          store.addQuad(triple)
        } else {
          // End of document
          if (handlers.onComplete) {
            handlers.onComplete(prefixes, store)
          }
        }
      })
    } catch (error) {
      if (handlers.onError) {
        handlers.onError(this._formatError(error))
      }
    }
  }

  /**
   * Format an error for display
   * @private
   * @param {Error} error - The error to format
   * @returns {Object} - Formatted error
   */
  _formatError(error) {
    // Extract line number from error message
    let line = 1
    let column = 0

    const lineMatch = error.message.match(/line (\d+)/i)
    if (lineMatch) {
      line = parseInt(lineMatch[1], 10)
    }

    const columnMatch = error.message.match(/column (\d+)/i)
    if (columnMatch) {
      column = parseInt(columnMatch[1], 10)
    }

    return {
      message: error.message,
      line,
      column
    }
  }

  /**
   * Parse Turtle content and return all triples
   * @param {string} content - The content to parse
   * @returns {Promise<Object>} - Object with triples and prefixes
   */
  parseTriples(content) {
    return new Promise((resolve, reject) => {
      const triples = []
      let prefixes = {}

      this.parse(content, {
        onError: (error) => {
          reject(error)
        },
        onTriple: (triple) => {
          triples.push(triple)
        },
        onComplete: (p, store) => {
          prefixes = p || {}
          resolve({ triples, prefixes })
        }
      })
    })
  }

  /**
   * Check if content is valid Turtle
   * @param {string} content - The content to check
   * @returns {Promise<boolean>} - True if valid
   */
  async isValid(content) {
    try {
      await this.parseTriples(content)
      return true
    } catch (error) {
      return false
    }
  }
}