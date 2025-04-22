import { StateField, StateEffect } from '@codemirror/state'
import { EditorView, gutter, GutterMarker, Decoration } from '@codemirror/view'

// Effect to set syntax error
export const setSyntaxError = StateEffect.define()

// Create a gutter marker for the error line
class ErrorMarker extends GutterMarker {
  constructor() {
    super()
  }

  toDOM() {
    const marker = document.createElement('div')
    marker.className = 'cm-error-gutter'
    marker.textContent = '⚠'
    marker.title = 'Syntax error'
    return marker
  }
}

// StateField to track syntax errors
export const syntaxErrorField = StateField.define({
  create() {
    return Decoration.none
  },

  update(decorations, tr) {
    // Clear decorations if the document changed
    decorations = decorations.map(tr.changes)

    for (const effect of tr.effects) {
      if (effect.is(setSyntaxError)) {
        const { line, message } = effect.value
        if (line <= 0) continue // Line numbers start at 1 in error reporting

        // Find the line in the document
        let pos = 0
        for (let i = 1; i < line; i++) {
          const linePos = tr.state.doc.line(i).to
          if (linePos === undefined) break
          pos = linePos + 1
        }

        // Create a range for the entire line
        const lineObj = tr.state.doc.lineAt(pos)

        decorations = Decoration.set([
          Decoration.line({
            class: 'cm-error-line',
            attributes: { title: message }
          }).range(lineObj.from)
        ])
      }
    }

    return decorations
  },

  provide(field) {
    return EditorView.decorations.from(field)
  }
})

// Create a gutter to show error markers
export const errorGutter = gutter({
  class: 'cm-error-gutter',
  markers: view => {
    const decorations = view.state.field(syntaxErrorField, false)
    if (!decorations) return Decoration.none

    // Convert line decorations to gutter markers
    return decorations.update({
      filter: from => {
        const line = view.state.doc.lineAt(from)
        return line.from === from
      },

      map: from => {
        return Decoration.set([
          Decoration.widget({
            widget: new ErrorMarker(),
            side: -1
          }).range(from)
        ])
      }
    })
  },
  initialSpacer: () => new ErrorMarker()
})

// Main extension that combines all error highlighting features
export function syntaxErrorHighlighter() {
  return [
    syntaxErrorField,
    errorGutter
  ]
}