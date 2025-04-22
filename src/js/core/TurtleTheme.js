import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

/**
 * Custom syntax highlighting style for Turtle RDF
 */
const turtleHighlightStyle = HighlightStyle.define([
  // Keywords (@prefix, @base)
  { tag: t.keyword, color: '#7e57c2', fontWeight: 'bold' },

  // Prefix definitions
  { tag: t.definition, color: '#0277bd', fontWeight: 'bold' },

  // String literals
  { tag: t.string, color: '#d81b60' },

  // Comments
  { tag: t.comment, color: '#546e7a', fontStyle: 'italic' },

  // Numeric literals
  { tag: t.number, color: '#00796b' },

  // Boolean literals
  { tag: t.bool, color: '#2e7d32' },

  // Operators (. ; ,)
  { tag: t.operator, color: '#ff6f00', fontWeight: 'bold' },

  // Predicates
  { tag: t.propertyName, color: '#6200ea', fontWeight: 'bold' },

  // Special tokens like 'a' (rdf:type)
  { tag: t.atom, color: '#f57c00', fontWeight: 'bold' },

  // Type names (prefixed names)
  { tag: t.typeName, color: '#039be5' },

  // Invalid syntax
  { tag: t.invalid, color: '#c62828', textDecoration: 'wavy underline' },

  // Brackets [] () for collections
  { tag: t.bracket, color: '#616161' },

  // Datatype indicators
  { tag: t.labelName, color: '#9900cc' },

  // Language tags
  { tag: t.meta, color: '#9900cc' }
])

/**
 * Theme extension for Turtle syntax highlighting
 */
export const turtleTheme = syntaxHighlighting(turtleHighlightStyle)