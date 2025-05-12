import { TurtleEditor } from '../../../src/js/core/TurtleEditor.js'
import { GraphVisualizer } from '../../../src/js/core/GraphVisualizer.js'
import { eventBus, EVENTS } from '../../../../evb/src/index.js'
import { describe, it, beforeEach, expect, vi } from 'vitest'

describe('TurtleEditor <-> GraphVisualizer integration via event bus', () => {
    let editor, visualizer, textarea, container, logger

    beforeEach(() => {
        textarea = document.createElement('textarea')
        container = document.createElement('div')
        logger = { debug: () => { }, error: () => { } }
        eventBus.removeAllListeners()
        editor = new TurtleEditor(textarea, logger)
        visualizer = new GraphVisualizer(container, logger)
        editor.initialize()
        vi.spyOn(visualizer, 'updateGraph')
    })

    it('should call updateGraph on GraphVisualizer when TurtleEditor content changes', async () => {
        const turtleData = '@prefix ex: <http://example.org/> .\nex:a ex:b ex:c .'
        await new Promise((resolve) => {
            setTimeout(() => {
                expect(visualizer.updateGraph).toHaveBeenCalledWith(turtleData)
                resolve()
            }, 100)
            editor.setValue(turtleData)
        })
    })
})
