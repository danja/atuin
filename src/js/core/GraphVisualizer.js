import { Network } from 'vis-network/standalone/esm/vis-network.js'
import { DataSet } from 'vis-data/standalone/esm/vis-data.js'
import { RDFParser } from './Parser.js'
import { URIUtils } from '../utils/URIUtils.js'
import { eventBus, EVENTS } from 'evb'
import { Prefixes } from 'n3'
import rdf from '@rdfjs/data-model'
import PrefixMap from '@rdfjs/prefix-map'

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
      labelMaxLength: 20,
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

    // Listen for Turtle model sync events
    eventBus.on(EVENTS.MODEL_SYNCED, (content) => {
      this.updateGraph(content)
    })
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

    // Add a delay to let the container resize properly before fitting
    setTimeout(() => {
      this.network.fit({
        animation: {
          duration: 1000,
          easingFunction: 'easeOutQuint'
        },
        scale: 0.75 // Set a more reasonable initial zoom level
      })
    }, 300)

    this.network.on('click', this._handleNetworkClick.bind(this))

    this.logger.debug('Graph visualizer initialized')
  }

  async updateGraph(content) {
    try {
      const { triples, prefixes } = await this.parser.parseTriples(content)

      // Convert parsed prefixes to PrefixMap entries
      const prefixEntries = Object.entries(prefixes).map(([prefix, ns]) => [prefix, rdf.namedNode(ns)])
      this.prefixMap = new PrefixMap(prefixEntries, { factory: rdf })

      this.prefixes = { ...prefixes }
      this._inferPrefixes(triples)

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

  // Try to infer common prefixes from the data
  _inferPrefixes(triples) {
    const uriCounts = new Map()

    // Count URI namespaces
    for (const triple of triples) {
      this._countNamespace(triple.subject, uriCounts)
      this._countNamespace(triple.predicate, uriCounts)
      this._countNamespace(triple.object, uriCounts)
    }

    // Add common namespaces we should know about
    if (!this.prefixes['ex'] && !this.prefixes['example']) {
      const exNs = 'http://example.org/'
      if ([...uriCounts.keys()].some(ns => ns.includes('example.org'))) {
        this.prefixes['ex'] = exNs
      }
    }

    // Look for other common namespaces that might be missing a prefix
    const commonNamespaces = [...uriCounts.entries()]
      .filter(([ns, count]) => count >= 2 && !this._hasPrefix(ns))
      .sort((a, b) => b[1] - a[1])

    // Create prefixes for common namespaces
    for (let i = 0; i < commonNamespaces.length; i++) {
      const ns = commonNamespaces[i][0]
      if (ns.includes('example.org')) {
        this.prefixes['ex'] = ns
      } else if (ns.includes('schema.org')) {
        this.prefixes['schema'] = ns
      } else {
        // Extract a reasonable prefix from the namespace
        const prefixMatch = /\/\/([^./]+)/.exec(ns) || /\/([^./]+)/.exec(ns)
        if (prefixMatch) {
          const suggestedPrefix = prefixMatch[1].toLowerCase()
          if (!this.prefixes[suggestedPrefix]) {
            this.prefixes[suggestedPrefix] = ns
          }
        }
      }
    }
  }

  _countNamespace(term, uriCounts) {
    if (!term || URIUtils.isLiteral(term)) return

    const uri = term.value || term
    if (typeof uri !== 'string') return

    const parts = URIUtils.splitNamespace(uri)
    if (parts.namespace) {
      uriCounts.set(parts.namespace, (uriCounts.get(parts.namespace) || 0) + 1)
    }
  }

  _hasPrefix(namespace) {
    return Object.values(this.prefixes).some(ns => ns === namespace)
  }

  _createVisualization() {
    this.nodes.clear()
    this.edges.clear()

    const classes = new Set()
    const properties = new Set()

    // Enhanced handling of RDF type triples
    const rdfType = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
    const propertyTypes = [
      'http://www.w3.org/1999/02/22-rdf-syntax-ns#Property',
      'http://www.w3.org/2000/01/rdf-schema#Property',
      'http://www.w3.org/2002/07/owl#ObjectProperty',
      'http://www.w3.org/2002/07/owl#DatatypeProperty'
    ]
    const classTypes = [
      'http://www.w3.org/2000/01/rdf-schema#Class',
      'http://www.w3.org/2002/07/owl#Class'
    ]

    // First pass: identify classes and properties
    for (const triple of this.triples) {
      const subject = triple.subject
      const predicate = triple.predicate
      const object = triple.object

      // Check for class and property type declarations
      if (predicate.value === rdfType) {
        if (propertyTypes.includes(object.value)) {
          properties.add(subject.value)
        } else if (classTypes.includes(object.value)) {
          classes.add(subject.value)
        }
      }

      // Add properties directly - this allows us to identify them even without explicit typing
      if (predicate.value !== rdfType) {
        properties.add(predicate.value)
      }
    }

    // Second pass: create nodes and edges
    for (const triple of this.triples) {
      const subject = triple.subject
      const predicate = triple.predicate
      const object = triple.object

      // Create subject node if it doesn't exist
      if (!this.nodes.get(subject.value)) {
        let nodeType
        if (URIUtils.isLiteral(subject)) {
          nodeType = 'literal'
        } else if (classes.has(subject.value)) {
          nodeType = 'class'
        } else if (properties.has(subject.value)) {
          nodeType = 'property'
        } else {
          nodeType = 'subject'
        }
        this.nodes.add(this._createNode(subject.value, nodeType))
      }

      // Create property node (for visualization debugging)
      // Commented out since we don't normally show predicates as nodes
      // if (!this.nodes.get(predicate.value) && predicate.value !== rdfType) {
      //   this.nodes.add(this._createNode(predicate.value, 'property'))
      // }

      // Create object node if it doesn't exist
      if (!this.nodes.get(object.value)) {
        let nodeType
        if (URIUtils.isLiteral(object)) {
          nodeType = 'literal'
        } else if (classes.has(object.value)) {
          nodeType = 'class'
        } else if (properties.has(object.value)) {
          nodeType = 'property'
        } else {
          nodeType = 'object'
        }
        this.nodes.add(this._createNode(object.value, nodeType))
      }

      // Create edge with proper label
      this._createEdge(subject.value, predicate.value, object.value)
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
    let label
    let originalId = id

    // Handle term objects by extracting their value
    if (id && typeof id === 'object' && id.value) {
      id = id.value
    }

    if (URIUtils.isLiteral(id)) {
      // For literals, use the literal value but truncate if needed
      // Strip quotes from literals for display
      if (typeof id === 'string' && id.startsWith('"') && id.endsWith('"')) {
        label = id.substring(1, id.length - 1)
      } else {
        label = id
      }

      if (label.length > this.options.labelMaxLength) {
        label = label.substring(0, this.options.labelMaxLength - 3) + '...'
      }
    } else {
      // Use PrefixMap for prefix abbreviation, fallback to local name
      let nn = typeof id === 'string' ? rdf.namedNode(id) : id
      const shrunk = this.prefixMap.shrink(nn)
      if (shrunk && shrunk.value && shrunk.value.includes(':') && !shrunk.value.includes('://')) {
        label = shrunk.value // CURIE
      } else {
        // fallback: extract local name
        const uri = nn.value || nn
        const hash = uri.lastIndexOf('#')
        const slash = uri.lastIndexOf('/')
        const pos = Math.max(hash, slash)
        label = uri.substring(pos + 1)
      }

      // If the local name is still too long, truncate it
      if (label.length > this.options.labelMaxLength) {
        label = label.substring(0, this.options.labelMaxLength - 3) + '...'
      }
    }

    const node = {
      id: originalId,
      label,
      title: id // Full URI on hover
    }

    if (type === 'literal') {
      node.shape = 'box'
      node.borderRadius = 8
      node.font = { color: '#a31515', background: '#fff' }
      node.widthConstraint = { minimum: 50, maximum: 200 }
      node.color = this.colors.literal
    } else if (type === 'property') {
      node.shape = 'ellipse'
      node.color = this.colors.property
    } else if (type === 'class') {
      node.shape = 'ellipse'
      node.color = this.colors.class
    } else if (type === 'subject') {
      node.shape = 'ellipse'
      node.color = this.colors.subject
    } else if (type === 'object') {
      node.shape = 'ellipse'
      node.color = this.colors.object
    }

    return node
  }

  _createEdge(subject, predicate, object) {
    let edgeLabel = ''
    let predicateValue = predicate

    // Handle term objects by extracting their value
    if (predicate && typeof predicate === 'object' && predicate.value) {
      predicateValue = predicate.value
    }

    if (predicateValue === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
      edgeLabel = 'a'
    } else {
      // Use PrefixMap for prefix abbreviation, fallback to local name
      let nn = typeof predicateValue === 'string' ? rdf.namedNode(predicateValue) : predicateValue
      const shrunk = this.prefixMap.shrink(nn)
      if (shrunk && shrunk.value && shrunk.value.includes(':') && !shrunk.value.includes('://')) {
        edgeLabel = shrunk.value // CURIE
      } else {
        // fallback: extract local name
        const uri = nn.value || nn
        const hash = uri.lastIndexOf('#')
        const slash = uri.lastIndexOf('/')
        const pos = Math.max(hash, slash)
        edgeLabel = uri.substring(pos + 1)
      }
    }

    this.edges.add({
      from: subject,
      to: object,
      label: edgeLabel,
      title: predicateValue, // Full URI on hover
      type: 'predicate',
      arrows: 'to',
      predicateUri: predicateValue,
      font: {
        size: 10,
        align: 'middle',
        face: 'sans-serif',
        background: 'rgba(255, 255, 255, 0.8)',
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
    return this.edges
  }
  
  /**
   * Resizes and fits the network visualization to the container
   * Helpful when the container size changes (like when tabs are switched)
   */
  resizeAndFit() {
    if (this.network) {
      this.network.redraw()
      this.network.fit({
        animation: {
          duration: 500,
          easingFunction: 'easeOutQuint'
        },
        scale: 0.75 // Set a consistent zoom level
      })
    }
  }
  
  /**
   * Set the size of all nodes in the network
   * @param {number} size - The size to set for all nodes
   */
  setNodeSize(size) {
    if (!this.network || !this.nodes) return
    
    // Store the global node size setting for future nodes
    this.nodeSize = size
    
    // Update all existing nodes
    const allNodes = this.nodes.get()
    const updates = []
    
    for (const node of allNodes) {
      // Create a deep copy of the node to avoid reference issues
      const nodeCopy = {...node}
      // Set the size directly on the node object
      nodeCopy.size = size
      // For box-shaped nodes, also set width and height
      if (node.shape === 'box' || node.shape === 'box') {
        nodeCopy.width = size * 2.5
        nodeCopy.height = size * 1.5
      }
      updates.push(nodeCopy)
    }
    
    // Update all nodes in a single batch operation
    if (updates.length > 0) {
      this.nodes.update(updates)
      // Redraw the network to apply changes
      setTimeout(() => {
        this.network.redraw()
      }, 50)
    }
    
    return true
  }
}