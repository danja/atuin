import { StreamLanguage } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

export const sparqlMode = StreamLanguage.define({
  name: 'sparql',
  startState() { return {}; },
  token(stream, state) {
    if (stream.match(/^#.*/)) {
      stream.skipToEnd()
      return 'comment'
    }
    if (stream.match(/^(PREFIX|BASE|SELECT|WHERE|ASK|CONSTRUCT|DESCRIBE|FROM|NAMED|FILTER|OPTIONAL|UNION|GRAPH|SERVICE|MINUS|BIND|VALUES|GROUP|BY|HAVING|ORDER|ASC|DESC|LIMIT|OFFSET)\b/i)) {
      return 'keyword'
    }
    if (stream.match(/^[\?\$][\w\d_]*/)) {
      return 'variableName'
    }
    if (stream.match(/^<[^>]*>/)) {
      return 'string'
    }
    if (stream.match(/^\"([^\"\\]|\\.)*\"(@[a-zA-Z\-]+)?(\^\^[^\s]+)?/)) {
      return 'string'
    }
    if (stream.match(/^(a)\b/)) {
      return 'atom'
    }
    if (stream.match(/^[\{\}\(\)\[\];,\.]/)) {
      return 'bracket'
    }
    if (stream.match(/^\d+(\.\d+)?/)) {
      return 'number'
    }
    if (stream.match(/^(true|false)\b/)) {
      return 'bool'
    }
    // Skip whitespace
    if (stream.eatSpace()) return null
    // Move forward if nothing matches
    stream.next()
    return null
  }
})
