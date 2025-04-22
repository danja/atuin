import { StateField, StateEffect } from '@codemirror/state'
import { EditorView, Decoration } from '@codemirror/view'
import { URIUtils } from '../utils/URIUtils.js'

// Define state effect for setting highlighted node
export const setHighlightedNode = StateEffect.define()

// Define state field for node highlighting
export const nodeHighlightField = StateField.define({
  create() {
    return Decoration.none
  },

  update(decorations, tr) {
    // Map existing decorations through document changes
    decorations = decorations.map(tr.changes)

    for (const effect of tr.effects) {
      if (effect.is(setHighlightedNode)) {
        const nodeId = effect.value

        if (!nodeId) {
          // Clear all highlights if no node ID is provided
          return Decoration.none
        }

        // Get the document content
        const doc = tr.state.doc.toString()
        const decorationSet = []

        // Define different possible representations of the node
        const variations = [
          // Full URI with angle brackets
          `<${nodeId}>`,
          // Shortened form with prefix
          URIUtils.isLiteral(nodeId) ? null : URIUtils.shrinkUri(nodeId, {})
        ].filter(Boolean)

        // Find all occurrences of each variation
        for (const variation of variations) {
          let index = doc.indexOf(variation)
          while (index !== -1) {
            decorationSet.push(
              Decoration.mark({
                class: 'cm-highlight',
                attributes: { title: 'Selected node' }
              }).range(index, index + variation.length)
            )
            index = doc.indexOf(variation, index + variation.length)
          }
        }

        // For literals, also search for the raw value
        if (URIUtils.isLiteral(nodeId)) {
          // Handle literals with or without quotes
          const rawValue = nodeId.startsWith('"') ?
            nodeId.substring(1, nodeId.lastIndexOf('"')) :
            nodeId

          let index = doc.indexOf(rawValue)
          while (index !== -1) {
            // Check if it's actually a literal (has quotes around it or is inside a triple)
            const before = doc.substring(Math.max(0, index - 2), index)
            const after = doc.substring(index + rawValue.length,
              Math.min(doc.length, index + rawValue.length + 2))

            if (before.includes('"') || after.includes('"') ||
              before.includes("'") || after.includes("'")) {
              decorationSet.push(
                Decoration.mark({
                  class: 'cm-highlight',
                  attributes: { title: 'Selected node' }
                }).range(index, index + rawValue.length)
              )
            }

            index = doc.indexOf(rawValue, index + rawValue.length)
          }
        }

        return Decoration.set(decorationSet)
      }
    }

    return decorations
  },

  provide(field) {
    return EditorView.decorations.from(field)
  }
})

// Create the highlighter extension
export function nodeHighlighter() {
  return [
    nodeHighlightField
  ]
}