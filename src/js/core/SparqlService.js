/**
 * @file SparqlService.js
 * Service for executing SPARQL queries against a given endpoint.
 */

import { eventBus, EVENTS } from 'evb';

export class SparqlService {
  /**
   * Creates a new SparqlService.
   * @param {LoggerService} logger - The logger service instance.
   */
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Executes a SPARQL query against the specified endpoint.
   * @param {string} query - The SPARQL query string.
   * @param {string} endpoint - The URL of the SPARQL endpoint.
   * @returns {Promise<object>} A promise that resolves with the response from the endpoint or rejects with an error.
   */
  async executeQuery(query, endpoint) {
    this.logger.info(`Executing query on endpoint: ${endpoint}`);
    this.logger.debug(`Query:\n${query}`);

    if (!endpoint) {
      this.logger.error('Endpoint URL is missing.');
      return Promise.reject(new Error('SPARQL endpoint URL is required.'));
    }
    if (!query || query.trim() === '') {
        this.logger.error('SPARQL query is empty.');
        return Promise.reject(new Error('SPARQL query cannot be empty.'));
    }

    // Determine query type to set appropriate Accept header
    const queryType = this._detectQueryType(query);
    const acceptHeader = queryType === 'CONSTRUCT' || queryType === 'DESCRIBE' 
      ? 'text/turtle, application/rdf+xml, application/n-triples, text/n3, application/trig, application/rdf+json, application/sparql-results+json' 
      : 'application/sparql-results+json';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded', // Standard for SPARQL POST requests
          'Accept': acceptHeader
        },
        // SPARQL query is typically sent as a URL-encoded parameter named 'query'
        body: `query=${encodeURIComponent(query)}` 
      });

      if (!response.ok) {
        let errorDetails = `HTTP error ${response.status}`;
        try {
            const errorText = await response.text();
            errorDetails += ` - ${errorText}`;
        } catch (e) {
            // Ignore if can't read error text
        }
        this.logger.error(`Failed to execute SPARQL query: ${errorDetails}`);
        throw new Error(`Failed to execute SPARQL query: ${errorDetails}`);
      }

      // Handle different response types based on content-type
      const contentType = response.headers.get('content-type') || '';
      
      // Enhanced logging to debug content-type detection
      this.logger.info(`Response content-type: "${contentType}"`);
      this.logger.info(`Query type detected: ${queryType}`);
      this.logger.info(`Accept header sent: ${acceptHeader}`);
      
      if (this._isRdfContentType(contentType)) {
        // Handle RDF response - route to turtle editor and graph visualization
        const rdfContent = await response.text();
        this.logger.info(`SPARQL CONSTRUCT/DESCRIBE query executed successfully - routing RDF (${contentType}) to editor/graph`);
        this.logger.debug('RDF content:', rdfContent);
        
        // Emit MODEL_SYNCED event to update turtle editor and graph visualization
        eventBus.emit(EVENTS.MODEL_SYNCED, rdfContent);
        
        return {
          type: 'rdf',
          content: rdfContent,
          contentType: contentType,
          message: `CONSTRUCT/DESCRIBE results (${contentType}) loaded into turtle editor and graph visualization`
        };
      } else {
        // Handle JSON response (SELECT, ASK queries)
        const results = await response.json();
        this.logger.info('SPARQL query executed successfully.');
        this.logger.debug('Results:', results);
        return results;
      }

    } catch (error) {
      this.logger.error('Error during SPARQL query execution:', error);
      // Re-throw the error so the caller can handle it
      throw error; 
    }
  }

  /**
   * Detects the type of SPARQL query
   * @private
   * @param {string} query - The SPARQL query string
   * @returns {string} Query type ('SELECT', 'ASK', 'CONSTRUCT', 'DESCRIBE', 'INSERT', 'DELETE')
   */
  _detectQueryType(query) {
    const trimmedQuery = query.trim().toUpperCase();
    
    if (trimmedQuery.startsWith('SELECT')) return 'SELECT';
    if (trimmedQuery.startsWith('ASK')) return 'ASK';
    if (trimmedQuery.startsWith('CONSTRUCT')) return 'CONSTRUCT';
    if (trimmedQuery.startsWith('DESCRIBE')) return 'DESCRIBE';
    if (trimmedQuery.startsWith('INSERT')) return 'INSERT';
    if (trimmedQuery.startsWith('DELETE')) return 'DELETE';
    
    // Default to SELECT if cannot detect
    return 'SELECT';
  }

  /**
   * Checks if a content-type indicates RDF data that should be routed to the turtle editor
   * @private
   * @param {string} contentType - The content-type header value
   * @returns {boolean} True if the content-type indicates RDF data
   */
  _isRdfContentType(contentType) {
    const lowercaseType = contentType.toLowerCase();
    
    // Common RDF media types returned by SPARQL endpoints for CONSTRUCT/DESCRIBE queries
    const rdfMediaTypes = [
      'text/turtle',           // Most common turtle format
      'application/turtle',    // Alternative turtle media type  
      'application/rdf+xml',   // RDF/XML format (often default)
      'application/n-triples', // N-Triples format
      'text/n3',              // Notation3 format
      'application/trig',      // TriG format (Turtle for named graphs)
      'application/rdf+json',  // RDF/JSON format
      'text/plain'            // Sometimes used for N-Triples
    ];
    
    return rdfMediaTypes.some(mediaType => lowercaseType.includes(mediaType));
  }
}
