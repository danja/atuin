import { TurtleEditor } from './core/TurtleEditor.js'
import { GraphVisualizer } from './core/GraphVisualizer.js'
import { LoggerService } from './services/LoggerService.js'
import { UIManager } from './ui/UIManager.js'
import { SplitPaneManager } from './ui/SplitPaneManager.js'

import '../css/main.css'
import '../css/editor.css'
import '../css/graph.css'

// Sample Turtle content for initial editor loading
const sampleContent = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix ex: <http://example.org/> .

# Define classes
ex:Person a rdfs:Class ;
  rdfs:label "Person" ;
  rdfs:comment "A human being" .

# Define properties
ex:name a rdf:Property ;
  rdfs:domain ex:Person ;
  rdfs:range rdfs:Literal ;
  rdfs:label "name" ;
  rdfs:comment "The name of a person" .

ex:age a rdf:Property ;
  rdfs:domain ex:Person ;
  rdfs:range rdfs:Literal ;
  rdfs:label "age" ;
  rdfs:comment "The age of a person in years" .

ex:knows a rdf:Property ;
  rdfs:domain ex:Person ;
  rdfs:range ex:Person ;
  rdfs:label "knows" ;
  rdfs:comment "Indicates that a person knows another person" .

# Define instances
ex:john a ex:Person ;
  ex:name "John Doe" ;
  ex:age "30" ;
  ex:knows ex:jane .

ex:jane a ex:Person ;
  ex:name "Jane Smith" ;
  ex:age "28" ;
  ex:knows ex:john .
`

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log("Initializing Atuin...")

  // Get the message queue element for logging
  const messageQueue = document.getElementById('message-queue')
  if (!messageQueue) {
    console.error("Message queue element not found")
    return
  }

  // Initialize logger
  const logger = new LoggerService('message-queue')

  // Get the editor and graph container elements
  const editorElement = document.getElementById('input-contents')
  const graphElement = document.getElementById('graph-container')

  if (!editorElement || !graphElement) {
    console.error("Required DOM elements not found")
    return
  }

  // Initialize the Turtle editor
  console.log("Initializing editor...")
  const editor = new TurtleEditor(editorElement, logger)
  editor.initialize()

  // Initialize the graph visualizer
  console.log("Initializing graph visualizer...")
  const visualizer = new GraphVisualizer(graphElement, logger)
  visualizer.initialize()

  // Connect editor changes to graph updates
  editor.onChange((content) => {
    console.log("Editor content changed, updating graph...")
    visualizer.updateGraph(content)
  })

  // Connect graph node selection to editor highlighting
  visualizer.onNodeSelect((nodeId) => {
    console.log("Node selected, highlighting in editor:", nodeId)
    editor.highlightNode(nodeId)
  })

  // Initialize UI manager
  const uiManager = new UIManager({
    editor,
    visualizer,
    logger
  })

  // Initialize split pane manager
  const splitPane = new SplitPaneManager({
    container: document.querySelector('.split-container'),
    leftPane: document.getElementById('editor-container'),
    rightPane: document.getElementById('graph-container'),
    divider: document.getElementById('divider')
  })

  // Add CSS for highlighting
  const style = document.createElement('style')
  style.textContent = `
    .cm-highlight {
      background-color: rgba(144, 238, 144, 0.4);
      border-radius: 2px;
    }
    .cm-highlight-scrollbar {
      background-color: rgba(50, 205, 50, 0.7);
    }
  `
  document.head.appendChild(style)

  // Set sample content in the editor
  console.log("Setting sample content...")
  editor.setValue(sampleContent)

  // Add key binding to toggle split view
  document.addEventListener('keydown', (e) => {
    // Ctrl+Alt+S to toggle split view
    if (e.ctrlKey && e.altKey && e.key === 's') {
      document.getElementById('split-button').click()
      e.preventDefault()
    }
  })

  logger.info('Atuin initialized successfully')
})