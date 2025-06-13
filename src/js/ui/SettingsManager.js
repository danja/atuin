/**
 * Manages application settings and preferences
 */
export class SettingsManager {
  /**
   * Initialize the settings manager
   * @param {Object} options - Configuration options
   * @param {Object} options.visualizer - Graph visualizer instance
   * @param {Object} options.editor - Editor instance
   * @param {Object} options.sparqlEditor - SPARQL editor instance
   * @param {Object} options.logger - Logger service
   */
  constructor(options) {
    this.visualizer = options.visualizer
    this.editor = options.editor
    this.sparqlEditor = options.sparqlEditor
    this.logger = options.logger
    
    // References to settings controls
    this.controls = {
      nodeSize: document.getElementById('node-size'),
      edgeWidth: document.getElementById('edge-width'),
      physicsEnabled: document.getElementById('physics-enabled'),
      fontSize: document.getElementById('font-size'),
      autoComplete: document.getElementById('auto-complete'),
      sparqlEndpointUrl: document.getElementById('sparql-endpoint-url'),
      addSparqlEndpointBtn: document.getElementById('add-sparql-endpoint'),
      sparqlEndpointSelect: document.getElementById('sparql-endpoint-select'),
      removeSparqlEndpointBtn: document.getElementById('remove-sparql-endpoint')
    };

    this.sparqlEndpoints = [];
    this.activeSparqlEndpoint = null;
    this.localStorageKeys = {
      endpoints: 'sparqlEndpoints',
      activeEndpoint: 'activeSparqlEndpoint'
    };
    
    this.initializeListeners();
    this.loadSparqlEndpoints();
  }
  
  /**
   * Initialize event listeners for settings controls
   */
  initializeListeners() {
    // Visualization settings
    if (this.controls.nodeSize) {
      this.controls.nodeSize.addEventListener('input', this.updateNodeSize.bind(this))
    }
    
    if (this.controls.edgeWidth) {
      this.controls.edgeWidth.addEventListener('input', this.updateEdgeWidth.bind(this))
    }
    
    if (this.controls.physicsEnabled) {
      this.controls.physicsEnabled.addEventListener('change', this.togglePhysics.bind(this))
    }
    
    // Editor settings
    if (this.controls.fontSize) {
      this.controls.fontSize.addEventListener('change', this.updateFontSize.bind(this))
    }
    
    if (this.controls.autoComplete) {
      this.controls.autoComplete.addEventListener('change', this.toggleAutoComplete.bind(this))
    }
    
    this.logger.debug('Settings manager initialized');

    // SPARQL Endpoint listeners
    if (this.controls.addSparqlEndpointBtn) {
      this.controls.addSparqlEndpointBtn.addEventListener('click', this.addSparqlEndpoint.bind(this));
    }
    if (this.controls.removeSparqlEndpointBtn) {
      this.controls.removeSparqlEndpointBtn.addEventListener('click', this.removeSparqlEndpoint.bind(this));
    }
    if (this.controls.sparqlEndpointSelect) {
      this.controls.sparqlEndpointSelect.addEventListener('change', this.updateActiveSparqlEndpoint.bind(this));
    }
  }
  
  /**
   * Update node size in visualization
   */
  updateNodeSize() {
    if (!this.visualizer) return
    
    const size = parseInt(this.controls.nodeSize.value, 10)
    
    // Update the display value
    const sizeDisplay = document.getElementById('node-size-value')
    if (sizeDisplay) {
      sizeDisplay.textContent = size
    }
    
    // Use the dedicated method in GraphVisualizer
    if (this.visualizer.setNodeSize) {
      const success = this.visualizer.setNodeSize(size)
      if (success) {
        this.logger.debug(`Node size updated to ${size}`)
      } else {
        this.logger.warn(`Failed to update node size to ${size}`)
      }
    } else {
      this.logger.warn('The visualizer does not support setNodeSize method')
    }
  }
  
  /**
   * Update edge width in visualization
   */
  updateEdgeWidth() {
    if (!this.visualizer || !this.visualizer.network) return
    
    const width = parseInt(this.controls.edgeWidth.value, 10)
    
    // Update the global options for future edges
    const options = {
      edges: {
        width: width
      }
    }
    this.visualizer.network.setOptions(options)
    
    // Update existing edges
    if (this.visualizer.edges) {
      const edgeIds = this.visualizer.edges.getIds()
      const updates = edgeIds.map(id => ({
        id: id,
        width: width
      }))
      
      // Apply updates to all edges
      if (updates.length > 0) {
        this.visualizer.edges.update(updates)
      }
    }
    
    this.logger.debug(`Edge width updated to ${width}`)
  }
  
