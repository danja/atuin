import { TurtleEditor } from '../../../src/js/core/TurtleEditor.js'
import { GraphVisualizer } from '../../../src/js/core/GraphVisualizer.js'
import { eventBus, EVENTS } from '../../../../evb/src/index.js'

describe('TurtleEditor <-> GraphVisualizer integration via event bus', () => {
    let editor, visualizer, textarea, container, logger

    beforeEach(() => {
        // Mock DOM elements
        textarea = document.createElement('textarea')
        container = document.createElement('div')
        // Simple logger mock
        logger = { debug: () => { }, error: () => { } }
        // Clear event bus listeners
        eventBus.removeAllListeners()
        // Create instances
        editor = new TurtleEditor(textarea, logger)
        visualizer = new GraphVisualizer(container, logger)
        // Initialize editor (sets up CodeMirror, but we don't need to attach to DOM)
        editor.initialize()
        // Spy on updateGraph
        spyOn(visualizer, 'updateGraph').and.callThrough()
    })

    it('should call updateGraph on GraphVisualizer when TurtleEditor content changes', (done) => {
        const turtleData = '@prefix ex: <http://example.org/> .\nex:a ex:b ex:c .'
        // Listen for updateGraph call
        setTimeout(() => {
            expect(visualizer.updateGraph).toHaveBeenCalledWith(turtleData)
            done()
        }, 100) // Allow event loop to process
        // Set value in editor (triggers event)
        editor.setValue(turtleData)
    })
}) 