import { Network } from 'vis-network/standalone/esm/vis-network.js'
import { DataSet } from 'vis-data/standalone/esm/vis-data.js'
import { RDFParser } from './Parser.js'
import { URIUtils } from '../utils/URIUtils.js'

export class GraphVisualizer {
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

    // Define consistent colors for different node types
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

  initialize() {
    const data = {
      nodes: this.nodes,
      edges: this.edges
    }

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
        shape: 'ellipse',
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
      groups: {
        subject: {
          shape: 'ellipse',
          color: this.colors.subject
        },
        object: {
          shape: 'ellipse',
          color: this.colors.object
        },
        literal: {
          shape: 'box',
          borderRadius: 8,
          color: this.colors.literal
        },
        class: {
          shape: 'box',
          borderRadius: 8,
          color: this.colors.class
        },
        property: {
          shape: 'box',
          borderRadius: 8,
          color: this.colors.property
        }
      }
    }

    this.network = new Network(this.container, data, options)

    this.network.on('click', this._handleNetworkClick.bind(this))

    this.logger.debug('Graph visualizer initialized')
  }

  async updateGraph(content) {
    try {
      const { triples, prefixes } = await this.parser.parseTriples(content)

      // Store prefixes for label generation
      this.prefixes = prefixes || {}
      this.triples = triples

      this.clusterIndex = 0
      this.clusters = []
      this.clusterLevel = 0

      this._createVisualization()

      if (this.options.hidden) {
        this._toggleHideDefaults()
      }
    } catch (error) {
      this.logger.error('Failed to update graph', error)
    }
  }

  _createVisualization() {
    this.nodes.clear()
    this.edges.clear()

    const classes = new Set()
    const properties = new Set()

    // First pass: identify classes and properties
    for (const triple of this.triples) {
      const subject = triple.subject.value || triple.subject
      const predicate = triple.predicate.value || triple.predicate
      const object = triple.object.value || triple.object

      // Check for class and property type declarations
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

      // Create edge with proper label
      this._createEdge(subject, predicate, object)
    }

    // Automatic clustering for large graphs
    if (this.triples.length > 500) {
      this._makeClusters()
    }

    if (this.triples.length > 1000) {
      this._makeClusters()
    }
  }

  _createNode(id, type) {
    // Get the prefixed form when possible
    let label = URIUtils.isLiteral(id) ? id : URIUtils.shrinkUri(id, this.prefixes)

    // If no prefix match, try to get the local name
    if (label === id && !URIUtils.isLiteral(id)) {
      const parts = URIUtils.splitNamespace(id)
      label = parts.name || label
    }

    // For literals, truncate if too long
    if (URIUtils.isLiteral(id) && label.length > this.options.labelMaxLength) {
      label = label.substring(0, this.options.labelMaxLength - 3) + '...'
    }

    const node = {
      id,
      label,
      group: type,
      title: id  // Full URI on hover
    }

    // Style nodes based on type
    if (type === 'literal') {
      node.shape = 'box'
      node.borderRadius = 8
      node.font = { color: '#a31515' }
      node.widthConstraint = { minimum: 50, maximum: 200 }
    } else if (type === 'property') {
      node.shape = 'box'
      node.borderRadius = 8
      node.font = { color: '#0077aa', bold: true }
    } else if (type === 'class') {
      node.shape = 'box'
      node.borderRadius = 8
      node.font = { color: '#aa6600', bold: true }
    }

    return node
  }

  _createEdge(subject, predicate, object) {
    let edgeLabel = ''

    // Special case for rdf:type - display as "a" like in Turtle
    if (predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
      edgeLabel = 'a'
    } else {
      // Try to get prefixed form
      edgeLabel = URIUtils.shrinkUri(predicate, this.prefixes)

      // If that fails, use local name
      if (edgeLabel === predicate) {
        const parts = URIUtils.splitNamespace(predicate)
        edgeLabel = parts.name || edgeLabel
      }
    }

    this.edges.add({
      from: subject,
      to: object,
      label: edgeLabel,
      title: predicate, // Full URI on hover
      type: 'predicate',
      arrows: 'to',
      predicateUri: predicate,
      font: {
        size: 10,
        align: 'middle',
        face: 'sans-serif',
        multi: 'false'
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

  _handleNetworkClick(params) {
    if (params.nodes.length === 1) {
      const nodeId = params.nodes[0]

      // Check if it's a cluster
      if (this.network.isCluster(nodeId)) {
        // Open the cluster
        this.network.openCluster(nodeId)

        // Remove from our clusters list
        const index = this.clusters.findIndex(c => c.id === nodeId)
        if (index !== -1) {
          this.clusters.splice(index, 1)
        }
      } else {
        // Notify node selection
        this._notifyNodeSelection(nodeId)
      }
    } else {
      // No nodes selected - clear selection
      this._notifyNodeSelection(null)
    }
  }

  _notifyNodeSelection(nodeId) {
    this.nodeSelectCallbacks.forEach(callback => callback(nodeId))
  }

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

        // Try to find a good label for the cluster based on connected nodes
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

        // Track this cluster
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

    // Update current level after clustering
    if (this.clusters.length > 0) {
      this.clusterLevel = this.clusters[this.clusters.length - 1].clusterLevel
    }
  }

  _getClusterLabel(node) {
    const label = node.title != null ? node.title : node.label

    if (!label) return 'Cluster'

    // If label has a newline, take only the first line
    const newlineIndex = label.indexOf('\n')
    if (newlineIndex !== -1) {
      return label.substring(0, newlineIndex)
    }

    return label
  }

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

  _toggleHideDefaults() {
    // Remember current level
    const currentLevel = this.clusterLevel

    // Open all clusters to modify individual nodes
    while (this.clusterLevel > 0) {
      this._openClusters()
    }

    // Toggle visibility for standard vocabulary nodes
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

    // Notify network data has changed
    this.network.body.emitter.emit('_dataChanged')

    // Recreate clusters as needed
    this.clusterLevel = 0
    for (let i = 0; i < currentLevel; i++) {
      this._makeClusters()
    }
  }

  toggleFreeze() {
    this.options.freeze = !this.options.freeze

    this.network.stopSimulation()
    this.network.physics.options.enabled = !this.options.freeze
    this.network.startSimulation()
  }

  toggleHideDefaults() {
    this.options.hidden = !this.options.hidden
    this._toggleHideDefaults()
  }

  makeClusters() {
    this._makeClusters()
  }

  openClusters() {
    this._openClusters()
  }

  onNodeSelect(callback) {
    this.nodeSelectCallbacks.push(callback)
  }

  offNodeSelect(callback) {
    const index = this.nodeSelectCallbacks.indexOf(callback)
    if (index !== -1) {
      this.nodeSelectCallbacks.splice(index, 1)
    }
  }

  getNodes() {
    return this.nodes.get()
  }

  getEdges() {
    return this.edges.get()
  }
}