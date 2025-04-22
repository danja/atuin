import { StreamLanguage } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

/**
 * Custom CodeMirror mode for Turtle RDF syntax
 */
export const turtleMode = StreamLanguage.define({
  name: 'turtle',

  // Token tables map token types to highlight tags
  tokenTable: {
    prefix: t.keyword,
    base: t.keyword,
    prefixName: t.definition,
    iri: t.string,
    a: t.atom,
    semicolon: t.operator,
    dot: t.operator,
    comma: t.operator,
    type: t.typeName,
    literal: t.string,
    comment: t.comment,
    bracket: t.bracket,
    number: t.number,
    boolean: t.bool,
    predicate: t.propertyName,
    datatype: t.labelName,
    lang: t.meta,
    error: t.invalid
  },

  startState: function () {
    return {
      inPrefix: false,
      inBase: false,
      inIri: false,
      inString: false,
      inComment: false,
      inEscapeSequence: false,
      stringDelimiter: null,
      prefixStart: false,
      triplePartCnt: 0,
      subject: null,
      predicate: null,
      object: null,
      lookingFor: 'subject'
    }
  },

  // The token function analyzes each character and assigns token types
  token: function (stream, state) {
    // Handle comments
    if (stream.peek() === '#') {
      stream.skipToEnd()
      return 'comment'
    }

    // Reset state at the beginning of a line
    if (stream.sol()) {
      if (state.lookingFor === 'object' && state.predicate !== null) {
        // We're in the middle of a statement
      } else {
        state.lookingFor = 'subject'
      }
    }

    // Skip whitespace
    if (stream.eatSpace()) return null

    // Handle prefix declaration
    if (stream.match('@prefix', true, true)) {
      state.inPrefix = true
      state.prefixStart = true
      return 'prefix'
    }

    if (stream.match('@base', true, true)) {
      state.inBase = true
      return 'base'
    }

    // Handle prefix name in prefix declaration
    if (state.inPrefix && state.prefixStart) {
      if (stream.match(/[a-zA-Z0-9_-]+:/, true) || stream.match(/:/, true)) {
        state.prefixStart = false
        return 'prefixName'
      }
    }

    // Handle IRIs
    if (stream.peek() === '<') {
      state.inIri = true
      stream.next()

      // Look ahead for the closing bracket
      const line = stream.string.slice(stream.pos)
      const closeIriPos = line.indexOf('>')

      if (closeIriPos !== -1) {
        stream.pos += closeIriPos
        stream.next()
        state.inIri = false

        // Determine what kind of IRI this is based on context
        if (state.inPrefix || state.inBase) {
          state.inPrefix = false
          state.inBase = false
        } else if (state.lookingFor === 'subject') {
          state.subject = true
          state.lookingFor = 'predicate'
        } else if (state.lookingFor === 'predicate') {
          state.predicate = true
          state.lookingFor = 'object'
          return 'predicate'
        } else if (state.lookingFor === 'object') {
          state.object = true
          state.lookingFor = 'predicate'
        }

        return 'iri'
      } else {
        // Unclosed IRI - consume the rest of the line
        stream.skipToEnd()
        return 'iri'
      }
    }

    // Handle string literals
    if (stream.peek() === '"' || stream.peek() === "'") {
      state.stringDelimiter = stream.peek()
      state.inString = true
      stream.next()

      // Check for triple quotes
      if (state.stringDelimiter === '"' &&
        stream.peek() === '"' &&
        stream.string.charAt(stream.pos + 1) === '"') {
        stream.next()
        stream.next()
        state.stringDelimiter = '"""'
      }

      if (state.stringDelimiter === "'" &&
        stream.peek() === "'" &&
        stream.string.charAt(stream.pos + 1) === "'") {
        stream.next()
        stream.next()
        state.stringDelimiter = "'''"
      }

      // Find the end of the string
      while (!stream.eol()) {
        if (state.inEscapeSequence) {
          stream.next()
          state.inEscapeSequence = false
          continue
        }

        if (stream.peek() === '\\') {
          state.inEscapeSequence = true
          stream.next()
          continue
        }

        // Check for end of string based on delimiter type
        if (state.stringDelimiter === '"""') {
          if (stream.peek() === '"' &&
            stream.string.charAt(stream.pos + 1) === '"' &&
            stream.string.charAt(stream.pos + 2) === '"') {
            stream.next()
            stream.next()
            stream.next()
            state.inString = false
            state.stringDelimiter = null
            break
          }
        } else if (state.stringDelimiter === "'''") {
          if (stream.peek() === "'" &&
            stream.string.charAt(stream.pos + 1) === "'" &&
            stream.string.charAt(stream.pos + 2) === "'") {
            stream.next()
            stream.next()
            stream.next()
            state.inString = false
            state.stringDelimiter = null
            break
          }
        } else if (stream.peek() === state.stringDelimiter) {
          stream.next()
          state.inString = false
          state.stringDelimiter = null
          break
        }

        stream.next()
      }

      // Check for language tag or datatype after string
      if (!state.inString && stream.peek() === '@') {
        stream.next()
        stream.eatWhile(/[a-zA-Z0-9-]/)
        return 'lang'
      }

      if (!state.inString && stream.peek() === '^' && stream.string.charAt(stream.pos + 1) === '^') {
        stream.next()
        stream.next()
        return 'datatype'
      }

      if (state.lookingFor === 'object') {
        state.object = true
        state.lookingFor = 'predicate'
      }

      return 'literal'
    }

    // Handle 'a' as a shortcut for rdf:type
    if (stream.match(/a\b/, true)) {
      if (state.lookingFor === 'predicate') {
        state.predicate = true
        state.lookingFor = 'object'
      }
      return 'a'
    }

    // Handle statement termination
    if (stream.peek() === '.') {
      stream.next()
      state.subject = null
      state.predicate = null
      state.object = null
      state.lookingFor = 'subject'
      return 'dot'
    }

    // Handle predicate list
    if (stream.peek() === ';') {
      stream.next()
      state.predicate = null
      state.object = null
      state.lookingFor = 'predicate'
      return 'semicolon'
    }

    // Handle object list
    if (stream.peek() === ',') {
      stream.next()
      state.object = null
      state.lookingFor = 'object'
      return 'comma'
    }

    // Handle prefixed names
    if (stream.match(/[a-zA-Z0-9_-]+:[a-zA-Z0-9_\-.%]+/, true)) {
      if (state.lookingFor === 'subject') {
        state.subject = true
        state.lookingFor = 'predicate'
      } else if (state.lookingFor === 'predicate') {
        state.predicate = true
        state.lookingFor = 'object'
        return 'predicate'
      } else if (state.lookingFor === 'object') {
        state.object = true
        state.lookingFor = 'predicate'
      }

      return 'type'
    }

    // Handle numeric literals
    if (stream.match(/[+-]?[0-9]+(\.[0-9]*)?([eE][+-]?[0-9]+)?/, true)) {
      if (state.lookingFor === 'object') {
        state.object = true
        state.lookingFor = 'predicate'
      }
      return 'number'
    }

    // Handle boolean literals
    if (stream.match(/true|false/, true)) {
      if (state.lookingFor === 'object') {
        state.object = true
        state.lookingFor = 'predicate'
      }
      return 'boolean'
    }

    // Handle blank nodes
    if (stream.match(/_:[a-zA-Z0-9_-]+/, true)) {
      if (state.lookingFor === 'subject') {
        state.subject = true
        state.lookingFor = 'predicate'
      } else if (state.lookingFor === 'object') {
        state.object = true
        state.lookingFor = 'predicate'
      }
      return 'type'
    }

    // Handle brackets for collections and blank node lists
    if (stream.match(/[\[\]\(\)]/, true)) {
      return 'bracket'
    }

    // Error case
    stream.next()
    return 'error'
  }
})

/**
 * Returns the language extension for Turtle syntax highlighting
 * @returns {StreamLanguage} CodeMirror language extension
 */
export function turtle() {
  return turtleMode
}