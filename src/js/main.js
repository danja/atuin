/**
 * Main application entry point
 * @module main
 */

import { TurtleEditor } from './core/TurtleEditor.js'
import { GraphVisualizer } from './core/GraphVisualizer.js'
import { LoggerService } from './services/LoggerService.js'
import { UIManager } from './ui/UIManager.js'
import { SplitPaneManager } from './ui/SplitPaneManager.js'

// Sample Turtle content
const sampleContent = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix ex: <http://example.org/> .

ex:Person a rdfs:Class .

ex:name a rdf:Property ;
  rdfs:domain ex:Person ;
  rdfs:range rdfs:Literal .

ex:age a rdf:Property ;
  rdfs:domain ex:Person ;
  rdfs:range rdfs:Literal .

ex:john a ex:Person ;
  ex:name "John Doe" ;
  ex:age "30" .

ex:jane a ex:Person ;
  ex:name "Jane Smith" ;
  ex:age "28" .
`

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log("Initializing Atuin...")

  // Initialize message queue
  const messageQueue = document.getElementById('message-queue')
  if (!messageQueue) {
    console.error("Message queue element not found")
    return
  }

  // Initialize logger
  const logger = new LoggerService('message-queue')

  // Get container elements
  const editorElement = document.getElementById('input-contents')
  const graphElement = document.getElementById('graph-container')

  if (!editorElement || !graphElement) {
    console.error("Required DOM elements not found")
    return
  }

  // Initialize editor
  console.log("Initializing editor...")
  const editor = new TurtleEditor(editorElement, logger)
  editor.initialize()

  // Initialize visualizer
  console.log("Initializing graph visualizer...")
  const visualizer = new GraphVisualizer(graphElement, logger)
  visualizer.initialize()

  // Connect editor and visualizer
  editor.onChange((content) => {
    console.log("Editor content changed, updating graph...")
    visualizer.updateGraph(content)
  })

  visualizer.onNodeSelect((nodeId) => {
    console.log("Node selected, highlighting in editor...")
    editor.highlightNode(nodeId)
  })

  // Initialize UI manager
  const uiManager = new UIManager({
    editor,
    visualizer,
    logger
  })

  // Initialize split pane
  const splitPane = new SplitPaneManager({
    container: document.querySelector('.split-container'),
    leftPane: document.getElementById('editor-container'),
    rightPane: document.getElementById('graph-container'),
    divider: document.getElementById('divider')
  })

  // Load sample content
  console.log("Setting sample content...")
  editor.setValue(sampleContent)

  logger.info('Atuin initialized successfully')
})