  /**
   * Toggle physics simulation
   */
  togglePhysics() {
    if (!this.visualizer || !this.visualizer.network) return
    
    const enabled = this.controls.physicsEnabled.checked
    const options = {
      physics: {
        enabled: enabled
      }
    }
    
    this.visualizer.network.setOptions(options)
    this.logger.debug(`Physics ${enabled ? 'enabled' : 'disabled'}`)
  }
  
  /**
   * Update font size in editors
   */
  updateFontSize() {
    if (!this.editor || !this.sparqlEditor) return
    
    const fontSize = this.controls.fontSize.value
    
    // Apply font size to editor containers
    const turtleEditorPane = document.getElementById('turtle-editor-pane')
    const sparqlEditorPane = document.getElementById('sparql-editor-pane')
    
    if (turtleEditorPane) {
      const cmElements = turtleEditorPane.querySelectorAll('.cm-content')
      cmElements.forEach(el => {
        el.style.fontSize = `${fontSize}px`
      })
    }
    
    if (sparqlEditorPane) {
      const cmElements = sparqlEditorPane.querySelectorAll('.cm-content')
      cmElements.forEach(el => {
        el.style.fontSize = `${fontSize}px`
      })
    }
    
    this.logger.debug(`Font size updated to ${fontSize}px`)
  }
  
  /**
   * Toggle auto-complete functionality
   * Note: This requires additional implementation to fully work
   */
  toggleAutoComplete() {
    const enabled = this.controls.autoComplete.checked
    this.logger.debug(`Auto-complete ${enabled ? 'enabled' : 'disabled'}`)
    
    // This is a placeholder for future auto-complete implementation
    if (enabled) {
      this.logger.info('Auto-complete feature enabled')
    } else {
      this.logger.info('Auto-complete feature disabled')
    }
  }
  
  /**
   * Apply all current settings
   */
  applyAllSettings() {
    this.updateNodeSize();
    this.updateEdgeWidth();
    this.togglePhysics();
    this.updateFontSize();
    this.toggleAutoComplete();
    // Active SPARQL endpoint is applied on load/change, no explicit applyAll needed here yet.
  }

  // --- SPARQL Endpoint Management ---

  loadSparqlEndpoints() {
    const storedEndpoints = localStorage.getItem(this.localStorageKeys.endpoints);
    const storedActiveEndpoint = localStorage.getItem(this.localStorageKeys.activeEndpoint);

    if (storedEndpoints) {
      this.sparqlEndpoints = JSON.parse(storedEndpoints);
    } else {
      // Initialize with default endpoints for first-time users
      this.sparqlEndpoints = this.getDefaultEndpoints();
      this.saveSparqlEndpoints();
      this.logger.debug(`Initialized with ${this.sparqlEndpoints.length} default SPARQL endpoints`);
    }
    
    // Set active endpoint - use stored value or default to first endpoint
    this.activeSparqlEndpoint = storedActiveEndpoint || (this.sparqlEndpoints.length > 0 ? this.sparqlEndpoints[0] : null);
    
    // Save the active endpoint if it was defaulted
    if (!storedActiveEndpoint && this.activeSparqlEndpoint) {
      this.saveActiveSparqlEndpoint();
    }

    this.populateSparqlEndpointSelect();
    this.logger.debug('SPARQL endpoints loaded from localStorage');
  }

  /**
   * Get default SPARQL endpoints for first-time initialization
   * @returns {Array<string>} Array of default endpoint URLs
   */
  getDefaultEndpoints() {
    return [
      'https://query.wikidata.org/sparql',
      'https://dbpedia.org/sparql'
    ];
  }

  saveSparqlEndpoints() {
    localStorage.setItem(this.localStorageKeys.endpoints, JSON.stringify(this.sparqlEndpoints));
    this.logger.debug('SPARQL endpoints saved to localStorage');
  }

  saveActiveSparqlEndpoint() {
    if (this.activeSparqlEndpoint) {
      localStorage.setItem(this.localStorageKeys.activeEndpoint, this.activeSparqlEndpoint);
      this.logger.debug(`Active SPARQL endpoint saved: ${this.activeSparqlEndpoint}`);
    } else {
      localStorage.removeItem(this.localStorageKeys.activeEndpoint);
      this.logger.debug('Active SPARQL endpoint cleared from localStorage');
    }
  }

