import { eventBus, EVENTS } from 'evb';

/**
 * Manages SPARQL endpoint selection and persistence
 * @since 0.2.0
 */
export class SPARQLEndpointManager {
  /**
   * Create a new SPARQLEndpointManager
   * @param {Object} options - Configuration options
   * @param {Object} options.logger - Logger service
   * @param {string} [options.storageKey='sparqlEndpoints'] - LocalStorage key for endpoints
   * @param {string} [options.activeEndpointKey='activeSparqlEndpoint'] - LocalStorage key for active endpoint
   * @param {Array<string>} [options.defaultEndpoints=[]] - Default endpoints to use if none are stored
   */
  constructor({
    logger,
    storageKey = 'sparqlEndpoints',
    activeEndpointKey = 'activeSparqlEndpoint',
    defaultEndpoints = []
  } = {}) {
    this.logger = logger || console;
    this.storageKey = storageKey;
    this.activeEndpointKey = activeEndpointKey;
    this.defaultEndpoints = defaultEndpoints;
    this.endpoints = [];
    this.activeEndpoint = null;
    
    // Initialize
    this.loadEndpoints();
  }
  
  /**
   * Get all available endpoints
   * @returns {Array<string>} List of endpoint URLs
   */
  getEndpoints() {
    return [...this.endpoints];
  }
  
  /**
   * Get the currently active endpoint
   * @returns {string|null} Active endpoint URL or null if none set
   */
  getActiveEndpoint() {
    return this.activeEndpoint;
  }
  
  /**
   * Load endpoints from localStorage
   * @private
   */
  loadEndpoints() {
    try {
      const storedEndpoints = localStorage.getItem(this.storageKey);
      const storedActiveEndpoint = localStorage.getItem(this.activeEndpointKey);
      
      if (storedEndpoints) {
        this.endpoints = JSON.parse(storedEndpoints);
      } else {
        this.endpoints = [...this.defaultEndpoints];
        this.saveEndpoints();
      }
      
      this.activeEndpoint = storedActiveEndpoint || 
                          (this.endpoints.length > 0 ? this.endpoints[0] : null);
      
      if (!storedActiveEndpoint && this.activeEndpoint) {
        this.saveActiveEndpoint();
      }
      
      this.logger.debug('SPARQL endpoints loaded');
      return this.endpoints;
    } catch (error) {
      this.logger.error('Failed to load SPARQL endpoints', error);
      return [];
    }
  }
  
  /**
   * Save endpoints to localStorage
   * @private
   */
  saveEndpoints() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.endpoints));
      this.logger.debug('SPARQL endpoints saved');
      return true;
    } catch (error) {
      this.logger.error('Failed to save SPARQL endpoints', error);
      return false;
    }
  }
  
  /**
   * Save the active endpoint to localStorage
   * @private
   */
  saveActiveEndpoint() {
    try {
      if (this.activeEndpoint) {
        localStorage.setItem(this.activeEndpointKey, this.activeEndpoint);
        this.logger.debug(`Active SPARQL endpoint saved: ${this.activeEndpoint}`);
      } else {
        localStorage.removeItem(this.activeEndpointKey);
        this.logger.debug('Active SPARQL endpoint cleared');
      }
      return true;
    } catch (error) {
      this.logger.error('Failed to save active SPARQL endpoint', error);
      return false;
    }
  }
  
  /**
   * Set the active endpoint
   * @param {string} endpoint - The endpoint URL to set as active
   * @returns {boolean} True if successful, false otherwise
   */
  setActiveEndpoint(endpoint) {
    if (endpoint === null || this.endpoints.includes(endpoint)) {
      this.activeEndpoint = endpoint;
      this.saveActiveEndpoint();
      eventBus.emit(EVENTS.ENDPOINT_UPDATED, { endpoint });
      return true;
    }
    return false;
  }
  
  /**
   * Add a new endpoint
   * @param {string} endpoint - The endpoint URL to add
   * @returns {boolean} True if added, false if already exists or invalid
   */
  addEndpoint(endpoint) {
    try {
      // Clean up the endpoint URL
      const cleanEndpoint = endpoint.trim();
      
      // Validate URL
      try {
        new URL(cleanEndpoint);
      } catch (e) {
        this.logger.warn(`Invalid SPARQL endpoint URL: ${cleanEndpoint}`);
        return false;
      }
      
      // Check for duplicates
      if (this.endpoints.includes(cleanEndpoint)) {
        this.logger.debug(`SPARQL endpoint already exists: ${cleanEndpoint}`);
        return false;
      }
      
      // Add the endpoint
      this.endpoints.push(cleanEndpoint);
      this.saveEndpoints();
      
      // If this is the first endpoint, set it as active
      if (this.endpoints.length === 1) {
        this.setActiveEndpoint(cleanEndpoint);
      }
      
      this.logger.info(`Added SPARQL endpoint: ${cleanEndpoint}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to add SPARQL endpoint', error);
      return false;
    }
  }
  
  /**
   * Remove an endpoint
   * @param {string} endpoint - The endpoint URL to remove
   * @returns {boolean} True if removed, false if not found
   */
  removeEndpoint(endpoint) {
    const index = this.endpoints.indexOf(endpoint);
    if (index === -1) return false;
    
    const wasActive = this.activeEndpoint === endpoint;
    
    // Remove the endpoint
    this.endpoints.splice(index, 1);
    this.saveEndpoints();
    
    // If we removed the active endpoint, update it
    if (wasActive) {
      this.activeEndpoint = this.endpoints.length > 0 ? this.endpoints[0] : null;
      this.saveActiveEndpoint();
    }
    
    this.logger.info(`Removed SPARQL endpoint: ${endpoint}`);
    return true;
  }
}
