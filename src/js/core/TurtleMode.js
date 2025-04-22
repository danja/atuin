import { StreamLanguage } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

/**
 * CodeMirror language mode for Turtle RDF syntax
 */
export const turtleMode = StreamLanguage.define({
  name: 'turtle',

  // Mapping token types to highlight tags
  tokenTable: {
    prefix: t.definitionKeyword,
    base: t.definitionKeyword,
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

  // Initialize state for token stream
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

  // Process token stream
  token: function (stream, state) {
    // Handle comments
    if (state.inComment || stream.peek() === '#') {
      stream.skipToEnd()
      state.inComment = false
      return 'comment'
    }

    // Handle start of line
    if (stream.sol()) {
      if (state.lookingFor === 'object' && state.predicate !== null) {
        // Continuing a triple from the previous line
      } else {
        state.lookingFor = 'subject'
      }
    }

    // Skip whitespace
    if (stream.eatSpace()) return null

    // Handle prefix and base directives
    if (stream.match('@prefix', true, true)) {
      state.inPrefix = true
      state.prefixStart = true
      return 'prefix'
    }

    if (stream.match('@base', true, true)) {
      state.inBase = true
      return 'base'
    }

    // Handle prefix name with colon
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

      // Try to find the closing angle bracket
      const line = stream.string.slice(stream.pos)
      const closeIriPos = line.indexOf('>')

      if (closeIriPos !== -1) {
        stream.pos += closeIriPos
        stream.next()
        state.inIri = false

        // Determine the role of this IRI in the current context
        if (state.inPrefix || state.inBase) {
          state.inPrefix = false
          state.inBase = false
        } else if (state.lookingFor === 'subject') {
          state.subject = true
          state.lookingFor = 'predicate'
        } else if (state.lookingFor === 'predicate') {
          state.predicate = true
          state.lookingFor = 'object'
          return 'predicate' // Return predicate-specific styling
        } else if (state.lookingFor === 'object') {
          state.object = true
          state.lookingFor = 'predicate'
        }

        return 'iri'
      } else {
        // If no closing bracket is found, consume to end of line
        stream.skipToEnd()
        return 'iri'
      }
    }

    // Handle string literals
    if (stream.peek() === '"' || stream.peek() === "'") {
      state.stringDelimiter = stream.peek()
      state.inString = true
      stream.next()

      // Check for triple quotes (""")
      if (state.stringDelimiter === '"' &&
        stream.peek() === '"' &&
        stream.string.charAt(stream.pos + 1) === '"') {
        stream.next()
        stream.next()
        state.stringDelimiter = '"""'
      }

      // Check for triple quotes (''')
      if (state.stringDelimiter === "'" &&
        stream.peek() === "'" &&
        stream.string.charAt(stream.pos + 1) === "'") {
        stream.next()
        stream.next()
        state.stringDelimiter = "'''"
      }

      // Process the string content
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

        // Check for closing quotes
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

    // Handle the 'a' shorthand for rdf:type
    if (stream.match(/a\b/, true)) {
      if (state.lookingFor === 'predicate') {
        state.predicate = true
        state.lookingFor = 'object'
      }
      return 'a'
    }

    // Handle end of statement
    if (stream.peek() === '.') {
      stream.next()
      state.subject = null
      state.predicate = null
      state.object = null
      state.lookingFor = 'subject'
      return 'dot'
    }

    // Handle predicates continuation
    if (stream.peek() === ';') {
      stream.next()
      state.predicate = null
      state.object = null
      state.lookingFor = 'predicate'
      return 'semicolon'
    }

    // Handle objects continuation
    if (stream.peek() === ',') {
      stream.next()
      state.object = null
      state.lookingFor = 'object'
      return 'comma'
    }

    // Handle prefixed names (e.g., foaf:name)
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

    // Handle numbers
    if (stream.match(/[+-]?[0-9]+(\.[0-9]*)?([eE][+-]?[0-9]+)?/, true)) {
      if (state.lookingFor === 'object') {
        state.object = true
        state.lookingFor = 'predicate'
      }
      return 'number'
    }

    // Handle booleans
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

    // If none of the above matched, treat as error
    stream.next()
    return 'error'
  }
})

/**
 * Creates a Turtle language mode for CodeMirror
 * @returns {Extension} CodeMirror language extension
 */
export function turtle() {
  return turtleMode
}