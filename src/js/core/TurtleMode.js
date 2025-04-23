import { StreamLanguage } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

export const turtleMode = StreamLanguage.define({
  name: 'turtle',

  tokenTable: {
    prefix: t.keyword,
    base: t.keyword,
    prefixName: t.definition,
    prefixDeclaration: t.special(t.variableName),
    iri: t.special(t.string), // Changed to special string to give it the orange color
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
    namespacePrefix: t.moduleKeyword,
    localName: t.variableName,
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

    if (stream.peek() === '#') {
      stream.skipToEnd()
      return 'comment'
    }


    if (stream.sol()) {
      if (state.lookingFor === 'object' && state.predicate !== null) {

      } else {
        state.lookingFor = 'subject'
      }
    }


    if (stream.eatSpace()) return null


    if (stream.match('@prefix', true, true)) {
      state.inPrefix = true
      state.prefixStart = true
      return 'prefix'
    }


    if (stream.match('@base', true, true)) {
      state.inBase = true
      return 'base'
    }


    if (state.inPrefix && state.prefixStart) {
      if (stream.match(/[a-zA-Z0-9_-]+:/, true) || stream.match(/:/, true)) {
        state.prefixStart = false
        return 'prefixDeclaration'
      }
    }


    if (stream.match(/a\b/, true)) {
      if (state.lookingFor === 'predicate') {
        state.predicate = true
        state.lookingFor = 'object'
      }
      return 'a'
    }


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


    if (stream.peek() === '"' || stream.peek() === "'") {
      state.stringDelimiter = stream.peek()
      state.inString = true
      stream.next()


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


    if (stream.match(/[a-zA-Z0-9_-]+:/, false)) {

      const prefix = stream.string.slice(stream.pos).match(/^[a-zA-Z0-9_-]+:/)[0]


      stream.match(/[a-zA-Z0-9_-]+:/, true)


      if (state.lookingFor === 'predicate') {
        state.predicate = true
        state.lookingFor = 'object'
        return 'namespacePrefix'
      }


      return 'namespacePrefix'
    }


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


    if (stream.peek() === '.') {
      stream.next()
      state.subject = null
      state.predicate = null
      state.object = null
      state.lookingFor = 'subject'
      return 'dot'
    }


    if (stream.peek() === ';') {
      stream.next()
      state.predicate = null
      state.object = null
      state.lookingFor = 'predicate'
      return 'semicolon'
    }


    if (stream.peek() === ',') {
      stream.next()
      state.object = null
      state.lookingFor = 'object'
      return 'comma'
    }


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


    if (stream.match(/[+-]?[0-9]+(\.[0-9]*)?([eE][+-]?[0-9]+)?/, true)) {
      if (state.lookingFor === 'object') {
        state.object = true
        state.lookingFor = 'predicate'
      }
      return 'number'
    }


    if (stream.match(/true|false/, true)) {
      if (state.lookingFor === 'object') {
        state.object = true
        state.lookingFor = 'predicate'
      }
      return 'boolean'
    }


    if (stream.match(/[\[\]\(\)]/, true)) {
      return 'bracket'
    }


    stream.next()
    return 'error'
  }
})

export function turtle() {
  return turtleMode
}