// test/unit/core/SparqlService.spec.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SparqlService } from '../../../src/js/core/SparqlService';

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
        text: async () => '' 
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
            text: async () => 'this is not json'
        });

        await expect(sparqlService.executeQuery(mockQuery, mockEndpoint)).rejects.toThrow(notJsonError);
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(mockLogger.error).toHaveBeenCalledWith('Error during SPARQL query execution:', notJsonError);
    });
  });
});
