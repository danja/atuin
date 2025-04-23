import { Network } from 'vis-network/standalone/esm/vis-network.js'
import { DataSet } from 'vis-data/standalone/esm/vis-data.js'
import { RDFParser } from './Parser.js'
import { URIUtils } from '../utils/URIUtils.js'

export class GraphVisualizer {
  /**
   * Create a graph visualizer
   * 
   * @param {HTMLElement} container - The DOM element to render the graph in
   * @param {LoggerService} logger - Logger service
   */
  constructor(container, logger) {
    this.container = container
    this.logger = logger
    this.parser = new RDFParser(logger)

    this.network = null
    this.nodes = new DataSet([])
    this.edges = new DataSet([])

    this.nodeSelectCallbacks = []

    this.options = {
      defaultPrefixes: ['rdf', 'rdfs', 'owl'],
      labelMaxLength: 15,
      hidden: true,
      freeze: false
    }

    // Colors for different node types 
    this.colors = {
      subject: {
        background: '#97B0F8',
        border: '#4466cc',
        highlight: {
          background: '#b3c6fa',
          border: '#5577dd'
        }
      },
      object: {
        background: '#D5DDF6',
        border: '#97B0F8',
        highlight: {
          background: '#e8edfb',
          border: '#b3c6fa'
        }
      },
      literal: {
        background: '#fff6a5',
        border: '#ffcc00',
        highlight: {
          background: '#fffbc2',
          border: '#ffdd33'
        }
      },
      class: {
        background: '#ffb366',
        border: '#ff8000',
        highlight: {
          background: '#ffc28a',
          border: '#ff9933'
        }
      },
      property: {
        background: '#ffff99',
        border: '#e6e600',
        highlight: {
          background: '#ffffb3',
          border: '#ffff33'
        }
      },
      cluster: {
        background: '#ffce99',
        border: '#ff9c33',
        highlight: {
          background: '#ffe6cc',
          border: '#ffb566'
        }
      }
    }

    this.clusterIndex = 0
    this.clusters = []
    this.clusterLevel = 0

    this.prefixes = {}
    this.triples = []
  }

