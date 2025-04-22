import { Network } from 'vis-network/standalone/esm/vis-network.js'
import { DataSet } from 'vis-data/standalone/esm/vis-data.js'
import { RDFParser } from './Parser.js'
import { URIUtils } from '../utils/URIUtils.js'

/**
 * Graph visualization component for RDF data
 */
export class GraphVisualizer {
  /**
   * Creates a new GraphVisualizer instance
   * 
   * @param {HTMLElement} container - The DOM element to contain the graph
   * @param {Object} logger - The logger service
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

    this.clusterIndex = 0
    this.clusters = []
    this.clusterLevel = 0

    this.prefixes = {}
    this.triples = []
  }

  /**
   * Initialize the graph visualization
   */
  initialize() {
    // Create network data structure
    const data = {
      nodes: this.nodes,
      edges: this.edges
    }

    // Network configuration
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
        smooth: { type: 'continuous' }
      },
      nodes: {
        shape: 'dot',
        size: 10,
        font: {
          size: 12,
          face: 'Arial'
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        zoomView: true,
        dragView: true
      }
    }

    // Create the network
    this.network = new Network(this.container, data, options)

    // Register event handler
    this.network.on('click', this._handleNetworkClick.bind(this))

    this.logger.debug('Graph visualizer initialized')
  }

  /**
   * Update the graph with new RDF content
   * 
   * @param {string} content - The RDF content in Turtle format
   */
  async updateGraph(content) {
    try {
      const { triples, prefixes } = await this.parser.parseTriples(content)

      this.prefixes = prefixes || {}
      this.triples = triples

      // Reset clusters
      this.clusterIndex = 0
      this.clusters = []
      this.clusterLevel = 0

      // Create visualization from triples
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
   * Create graph visualization from triples
   * 
   * @private
   */
  _createVisualization() {
    // Clear existing nodes and edges
    this.nodes.clear()
    this.edges.clear()

    // Process each triple to create nodes and edges
    for (const triple of this.triples) {
      const subject = triple.subject.value || triple.subject
      const predicate = triple.predicate.value || triple.predicate
      const object = triple.object.value || triple.object

      // Add subject node if it doesn't exist
      if (!this.nodes.get(subject)) {
        this.nodes.add(this._createNode(subject, 'subject'))
      }

      // Add object node if it doesn't exist
      if (!this.nodes.get(object)) {
        this.nodes.add(this._createNode(object, 'object'))
      }

      // Add edge from subject to object
      this.edges.add({
        from: subject,
        to: object,
        label: URIUtils.getLabel(predicate, this.prefixes),
        type: 'predicate',
        arrows: 'to',
        predicateUri: predicate
      })
    }

    // Auto-cluster large graphs
    if (this.triples.length > 500) {
      this._makeClusters()
    }

    if (this.triples.length > 1000) {
      this._makeClusters()
    }
  }

  /**
   * Create a node object for visualization
   * 
   * @private
   * @param {string} id - The node ID
   * @param {string} type - The node type (subject/object)
   * @returns {Object} The node object
   */
  _createNode(id, type) {
    const label = URIUtils.getLabel(id, this.prefixes, this.options.labelMaxLength)
    const node = {
      id,
      label,
      type
    }

    // Add tooltip for long labels
    if (label.length > this.options.labelMaxLength || label.endsWith('...')) {
      const fullLabel = URIUtils.getLabel(id, this.prefixes, 0)
      node.title = fullLabel
    }

    // Style based on node type
    if (URIUtils.isLiteral(id)) {
      node.shape = 'box'
      node.shapeProperties = { borderDashes: [5, 5] }
      node.color = {
        background: 'yellow',
        border: 'black',
        highlight: {
          background: '#F2F59D',
          border: 'red'
        }
      }
    } else if (type === 'subject') {
      node.color = {
        background: '#97B0F8',
        border: '#4466cc',
        highlight: {
          background: '#b3c6fa',
          border: '#5577dd'
        }
      }
    }

    return node
  }

  /**
   * Handle network click events
   * 
   * @private
   * @param {Object} params - Event parameters from vis.js
   */
  _handleNetworkClick(params) {
    if (params.nodes.length === 1) {
      const nodeId = params.nodes[0]

      // Check if clicked on cluster
      if (this.network.isCluster(nodeId)) {
        // Open cluster
        this.network.openCluster(nodeId)

        // Remove from clusters array
        const index = this.clusters.findIndex(c => c.id === nodeId)
        if (index !== -1) {
          this.clusters.splice(index, 1)
        }
      } else {
        // Notify selection
        this._notifyNodeSelection(nodeId)
      }
    } else {
      // Clear selection
      this._notifyNodeSelection(null)
    }
  }

  /**
   * Notify registered callbacks about node selection
   * 
   * @private
   * @param {string|null} nodeId - The selected node ID or null
   */
  _notifyNodeSelection(nodeId) {
    this.nodeSelectCallbacks.forEach(callback => callback(nodeId))
  }

  /**
   * Create clusters from graph nodes
   * 
   * @private
   */
  _makeClusters() {
    this.clusterLevel++

    const clusterOptions = {
      processProperties: (clusterOptions, childNodes) => {
        this.clusterIndex++

        // Count total child nodes including nested ones
        let childrenCount = 0
        for (const node of childNodes) {
          childrenCount += node.childrenCount || 1
        }

        // Try to find a good name for the cluster
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

        // Remember this cluster
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
        color: {
          background: '#ffce99',
          border: '#ff9c33',
          highlight: {
            background: '#ffe6cc',
            border: '#ffb566'
          }
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
   * Get a label for a cluster based on a node
   * 
   * @private
   * @param {Object} node - The node object
   * @returns {string} The cluster label
   */
  _getClusterLabel(node) {
    const label = node.title != null ? node.title : node.label

    if (!label) return 'Cluster'

    // If there's a newline, only take the first line
    const newlineIndex = label.indexOf('\n')
    if (newlineIndex !== -1) {
      return label.substring(0, newlineIndex)
    }

    return label
  }

  /**
   * Open clusters recursively
   * 
   * @private
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
   * Toggle visibility of default vocabulary nodes
   * 
   * @private
   */
  _toggleHideDefaults() {
    // Remember current cluster level
    const currentLevel = this.clusterLevel

    // Open all clusters first
    while (this.clusterLevel > 0) {
      this._openClusters()
    }

    // Toggle visibility of nodes based on prefix
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

    // Force network update
    this.network.body.emitter.emit('_dataChanged')

    // Recreate clusters
    this.clusterLevel = 0
    for (let i = 0; i < currentLevel; i++) {
      this._makeClusters()
    }
  }

  /**
   * Toggle physics simulation freeze state
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
   * Open one level of clusters
   */
  openClusters() {
    this._openClusters()
  }

  /**
   * Register callback for node selection events
   * 
   * @param {Function} callback - Function to call when node is selected
   */
  onNodeSelect(callback) {
    this.nodeSelectCallbacks.push(callback)
  }

  /**
   * Unregister callback for node selection events
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