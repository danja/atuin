import { StreamLanguage } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

export const turtleMode = StreamLanguage.define({
  name: 'turtle',

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
    error: t.invalid,
    namespacePrefix: t.moduleKeyword, // Token for namespace prefixes like 'ex:'
    localName: t.variableName, // Token for local names (the part after colon)
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

  token: function (stream, state) {
    // Handle comments
    if (stream.peek() === '#') {
      stream.skipToEnd()
      return 'comment'
    }

    // Handle line start
    if (stream.sol()) {
      if (state.lookingFor === 'object' && state.predicate !== null) {
        // Continue with the current predicate-object pattern
      } else {
        state.lookingFor = 'subject'
      }
    }

    // Skip whitespace
    if (stream.eatSpace()) return null

    // Handle @prefix directive
    if (stream.match('@prefix', true, true)) {
      state.inPrefix = true
      state.prefixStart = true
      return 'prefix'
    }

    // Handle @base directive
    if (stream.match('@base', true, true)) {
      state.inBase = true
      return 'base'
    }

    // Handle prefix declaration
    if (state.inPrefix && state.prefixStart) {
      if (stream.match(/[a-zA-Z0-9_-]+:/, true) || stream.match(/:/, true)) {
        state.prefixStart = false
        return 'prefixName'
      }
    }

    // Handle 'a' as predicate (rdf:type shorthand)
    if (stream.match(/a\b/, true)) {
      if (state.lookingFor === 'predicate') {
        state.predicate = true
        state.lookingFor = 'object'
      }
      return 'a'
    }

    // Handle IRI with angle brackets
    if (stream.peek() === '<') {
      state.inIri = true
      stream.next()

      const line = stream.string.slice(stream.pos)
      const closeIriPos = line.indexOf('>')

      if (closeIriPos !== -1) {
        stream.pos += closeIriPos
        stream.next()
        state.inIri = false

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

      // Process string content
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

      // Handle language tag
      if (!state.inString && stream.peek() === '@') {
        stream.next()
        stream.eatWhile(/[a-zA-Z0-9-]/)
        return 'lang'
      }

      // Handle datatype
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

    // Handle prefixed names (ex:something) - THE KEY PART FOR PREFIX HIGHLIGHTING
    if (stream.match(/[a-zA-Z0-9_-]+:/, false)) {
      // Look ahead for the prefix without consuming
      const prefix = stream.string.slice(stream.pos).match(/^[a-zA-Z0-9_-]+:/)[0]

      // Consume just the prefix part
      stream.match(/[a-zA-Z0-9_-]+:/, true)

      // Update state based on what we're looking for
      if (state.lookingFor === 'predicate') {
        state.predicate = true
        state.lookingFor = 'object'
        return 'namespacePrefix' // Return immediately for the prefix
      }

      // For subjects and objects, we still return the prefix token
      return 'namespacePrefix'
    }

    // Handle the local name part after a prefix has been consumed
    if (stream.match(/[a-zA-Z0-9_\-.%]+/, true)) {
      if (state.lookingFor === 'subject') {
        state.subject = true
        state.lookingFor = 'predicate'
      } else if (state.lookingFor === 'object') {
        state.object = true
        state.lookingFor = 'predicate'
      }

      return 'localName'
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

    // Handle semicolon (same subject, new predicate)
    if (stream.peek() === ';') {
      stream.next()
      state.predicate = null
      state.object = null
      state.lookingFor = 'predicate'
      return 'semicolon'
    }

    // Handle comma (same subject and predicate, new object)
    if (stream.peek() === ',') {
      stream.next()
      state.object = null
      state.lookingFor = 'object'
      return 'comma'
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

    // Handle brackets
    if (stream.match(/[\[\]\(\)]/, true)) {
      return 'bracket'
    }

    // Handle unknown tokens
    stream.next()
    return 'error'
  }
})

export function turtle() {
  return turtleMode
}