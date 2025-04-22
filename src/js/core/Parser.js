import ParserN3 from '@rdfjs/parser-n3'
import rdf from 'rdf-ext'
import namespace from '@rdfjs/namespace'
import { Readable } from 'readable-stream'
import { stringToStream } from '../utils/StreamUtils.js'

/**
 * RDF Parser class that handles parsing Turtle/N3 content using RDFJS compatible interfaces
 */
export class RDFParser {
  /**
   * Creates a new RDF Parser instance
   * 
   * @param {Object} logger - Logger service for recording errors and debug information
   */
  constructor(logger) {
    this.logger = logger
    this.parser = new ParserN3({ factory: rdf })
  }

  /**
   * Parse RDF content with callbacks for various events
   * 
   * @param {string} content - The RDF content to parse (Turtle/N3 format)
   * @param {Object} handlers - Callback handlers for different events
   * @param {Function} [handlers.onError] - Called when an error occurs
   * @param {Function} [handlers.onTriple] - Called for each triple
   * @param {Function} [handlers.onComplete] - Called when parsing is complete
   */
  parse(content, handlers = {}) {
    try {
      // Create a readable stream from the content using our StreamUtils
      const textStream = stringToStream(content)
      const quadStream = this.parser.import(textStream)
      const triples = []
      let prefixes = {}

      // Process the quad stream
      quadStream.on('data', (quad) => {
        if (handlers.onTriple) {
          handlers.onTriple(quad)
        }
        triples.push(quad)
      })

      quadStream.on('prefix', (prefix, namespace) => {
        prefixes[prefix] = namespace
      })

      quadStream.on('error', (error) => {
        if (handlers.onError) {
          handlers.onError(this._formatError(error))
        }
      })

      quadStream.on('end', () => {
        // Extract prefixes from the parser and create a store
        try {
          const store = rdf.dataset(triples)

          if (handlers.onComplete) {
            handlers.onComplete(prefixes, store)
          }
        } catch (error) {
          if (handlers.onError) {
            handlers.onError(this._formatError(error))
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
   * Format error object to include line and column information
   * 
   * @private
   * @param {Error} error - The error object
   * @returns {Object} Formatted error with message, line, and column
   */
  _formatError(error) {
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
   * Parse triples from content and return a promise
   * 
   * @param {string} content - The RDF content to parse
   * @returns {Promise<Object>} A promise that resolves to an object containing triples and prefixes
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
   * Check if the content is valid RDF
   * 
   * @param {string} content - The RDF content to validate
   * @returns {Promise<boolean>} A promise that resolves to true if valid, false otherwise
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