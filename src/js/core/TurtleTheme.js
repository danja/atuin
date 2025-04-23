import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'




const turtleHighlightStyle = HighlightStyle.define([

  { tag: t.keyword, color: '#7e57c2', fontWeight: 'bold' },


  { tag: t.definition, color: '#0277bd', fontWeight: 'bold' },


  { tag: t.string, color: '#d81b60' },


  { tag: t.comment, color: '#546e7a', fontStyle: 'italic' },


  { tag: t.number, color: '#00796b' },


  { tag: t.bool, color: '#2e7d32' },


  { tag: t.operator, color: '#ff6f00', fontWeight: 'bold' },


  { tag: t.propertyName, color: '#6200ea', fontWeight: 'bold' },


  { tag: t.atom, color: '#f57c00', fontWeight: 'bold' },


  { tag: t.typeName, color: '#039be5' },


  { tag: t.invalid, color: '#c62828', textDecoration: 'wavy underline' },


  { tag: t.bracket, color: '#616161' },


  { tag: t.labelName, color: '#9900cc' },


  { tag: t.meta, color: '#9900cc' },


  { tag: t.moduleKeyword, color: '#006400', fontWeight: 'bold' },


  { tag: [t.special(t.variableName)], color: '#4CAF50', fontWeight: 'bold' },


  { tag: t.variableName, color: '#039be5' },

  // Add namespace URI highlighting
  { tag: t.special(t.string), color: '#FFA500', fontWeight: 'bold' }
])




export const turtleTheme = syntaxHighlighting(turtleHighlightStyle)