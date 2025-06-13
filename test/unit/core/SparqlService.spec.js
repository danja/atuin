// test/unit/core/SparqlService.spec.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SparqlService } from '../../../src/js/core/SparqlService';
import { eventBus, EVENTS } from 'evb';

// Mock LoggerService
const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe('SparqlService', () => {
  let sparqlService;

  beforeEach(() => {
    sparqlService = new SparqlService(mockLogger);
    // Reset mocks before each test
    vi.resetAllMocks(); // Resets and restores all mocks
    // Re-spy on global fetch after reset if needed, or ensure it's setup per test.
    // For this structure, fetch is mocked per test or per describe block if consistently mocked.
  });

  // It's often better to mock fetch once if its behavior is consistent across tests in a describe block,
  // or mock it inside beforeEach/it if it varies significantly.
  // Here, we'll mock fetch inside tests where it's called.

  it('should be instantiated with a logger', () => {
    // Re-initialize for this specific test to ensure clean state for logger assignment check
    sparqlService = new SparqlService(mockLogger); 
    expect(sparqlService.logger).toBe(mockLogger);
  });

  describe('executeQuery', () => {
    const mockQuery = 'SELECT * WHERE { ?s ?p ?o }';
    const mockEndpoint = 'http://example.com/sparql';

    beforeEach(() => {
        // Spy on global fetch before each test in this describe block
        vi.spyOn(global, 'fetch');
    });

    afterEach(() => {
        // Restore fetch mock after each test to avoid interference
        vi.restoreAllMocks(); // This will also clear call history for fetch
        // Clear logger mocks explicitly as they are defined outside and reused
        mockLogger.info.mockClear();
        mockLogger.debug.mockClear();
        mockLogger.warn.mockClear();
        mockLogger.error.mockClear();
    });

    it('should reject if endpoint is not provided', async () => {
      await expect(sparqlService.executeQuery(mockQuery, null)).rejects.toThrow('SPARQL endpoint URL is required.');
      expect(mockLogger.error).toHaveBeenCalledWith('Endpoint URL is missing.');
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should reject if query is empty', async () => {
      await expect(sparqlService.executeQuery('', mockEndpoint)).rejects.toThrow('SPARQL query cannot be empty.');
      expect(mockLogger.error).toHaveBeenCalledWith('SPARQL query is empty.');
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should reject if query is whitespace', async () => {
      await expect(sparqlService.executeQuery('   ', mockEndpoint)).rejects.toThrow('SPARQL query cannot be empty.');
      expect(mockLogger.error).toHaveBeenCalledWith('SPARQL query is empty.');
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should execute a query successfully and return JSON results', async () => {
      const mockResults = { data: 'some data' };
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResults,
        text: async () => '',
        headers: {
          get: vi.fn().mockReturnValue('application/json')
        }
      });

      const results = await sparqlService.executeQuery(mockQuery, mockEndpoint);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(mockEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/sparql-results+json'
        },
        body: `query=${encodeURIComponent(mockQuery)}`
      });
      expect(results).toEqual(mockResults);
      expect(mockLogger.info).toHaveBeenCalledWith(`Executing query on endpoint: ${mockEndpoint}`);
      expect(mockLogger.debug).toHaveBeenCalledWith(`Query:\n${mockQuery}`);
      expect(mockLogger.info).toHaveBeenCalledWith('SPARQL query executed successfully.');
      expect(mockLogger.debug).toHaveBeenCalledWith('Results:', mockResults);
    });

    it('should reject on HTTP error', async () => {
      const errorStatus = 400;
      const errorText = 'Bad Request';
      global.fetch.mockResolvedValue({
        ok: false,
        status: errorStatus,
        text: async () => errorText
      });

      await expect(sparqlService.executeQuery(mockQuery, mockEndpoint)).rejects.toThrow(`Failed to execute SPARQL query: HTTP error ${errorStatus} - ${errorText}`);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(`Failed to execute SPARQL query: HTTP error ${errorStatus} - ${errorText}`);
      expect(mockLogger.error).toHaveBeenCalledWith('Error during SPARQL query execution:', expect.any(Error));
    });
    
    it('should reject on HTTP error when response text cannot be read', async () => {
        const errorStatus = 500;
        global.fetch.mockResolvedValue({
          ok: false,
          status: errorStatus,
          text: async () => { throw new Error("Cannot read text"); }
        });
  
        await expect(sparqlService.executeQuery(mockQuery, mockEndpoint)).rejects.toThrow(`Failed to execute SPARQL query: HTTP error ${errorStatus}`);
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(mockLogger.error).toHaveBeenCalledWith(`Failed to execute SPARQL query: HTTP error ${errorStatus}`);
        expect(mockLogger.error).toHaveBeenCalledWith('Error during SPARQL query execution:', expect.any(Error));
    });

    it('should reject if fetch throws an error (network failure)', async () => {
      const networkError = new Error('Network failure');
      global.fetch.mockRejectedValue(networkError);

      await expect(sparqlService.executeQuery(mockQuery, mockEndpoint)).rejects.toThrow('Network failure');
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith('Error during SPARQL query execution:', networkError);
    });

    it('should reject if response is not JSON', async () => {
        const notJsonError = new TypeError("Failed to parse JSON"); // Simulating a more realistic JSON parsing error
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => { throw notJsonError; },
            text: async () => 'this is not json',
            headers: {
              get: vi.fn().mockReturnValue('application/json')
            }
        });

        await expect(sparqlService.executeQuery(mockQuery, mockEndpoint)).rejects.toThrow(notJsonError);
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(mockLogger.error).toHaveBeenCalledWith('Error during SPARQL query execution:', notJsonError);
    });

    it('should handle CONSTRUCT queries with turtle content-type', async () => {
      const constructQuery = 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }';
      const mockTurtleContent = '@prefix ex: <http://example.org/> .\nex:subject ex:predicate ex:object .';
      
      // Mock eventBus.emit
      const eventBusSpy = vi.spyOn(eventBus, 'emit');
      
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => mockTurtleContent,
        headers: {
          get: vi.fn().mockReturnValue('text/turtle')
        }
      });

      const result = await sparqlService.executeQuery(constructQuery, mockEndpoint);

      expect(global.fetch).toHaveBeenCalledWith(mockEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'text/turtle, application/rdf+xml, application/n-triples, text/n3, application/trig, application/rdf+json, application/sparql-results+json'
        },
        body: `query=${encodeURIComponent(constructQuery)}`
      });
      
      expect(result).toEqual({
        type: 'rdf',
        content: mockTurtleContent,
        contentType: 'text/turtle',
        message: 'CONSTRUCT/DESCRIBE results (text/turtle) loaded into turtle editor and graph visualization'
      });
      
      expect(eventBusSpy).toHaveBeenCalledWith(EVENTS.MODEL_SYNCED, mockTurtleContent);
      expect(mockLogger.info).toHaveBeenCalledWith('SPARQL CONSTRUCT/DESCRIBE query executed successfully - routing RDF (text/turtle) to editor/graph');
      
      eventBusSpy.mockRestore();
    });

    it('should handle CONSTRUCT queries with various RDF content-types', async () => {
      const constructQuery = 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }';
      const mockRdfContent = '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"></rdf:RDF>';
      
      const testCases = [
        'application/rdf+xml',
        'application/n-triples', 
        'text/n3',
        'application/trig',
        'application/rdf+json',
        'text/plain'
      ];

      for (const contentType of testCases) {
        // Reset mocks for each iteration
        vi.clearAllMocks();
        const eventBusSpy = vi.spyOn(eventBus, 'emit');
        
        global.fetch.mockResolvedValue({
          ok: true,
          text: async () => mockRdfContent,
          headers: {
            get: vi.fn().mockReturnValue(contentType)
          }
        });

        const result = await sparqlService.executeQuery(constructQuery, mockEndpoint);

        expect(result.type).toBe('rdf');
        expect(result.content).toBe(mockRdfContent);
        expect(result.contentType).toBe(contentType);
        expect(eventBusSpy).toHaveBeenCalledWith(EVENTS.MODEL_SYNCED, mockRdfContent);
        
        eventBusSpy.mockRestore();
      }
    });

    it('should use appropriate Accept header for CONSTRUCT queries', async () => {
      const constructQuery = 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }';
      
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => '',
        headers: {
          get: vi.fn().mockReturnValue('text/turtle')
        }
      });

      await sparqlService.executeQuery(constructQuery, mockEndpoint);

      expect(global.fetch).toHaveBeenCalledWith(mockEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'text/turtle, application/rdf+xml, application/n-triples, text/n3, application/trig, application/rdf+json, application/sparql-results+json'
        },
        body: `query=${encodeURIComponent(constructQuery)}`
      });
    });

    it('should use appropriate Accept header for DESCRIBE queries', async () => {
      const describeQuery = 'DESCRIBE <http://example.org/resource>';
      
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => '',
        headers: {
          get: vi.fn().mockReturnValue('text/turtle')
        }
      });

      await sparqlService.executeQuery(describeQuery, mockEndpoint);

      expect(global.fetch).toHaveBeenCalledWith(mockEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'text/turtle, application/rdf+xml, application/n-triples, text/n3, application/trig, application/rdf+json, application/sparql-results+json'
        },
        body: `query=${encodeURIComponent(describeQuery)}`
      });
    });

    it('should log enhanced debugging information', async () => {
      const mockQuery = 'SELECT * WHERE { ?s ?p ?o }';
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
        headers: {
          get: vi.fn().mockReturnValue('application/json')
        }
      });

      await sparqlService.executeQuery(mockQuery, mockEndpoint);

      expect(mockLogger.info).toHaveBeenCalledWith('Response content-type: "application/json"');
      expect(mockLogger.info).toHaveBeenCalledWith('Query type detected: SELECT');
      expect(mockLogger.info).toHaveBeenCalledWith('Accept header sent: application/sparql-results+json');
    });
  });
  
  describe('_isRdfContentType', () => {
    it('should detect RDF content types correctly', () => {
      const rdfTypes = [
        'text/turtle',
        'application/turtle',
        'application/rdf+xml',
        'application/n-triples',
        'text/n3',
        'application/trig',
        'application/rdf+json',
        'text/plain'
      ];

      rdfTypes.forEach(type => {
        expect(sparqlService._isRdfContentType(type)).toBe(true);
        expect(sparqlService._isRdfContentType(type.toUpperCase())).toBe(true);
        expect(sparqlService._isRdfContentType(`${type}; charset=utf-8`)).toBe(true);
      });

      // Non-RDF types should return false
      expect(sparqlService._isRdfContentType('application/json')).toBe(false);
      expect(sparqlService._isRdfContentType('text/html')).toBe(false);
      expect(sparqlService._isRdfContentType('application/xml')).toBe(false);
    });
  });
});
