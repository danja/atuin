import { TurtleEditor } from './core/TurtleEditor.js'
import { SPARQLEditor } from './core/SPARQLEditor.js'
import { GraphVisualizer } from './core/GraphVisualizer.js'
import { LoggerService } from './services/LoggerService.js'
import { UIManager } from './ui/UIManager.js'
import { SplitPaneManager } from './ui/SplitPaneManager.js'
import { SettingsManager } from './ui/SettingsManager.js';
import { SparqlService } from './core/SparqlService.js';

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

// Sample SPARQL query for initial loading
const sampleSparql = `PREFIX ex: <http://example.org/>
SELECT ?person ?name ?age WHERE {
  ?person a ex:Person ;
          ex:name ?name ;
          ex:age ?age .
  FILTER(?age > 25)
}
ORDER BY ?name
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
  const logger = new LoggerService('message-queue');

  // Initialize SparqlService
  const sparqlService = new SparqlService();

  // Get the editor and graph container elements
  const editorElement = document.getElementById('input-contents')
  const sparqlElement = document.getElementById('sparql-contents')
  const turtlePane = document.getElementById('turtle-editor-pane')
  const sparqlPane = document.getElementById('sparql-editor-pane')
  const tabTurtle = document.getElementById('tab-turtle')
  const tabSparql = document.getElementById('tab-sparql')
  const graphElement = document.getElementById('graph-container')
  
  // Get the right panel tab elements
  const viewPane = document.getElementById('view-pane')
  const settingsPane = document.getElementById('settings-pane')
  const tabView = document.getElementById('tab-view')
  const tabSettings = document.getElementById('tab-settings')
  const rightPanel = document.getElementById('right-panel')

  if (!editorElement || !sparqlElement || !turtlePane || !sparqlPane || !tabTurtle || !tabSparql || 
      !graphElement || !viewPane || !settingsPane || !tabView || !tabSettings || !rightPanel) {
    console.error("Required DOM elements not found")
    return
  }

  // Initialize the Turtle editor
  console.log("Initializing editor...")
  const editor = new TurtleEditor(editorElement, logger)
  editor.initialize()

  // Initialize the SPARQL editor
  console.log("Initializing SPARQL editor...")
  const sparqlEditor = new SPARQLEditor(sparqlElement, logger)
  sparqlEditor.initialize()

  // Tab switching logic for editor (left side)
  function activateEditorTab(tab) {
    if (tab === 'turtle') {
      tabTurtle.classList.add('active')
      tabSparql.classList.remove('active')
      turtlePane.style.display = ''
      sparqlPane.style.display = 'none'
      tabTurtle.style.borderBottom = '2px solid #0074D9'
      tabSparql.style.borderBottom = 'none'
    } else {
      tabTurtle.classList.remove('active')
      tabSparql.classList.add('active')
      turtlePane.style.display = 'none'
      sparqlPane.style.display = ''
      tabTurtle.style.borderBottom = 'none'
      tabSparql.style.borderBottom = '2px solid #0074D9'
    }
  }
  
  // Tab switching logic for right panel
  function activateRightPanelTab(tab) {
    if (tab === 'view') {
      tabView.classList.add('active')
      tabSettings.classList.remove('active')
      viewPane.style.display = ''
      settingsPane.style.display = 'none'
      tabView.style.borderBottom = '2px solid #0074D9'
      tabSettings.style.borderBottom = 'none'
    } else {
      tabView.classList.remove('active')
      tabSettings.classList.add('active')
      viewPane.style.display = 'none'
      settingsPane.style.display = ''
      tabView.style.borderBottom = 'none'
      tabSettings.style.borderBottom = '2px solid #0074D9'
    }
  }
  
  // Add event listeners for tab switching
  tabTurtle.addEventListener('click', () => activateEditorTab('turtle'))
  tabSparql.addEventListener('click', () => activateEditorTab('sparql'))
  tabView.addEventListener('click', () => {
    activateRightPanelTab('view')
    // When switching to view tab, refresh the graph visualization
    setTimeout(() => {
      visualizer.resizeAndFit()
    }, 50)
  })
  tabSettings.addEventListener('click', () => activateRightPanelTab('settings'))
  
  // Handle window resize to ensure graph visualization fits properly
  window.addEventListener('resize', () => {
    if (tabView.classList.contains('active')) {
      visualizer.resizeAndFit()
    }
  })

  // Initial state: Turtle tab and View tab active
  activateEditorTab('turtle')
  activateRightPanelTab('view')

  // Set sample content in both editors
  editor.setValue(sampleContent)
  sparqlEditor.setValue(sampleSparql)

  // Initialize the graph visualizer
  console.log("Initializing graph visualizer...")
  const visualizer = new GraphVisualizer(graphElement, logger)
  visualizer.initialize()

  // Connect editor changes to graph updates
  editor.onChange((content) => {
    console.log("Editor content changed, updating graph...")
    visualizer.updateGraph(content)
  })
  
  // Initialize the settings manager
  console.log("Initializing settings manager...")
  const settingsManager = new SettingsManager({
    visualizer,
    editor,
    sparqlEditor,
    logger
  })
  
  // Apply initial settings
  setTimeout(() => {
    settingsManager.applyAllSettings()
  }, 500)

  // Connect graph node selection to editor highlighting
  visualizer.onNodeSelect((nodeId) => {
    console.log("Node selected, highlighting in editor:", nodeId)
    editor.highlightNode(nodeId)
  })

  // Initialize UI manager
  const uiManager = new UIManager({
    editor: editor,
    sparqlEditor: sparqlEditor, // Added SPARQLEditor instance
    visualizer: visualizer,
    logger: logger,
    settingsManager: settingsManager,
    sparqlService: sparqlService
  })

  // Initialize split pane manager
  const splitPane = new SplitPaneManager({
    container: document.querySelector('.split-container'),
    leftPane: document.getElementById('editor-container'),
    rightPane: document.getElementById('right-panel'),
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