  populateSparqlEndpointSelect() {
    if (!this.controls.sparqlEndpointSelect) return;

    this.controls.sparqlEndpointSelect.innerHTML = ''; // Clear existing options

    if (this.sparqlEndpoints.length === 0) {
      const option = document.createElement('option');
      option.textContent = 'No endpoints configured';
      option.disabled = true;
      this.controls.sparqlEndpointSelect.appendChild(option);
    } else {
      this.sparqlEndpoints.forEach(endpoint => {
        const option = document.createElement('option');
        option.value = endpoint;
        option.textContent = endpoint;
        if (endpoint === this.activeSparqlEndpoint) {
          option.selected = true;
        }
        this.controls.sparqlEndpointSelect.appendChild(option);
      });
    }
    // Ensure the active endpoint reflects the selection, especially if the list was empty
    if (this.sparqlEndpoints.length > 0 && !this.activeSparqlEndpoint && this.controls.sparqlEndpointSelect.value) {
        this.activeSparqlEndpoint = this.controls.sparqlEndpointSelect.value;
    } else if (this.sparqlEndpoints.length === 0) {
        this.activeSparqlEndpoint = null;
    }
    this.saveActiveSparqlEndpoint();
  }

  addSparqlEndpoint() {
    if (!this.controls.sparqlEndpointUrl) return;
    const url = this.controls.sparqlEndpointUrl.value.trim();

    if (!url) {
      this.logger.warn('SPARQL endpoint URL is empty.');
      // Optionally, provide user feedback here (e.g., alert or message)
      return;
    }

    try {
      new URL(url); // Validate URL format
    } catch (e) {
      this.logger.warn(`Invalid SPARQL endpoint URL: ${url}`);
      // Optionally, provide user feedback
      return;
    }

    if (this.sparqlEndpoints.includes(url)) {
      this.logger.info(`SPARQL endpoint already exists: ${url}`);
      // Optionally, provide user feedback
      return;
    }

    this.sparqlEndpoints.push(url);
    if (!this.activeSparqlEndpoint) { // If no endpoint was active, make this one active
        this.activeSparqlEndpoint = url;
    }
    this.saveSparqlEndpoints();
    this.populateSparqlEndpointSelect();
    this.controls.sparqlEndpointUrl.value = ''; // Clear input field
    this.logger.info(`SPARQL endpoint added: ${url}`);
  }

  removeSparqlEndpoint() {
    if (!this.controls.sparqlEndpointSelect || this.sparqlEndpoints.length === 0) return;

    const selectedEndpoint = this.controls.sparqlEndpointSelect.value;
    if (!selectedEndpoint || !this.sparqlEndpoints.includes(selectedEndpoint)) {
        this.logger.warn('No valid endpoint selected for removal.');
        return;
    }

    this.sparqlEndpoints = this.sparqlEndpoints.filter(ep => ep !== selectedEndpoint);
    this.logger.info(`SPARQL endpoint removed: ${selectedEndpoint}`);
    
    if (this.activeSparqlEndpoint === selectedEndpoint) {
      this.activeSparqlEndpoint = this.sparqlEndpoints.length > 0 ? this.sparqlEndpoints[0] : null;
    }

    this.saveSparqlEndpoints();
    this.populateSparqlEndpointSelect(); 
    // The populateSparqlEndpointSelect will call saveActiveSparqlEndpoint
  }

  updateActiveSparqlEndpoint() {
    if (!this.controls.sparqlEndpointSelect) return;
    const selectedValue = this.controls.sparqlEndpointSelect.value;
    // Check if the selected value is a valid endpoint or the 'No endpoints configured' message
    if (this.sparqlEndpoints.includes(selectedValue)){
        this.activeSparqlEndpoint = selectedValue;
        this.logger.info(`Active SPARQL endpoint updated: ${this.activeSparqlEndpoint}`);
    } else if (this.sparqlEndpoints.length === 0){
        this.activeSparqlEndpoint = null;
         this.logger.info('Active SPARQL endpoint cleared as no endpoints are available.');
    }
    this.saveActiveSparqlEndpoint();
  }

  getActiveSparqlEndpoint() {
    return this.activeSparqlEndpoint;
  }
}
