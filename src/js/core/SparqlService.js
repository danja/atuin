/**
 * @file SparqlService.js
 * Service for executing SPARQL queries against a given endpoint.
 */

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
   * @returns {Promise<object>} A promise that resolves with the JSON response from the endpoint or rejects with an error.
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

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded', // Standard for SPARQL POST requests
          'Accept': 'application/sparql-results+json' // Request JSON results
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

      const results = await response.json();
      this.logger.info('SPARQL query executed successfully.');
      this.logger.debug('Results:', results);
      return results;

    } catch (error) {
      this.logger.error('Error during SPARQL query execution:', error);
      // Re-throw the error so the caller can handle it
      throw error; 
    }
  }
}
