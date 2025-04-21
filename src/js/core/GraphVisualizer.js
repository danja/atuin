/**
 * Graph visualization for RDF triples
 * @module core/GraphVisualizer
 */

// Import vis-network differently
import { Network } from 'vis-network/standalone/esm/vis-network.js'
import { DataSet } from 'vis-data/standalone/esm/vis-data.js'
import { RDFParser } from './Parser.js'
import { URIUtils } from '../utils/URIUtils.js'

/**
 * Creates and manages a graph visualization for RDF triples
 */
export class GraphVisualizer {
  /**
   * Create a new GraphVisualizer
   * @param {HTMLElement} container - The container element
   * @param {Object} logger - Logger service
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
      hidden: true,  // Whether to hide default vocabulary nodes
      freeze: false  // Whether to freeze the physics
    }

    this.clusterIndex = 0
    this.clusters = []
    this.clusterLevel = 0

    this.prefixes = {}
    this.triples = []
  }

  /**
   * Initialize the visualizer
   */
  initialize() {
    // Create empty graph
    const data = {
      nodes: this.nodes,
      edges: this.edges
    }

    // Set up network options
    const options = {
      layout: {
        randomSeed: undefined,
        improvedLayout: true,
        clusterThreshold: 200,
        hierarchical: {
          enabled: false,
          levelSeparation: 300,
          nodeSpacing: 100,
          treeSpacing: 100,
          blockShifting: true,
          edgeMinimization: true,
          parentCentralization: true,
          direction: 'LR',        // UD, DU, LR, RL
          sortMethod: 'hubsize',  // hubsize, directed
          shakeTowards: 'leaves'  // roots, leaves
        }
      },
      physics: {
        enabled: !this.options.freeze,
        //      barnesHut: {
        //      gravitationalConstant: -2500,
        //    springConstant: 0.001,
        //  springLength: 50
        // },
        hierarchicalRepulsion: {
          centralGravity: 0.0,
          springLength: 100,
          springConstant: 0.01,
          nodeDistance: 120,
          damping: 0.09,
          avoidOverlap: 0
        },
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

    // Create network
    this.network = new Network(this.container, data, options)

    // Set up event listeners
    this.network.on('click', this._handleNetworkClick.bind(this))

    this.logger.debug('Graph visualizer initialized')
  }

  /**
   * Update the graph with new content
   * @param {string} content - Turtle content
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

      // Update visualization
      this._createVisualization()

      // Apply hide/show defaults
      if (this.options.hidden) {
        this._toggleHideDefaults()
      }
    } catch (error) {
      this.logger.error('Failed to update graph', error)
    }
  }

  /**
   * Create the graph visualization
   * @private
   */
  _createVisualization() {
    // Clear existing data
    this.nodes.clear()
    this.edges.clear()

    // Process each triple
    for (const triple of this.triples) {
      const subject = triple.subject.value || triple.subject
      const predicate = triple.predicate.value || triple.predicate
      const object = triple.object.value || triple.object

      // Add nodes if they don't exist
      if (!this.nodes.get(subject)) {
        this.nodes.add(this._createNode(subject, 'subject'))
      }

      if (!this.nodes.get(object)) {
        this.nodes.add(this._createNode(object, 'object'))
      }

      // Add edge
      this.edges.add({
        from: subject,
        to: object,
        label: URIUtils.getLabel(predicate, this.prefixes),
        type: 'predicate',
        arrows: 'to',
        predicateUri: predicate
      })
    }

    // Auto-cluster if many nodes
    if (this.triples.length > 500) {
      this._makeClusters()
    }

    if (this.triples.length > 1000) {
      this._makeClusters()
    }
  }

  /**
   * Create a node for visualization
   * @private
   * @param {string} id - Node ID
   * @param {string} type - Node type (subject, object)
   * @returns {Object} - Node object
   */
  _createNode(id, type) {
    const label = URIUtils.getLabel(id, this.prefixes, this.options.labelMaxLength)
    const node = {
      id,
      label,
      type
    }

    // For longer labels, add title
    if (label.length > this.options.labelMaxLength || label.endsWith('...')) {
      const fullLabel = URIUtils.getLabel(id, this.prefixes, 0)
      node.title = fullLabel
    }

    // Style literals differently
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
   * @private
   * @param {Object} params - Click parameters
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
        // Notify subscribers about node selection
        this._notifyNodeSelection(nodeId)
      }
    } else {
      // Notify with null to clear highlights
      this._notifyNodeSelection(null)
    }
  }

  /**
   * Notify node selection listeners
   * @private
   * @param {string|null} nodeId - The selected node ID or null
   */
  _notifyNodeSelection(nodeId) {
    this.nodeSelectCallbacks.forEach(callback => callback(nodeId))
  }

  /**
   * Create node clusters
   * @private
   */
  _makeClusters() {
    this.clusterLevel++

    const clusterOptions = {
      processProperties: (clusterOptions, childNodes) => {
        this.clusterIndex++

        // Count total children (including nested)
        let childrenCount = 0
        for (const node of childNodes) {
          childrenCount += node.childrenCount || 1
        }

        // Find a subject node for naming
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

        // Store cluster info
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

    // Update stored cluster level
    if (this.clusters.length > 0) {
      this.clusterLevel = this.clusters[this.clusters.length - 1].clusterLevel
    }
  }

  /**
   * Get a label for a cluster
   * @private
   * @param {Object} node - Node object
   * @returns {string} - Cluster label
   */
  _getClusterLabel(node) {
    const label = node.title != null ? node.title : node.label

    if (!label) return 'Cluster'

    // Truncate at newline if present
    const newlineIndex = label.indexOf('\n')
    if (newlineIndex !== -1) {
      return label.substring(0, newlineIndex)
    }

    return label
  }

  /**
   * Open clusters
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
   * Toggle showing/hiding default vocabulary nodes
   * @private
   */
  _toggleHideDefaults() {
    // Store current cluster level
    const currentLevel = this.clusterLevel

    // Open all clusters first
    while (this.clusterLevel > 0) {
      this._openClusters()
    }

    // Toggle visibility based on prefix
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

    // Redraw
    this.network.body.emitter.emit('_dataChanged')

    // Restore clusters
    this.clusterLevel = 0
    for (let i = 0; i < currentLevel; i++) {
      this._makeClusters()
    }
  }

  /**
   * Toggle physics freeze
   */
  toggleFreeze() {
    this.options.freeze = !this.options.freeze

    this.network.stopSimulation()
    this.network.physics.options.enabled = !this.options.freeze
    this.network.startSimulation()
  }

  /**
   * Toggle hiding default nodes
   */
  toggleHideDefaults() {
    this.options.hidden = !this.options.hidden
    this._toggleHideDefaults()
  }

  /**
   * Make clusters
   */
  makeClusters() {
    this._makeClusters()
  }

  /**
   * Open clusters
   */
  openClusters() {
    this._openClusters()
  }

  /**
   * Register a node selection listener
   * @param {Function} callback - The callback function
   */
  onNodeSelect(callback) {
    this.nodeSelectCallbacks.push(callback)
  }

  /**
   * Remove a node selection listener
   * @param {Function} callback - The callback to remove
   */
  offNodeSelect(callback) {
    const index = this.nodeSelectCallbacks.indexOf(callback)
    if (index !== -1) {
      this.nodeSelectCallbacks.splice(index, 1)
    }
  }

  /**
   * Get all nodes
   * @returns {Array} - Array of nodes
   */
  getNodes() {
    return this.nodes.get()
  }

  /**
   * Get all edges
   * @returns {Array} - Array of edges
   */
  getEdges() {
    return this.edges.get()
  }
}