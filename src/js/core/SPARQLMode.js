import { StreamLanguage } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

export const sparqlMode = StreamLanguage.define({
  name: 'sparql',
  
  tokenTable: {
    keyword: t.keyword,
    variableName: t.variableName,
    string: t.string,
    comment: t.comment,
    atom: t.atom,
    bracket: t.bracket,
    number: t.number,
    bool: t.bool,
    uri: t.special(t.string),
    predicate: t.propertyName,
    datatype: t.labelName,
    lang: t.meta,
    operator: t.operator
  },
  
  startState() { 
    return {
      inString: false,
      stringType: null
    }; 
  },
  
  token(stream, state) {
    // Comments
    if (stream.match(/^#.*/)) {
      stream.skipToEnd()
      return 'comment'
    }
    
    // Keywords (case insensitive)
    if (stream.match(/^(PREFIX|BASE|SELECT|WHERE|ASK|CONSTRUCT|DESCRIBE|FROM|NAMED|FILTER|OPTIONAL|UNION|GRAPH|SERVICE|MINUS|BIND|VALUES|GROUP|BY|HAVING|ORDER|ASC|DESC|LIMIT|OFFSET)\b/i)) {
      return 'keyword'
    }
    
    // Variables
    if (stream.match(/^[\?\$][\w\d_]*/)) {
      return 'variableName'
    }
    
    // URIs
    if (stream.match(/^<[^>]*>/)) {
      return 'uri'
    }
    
    // String literals with language tags or datatypes
    if (stream.match(/^\"([^\"\\]|\\.)*\"(@[a-zA-Z\-]+)?(\^\^[^\s]+)?/)) {
      return 'string'
    }
    
    // The 'a' keyword (shorthand for rdf:type)
    if (stream.match(/^(a)\b/)) {
      return 'atom'
    }
    
    // Brackets and punctuation
    if (stream.match(/^[\{\}\(\)\[\]]/)) {
      return 'bracket'
    }
    
    // Operators and separators
    if (stream.match(/^[;,\.]/)) {
      return 'operator'
    }
    
    // Numbers
    if (stream.match(/^[+-]?\d+(\.\d+)?([eE][+-]?\d+)?/)) {
      return 'number'
    }
    
    // Boolean literals
    if (stream.match(/^(true|false)\b/i)) {
      return 'bool'
    }
    
    // Prefixed names
    if (stream.match(/^[a-zA-Z][a-zA-Z0-9_-]*:[a-zA-Z0-9_-]+/)) {
      return 'predicate'
    }
    
    // Skip whitespace
    if (stream.eatSpace()) return null
    
    // Move forward if nothing matches
    stream.next()
    return null
  }
})

export function sparql() {
  return sparqlMode
}

