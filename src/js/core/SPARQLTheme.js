import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

const sparqlHighlightStyle = HighlightStyle.define([
  // Keywords
  { tag: t.keyword, color: '#7e57c2', fontWeight: 'bold' },
  
  // Variables
  { tag: t.variableName, color: '#039be5' },
  
  // Strings and URIs
  { tag: t.string, color: '#d81b60' },
  { tag: t.special(t.string), color: '#FFA500', fontWeight: 'bold' }, // URIs
  
  // Comments
  { tag: t.comment, color: '#546e7a', fontStyle: 'italic' },
  
  // Numbers
  { tag: t.number, color: '#00796b' },
  
  // Booleans
  { tag: t.bool, color: '#2e7d32' },
  
  // Operators and punctuation
  { tag: t.operator, color: '#ff6f00', fontWeight: 'bold' },
  
  // Predicates
  { tag: t.propertyName, color: '#6200ea', fontWeight: 'bold' },
  
  // Special atoms ('a' keyword in RDF)
  { tag: t.atom, color: '#f57c00', fontWeight: 'bold' },
  
  // Brackets
  { tag: t.bracket, color: '#616161' },
  
  // Datatypes and language tags
  { tag: t.labelName, color: '#9900cc' },
  { tag: t.meta, color: '#9900cc' }
])

export const sparqlTheme = syntaxHighlighting(sparqlHighlightStyle)