  /**
   * Initialize the graph visualizer
   */
  initialize() {
    // Create data structure
    const data = {
      nodes: this.nodes,
      edges: this.edges
    }

    // Network visualization options
    const options = {
      layout: {
        randomSeed: undefined,
        improvedLayout: true,
        clusterThreshold: 150,
        hierarchical: {
          enabled: false,
          levelSeparation: 150,
          nodeSpacing: 100,
          treeSpacing: 200,
          blockShifting: true,
          edgeMinimization: true,
          parentCentralization: true,
          direction: 'UD',
          sortMethod: 'hubsize',
          shakeTowards: 'leaves'
        }
      },
      physics: {
        enabled: !this.options.freeze,
        barnesHut: {
          theta: 0.5,
          gravitationalConstant: -2000,
          centralGravity: 0.3,
          springLength: 95,
          springConstant: 0.04,
          damping: 0.09,
          avoidOverlap: 0
        },
        forceAtlas2Based: {
          theta: 0.5,
          gravitationalConstant: -50,
          centralGravity: 0.01,
          springConstant: 0.08,
          springLength: 100,
          damping: 0.4,
          avoidOverlap: 0
        },
        repulsion: {
          centralGravity: 0.2,
          springLength: 200,
          springConstant: 0.05,
          nodeDistance: 100,
          damping: 0.09
        },
        hierarchicalRepulsion: {
          centralGravity: 0.0,
          springLength: 100,
          springConstant: 0.01,
          nodeDistance: 120,
          damping: 0.09,
          avoidOverlap: 0
        },
        maxVelocity: 50,
        minVelocity: 0.1,
        solver: 'barnesHut',
        stabilization: {
          enabled: true,
          iterations: 1000,
          updateInterval: 100,
          onlyDynamicEdges: false,
          fit: true
        },
        timestep: 0.5,
        adaptiveTimestep: true,
        wind: { x: 0, y: 0 }
      },
      edges: {
        smooth: { type: 'continuous' },
        font: {
          size: 12,
          face: 'Arial',
          background: 'rgba(255, 255, 255, 0.8)',
          strokeWidth: 0
        },
        color: {
          color: '#0077aa',
          highlight: '#0099cc'
        },
        width: 1.5,
        selectionWidth: 2.5
      },
      nodes: {
        shape: 'dot',
        size: 10,
        font: {
          size: 12,
          face: 'Arial',
          strokeWidth: 0
        },
        borderWidth: 1.5,
        shadow: {
          enabled: false
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        zoomView: true,
        dragView: true,
        hoverConnectedEdges: true,
        selectConnectedEdges: true
      },
      groups: {
        subject: {
          color: this.colors.subject
        },
        object: {
          color: this.colors.object
        },
        literal: {
          color: this.colors.literal
        },
        class: {
          color: this.colors.class
        },
        property: {
          color: this.colors.property
        }
      }
    }

    // Create network
    this.network = new Network(this.container, data, options)

    // Handle click events
    this.network.on('click', this._handleNetworkClick.bind(this))

    this.logger.debug('Graph visualizer initialized')
  }

  /**
   * Update the graph visualization based on parsed triples
   * 
   * @param {string} content - Turtle RDF content
   */
  async updateGraph(content) {
    try {
      const { triples, prefixes } = await this.parser.parseTriples(content)

      this.prefixes = prefixes || {}
      this.triples = triples

      // Reset cluster state
      this.clusterIndex = 0
      this.clusters = []
      this.clusterLevel = 0

      // Create visualization from updated data
      this._createVisualization()

      // Apply hide defaults if enabled
      if (this.options.hidden) {
        this._toggleHideDefaults()
      }
    } catch (error) {
      this.logger.error('Failed to update graph', error)
    }
  }

  /**
   * Create the visualization from the current triples
   */
  _createVisualization() {
    // Clear existing nodes and edges
    this.nodes.clear()
    this.edges.clear()

    // Build lookup tables for quick type detection
    const classes = new Set()
    const properties = new Set()

    // First pass: identify RDF classes and properties
    for (const triple of this.triples) {
      const subject = triple.subject.value || triple.subject
      const predicate = triple.predicate.value || triple.predicate
      const object = triple.object.value || triple.object

      // Check for rdf:type triples to identify classes
      if (predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
        if (object === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Property' ||
          object === 'http://www.w3.org/2000/01/rdf-schema#Property' ||
          object === 'http://www.w3.org/2002/07/owl#ObjectProperty' ||
          object === 'http://www.w3.org/2002/07/owl#DatatypeProperty') {
          properties.add(subject)
        } else if (object === 'http://www.w3.org/2000/01/rdf-schema#Class' ||
          object === 'http://www.w3.org/2002/07/owl#Class') {
          classes.add(subject)
        }
      }
    }

    // Second pass: create nodes and edges
    for (const triple of this.triples) {
      const subject = triple.subject.value || triple.subject
      const predicate = triple.predicate.value || triple.predicate
      const object = triple.object.value || triple.object

      // Create subject node if it doesn't exist
      if (!this.nodes.get(subject)) {
        let nodeType = 'subject'
        if (classes.has(subject)) {
          nodeType = 'class'
        } else if (properties.has(subject)) {
          nodeType = 'property'
        }
        this.nodes.add(this._createNode(subject, nodeType))
      }

      // Create object node if it doesn't exist
      if (!this.nodes.get(object)) {
        let nodeType = 'object'
        if (classes.has(object)) {
          nodeType = 'class'
        } else if (properties.has(object)) {
          nodeType = 'property'
        } else if (URIUtils.isLiteral(object)) {
          nodeType = 'literal'
        }
        this.nodes.add(this._createNode(object, nodeType))
      }

      // Create edge between subject and object
      const prefixedPredicate = URIUtils.shrinkUri(predicate, this.prefixes)

      this.edges.add({
        from: subject,
        to: object,
        label: prefixedPredicate || URIUtils.getLabel(predicate, this.prefixes),
        type: 'predicate',
        arrows: 'to',
        predicateUri: predicate,
        font: {
          size: 10,
          align: 'middle',
          multi: 'false',
          face: 'sans-serif'
        },
        color: {
          color: '#0077aa',
          highlight: '#0099cc',
          hover: '#0088bb'
        },
        smooth: {
          type: 'continuous',
          roundness: 0.2
        }
      })
    }

    // Add clustering for large graphs
    if (this.triples.length > 500) {
      this._makeClusters()
    }

    if (this.triples.length > 1000) {
      this._makeClusters()
    }
  }

  /**
   * Create a node for the visualization
   * 
   * @param {string} id - Node identifier
   * @param {string} type - Node type (subject, object, literal, class, property)
   * @returns {object} - Node object for vis-network
   */
  _createNode(id, type) {
    const label = URIUtils.getLabel(id, this.prefixes, this.options.labelMaxLength)
    const node = {
      id,
      label,
      group: type,
      title: label.length > this.options.labelMaxLength || label.endsWith('...')
        ? URIUtils.getLabel(id, this.prefixes, 0) : undefined
    }

    // Apply specific styling based on node type
    if (URIUtils.isLiteral(id)) {
      node.shape = 'box'
      node.borderRadius = 8 // Rounded corners for literals
      node.font = { color: '#a31515' }
      node.widthConstraint = { minimum: 50, maximum: 200 }
    } else if (type === 'property') {
      node.shape = 'ellipse'
      node.font = { color: '#0077aa', strokeWidth: 0, bold: true }
    } else if (type === 'class') {
      node.shape = 'diamond'
      node.size = 12
      node.font = { color: '#aa6600', bold: true }
    } else if (type === 'subject') {
      // Keep default dot shape for subjects
      node.size = 10
    } else {
      // Default styling for object nodes
      node.size = 8
    }

    return node
  }

  /**
   * Handle network click events
   * 
   * @param {object} params - Click event parameters
   */
  _handleNetworkClick(params) {
    if (params.nodes.length === 1) {
      const nodeId = params.nodes[0]

      // Check if it's a cluster
      if (this.network.isCluster(nodeId)) {
        // Open the cluster
        this.network.openCluster(nodeId)

        // Remove from clusters list
        const index = this.clusters.findIndex(c => c.id === nodeId)
        if (index !== -1) {
          this.clusters.splice(index, 1)
        }
      } else {
        // Notify node selection
        this._notifyNodeSelection(nodeId)
      }
    } else {
      // Deselect any selected node
      this._notifyNodeSelection(null)
    }
  }

  /**
   * Notify all registered callbacks about node selection
   * 
   * @param {string|null} nodeId - Selected node ID or null if deselected
   */
  _notifyNodeSelection(nodeId) {
    this.nodeSelectCallbacks.forEach(callback => callback(nodeId))
  }

  /**
   * Create clusters in the graph
   */
  _makeClusters() {
    this.clusterLevel++

    const clusterOptions = {
      processProperties: (clusterOptions, childNodes) => {
        this.clusterIndex++

        // Calculate total children count
        let childrenCount = 0
        for (const node of childNodes) {
          childrenCount += node.childrenCount || 1
        }

        // Try to find a suitable subject node for the cluster label
        let subjectNode = null
        for (const node of childNodes) {
          const connectedNodes = this.network.getConnectedNodes(node.id)
          if (connectedNodes.length === 1) {
            subjectNode = this.nodes.get(connectedNodes[0]) ||
              this.clusters.find(c => c.id === connectedNodes[0])
            if (subjectNode) break
          }
        }

        const clusterId = `cluster:${this.clusterIndex}`
        const clusterLabel = subjectNode
          ? `${this._getClusterLabel(subjectNode)}\n(${childrenCount} nodes)`
          : `Cluster ${this.clusterIndex}\n(${childrenCount} nodes)`

        // Set cluster properties
        clusterOptions.childrenCount = childrenCount
        clusterOptions.size = childrenCount * 4 + 15
        clusterOptions.label = clusterLabel
        clusterOptions.id = clusterId
        clusterOptions.mass = 0.5 * childrenCount
        clusterOptions.color = this.colors.cluster

        // Store cluster for later reference
        this.clusters.push({
          id: clusterId,
          label: clusterLabel,
          clusterLevel: this.clusterLevel
        })

        return clusterOptions
      },
      clusterNodeProperties: {
        borderWidth: 2,
        shape: 'dot',
        color: this.colors.cluster,
        font: {
          size: 12,
          face: 'Arial',
          multi: 'html',
          bold: true
        }
      }
    }

    this.network.clusterOutliers(clusterOptions)

    // Update cluster level
    if (this.clusters.length > 0) {
      this.clusterLevel = this.clusters[this.clusters.length - 1].clusterLevel
    }
  }

  /**
   * Get a readable label for a cluster
   * 
   * @param {object} node - Node object
   * @returns {string} Cluster label
   */
  _getClusterLabel(node) {
    const label = node.title != null ? node.title : node.label

    if (!label) return 'Cluster'

    // Extract first line if label has multiple lines
    const newlineIndex = label.indexOf('\n')
    if (newlineIndex !== -1) {
      return label.substring(0, newlineIndex)
    }

    return label
  }

  /**
   * Open clusters at the current level
   */
  _openClusters() {
    let declustered = false
    const newClusters = []

    for (const cluster of this.clusters) {
      if (cluster.clusterLevel >= this.clusterLevel) {
        this.network.openCluster(cluster.id)
        declustered = true
      } else {
        newClusters.push(cluster)
      }
    }

    this.clusters = newClusters

    if (declustered) {
      this.clusterLevel--
    } else if (this.clusterLevel > 0) {
      this.clusterLevel--
      this._openClusters()
    }
  }

  /**
   * Toggle visibility of default vocabulary nodes (RDF, RDFS, OWL)
   */
  _toggleHideDefaults() {
    // Store current cluster level
    const currentLevel = this.clusterLevel

    // Open all clusters before modifying nodes
    while (this.clusterLevel > 0) {
      this._openClusters()
    }

    // Toggle visibility of default vocabulary nodes
    this.nodes.forEach(node => {
      const shortened = URIUtils.shrinkUri(node.id, this.prefixes)
      const prefixPart = shortened.split(':')[0]

      if (this.options.defaultPrefixes.includes(prefixPart)) {
        node.hidden = this.options.hidden

        // Also hide connected edges
        const connectedEdges = this.network.getConnectedEdges(node.id)
        connectedEdges.forEach(edgeId => {
          const edge = this.edges.get(edgeId)
          if (edge) {
            edge.hidden = this.options.hidden
            this.edges.update(edge)
          }
        })

        this.nodes.update(node)
      }
    })

    // Force refresh
    this.network.body.emitter.emit('_dataChanged')

    // Restore clustering
    this.clusterLevel = 0
    for (let i = 0; i < currentLevel; i++) {
      this._makeClusters()
    }
  }

  /**
   * Toggle freeze/unfreeze of the graph physics
   */
  toggleFreeze() {
    this.options.freeze = !this.options.freeze

    this.network.stopSimulation()
    this.network.physics.options.enabled = !this.options.freeze
    this.network.startSimulation()
  }

  /**
   * Toggle visibility of default vocabulary nodes
   */
  toggleHideDefaults() {
    this.options.hidden = !this.options.hidden
    this._toggleHideDefaults()
  }

  /**
   * Create a new cluster level
   */
  makeClusters() {
    this._makeClusters()
  }

  /**
   * Open clusters at the current level
   */
  openClusters() {
    this._openClusters()
  }

  /**
   * Register a callback for node selection events
   * 
   * @param {Function} callback - Function to call when a node is selected
   */
  onNodeSelect(callback) {
    this.nodeSelectCallbacks.push(callback)
  }

  /**
   * Unregister a callback for node selection events
   * 
   * @param {Function} callback - Function to remove from callbacks
   */
  offNodeSelect(callback) {
    const index = this.nodeSelectCallbacks.indexOf(callback)
    if (index !== -1) {
      this.nodeSelectCallbacks.splice(index, 1)
    }
  }

  /**
   * Get all nodes in the graph
   * 
   * @returns {Array} Array of node objects
   */
  getNodes() {
    return this.nodes.get()
  }

  /**
   * Get all edges in the graph
   * 
   * @returns {Array} Array of edge objects
   */
  getEdges() {
    return this.edges.get()
  }
}