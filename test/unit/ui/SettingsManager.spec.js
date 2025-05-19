// test/unit/ui/SettingsManager.spec.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SettingsManager } from '../../../src/js/ui/SettingsManager';

// Mock LoggerService
const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock Visualizer
const mockVisualizer = {
  setNodeSize: vi.fn(),
  network: {
    setOptions: vi.fn(),
  },
  edges: {
    getIds: vi.fn().mockReturnValue([]),
    update: vi.fn(),
  },
};

// Mock Editor and SparqlEditor (simple mocks as their direct interaction is minimal for now)
const mockEditor = {};
const mockSparqlEditor = {};

// Mock DOM elements
const mockControls = {
  nodeSize: { value: '10', addEventListener: vi.fn() },
  edgeWidth: { value: '1', addEventListener: vi.fn() },
  physicsEnabled: { checked: true, addEventListener: vi.fn() },
  fontSize: { value: '14', addEventListener: vi.fn() },
  autoComplete: { checked: false, addEventListener: vi.fn() },
  sparqlEndpointUrl: { value: '', addEventListener: vi.fn() },
  addSparqlEndpointBtn: { addEventListener: vi.fn() },
  sparqlEndpointSelect: { 
    value: '', 
    innerHTML: '', 
    appendChild: vi.fn(), 
    addEventListener: vi.fn(),
    options: [],
    selectedIndex: -1
  },
  removeSparqlEndpointBtn: { addEventListener: vi.fn() },
  // Display elements
  nodeSizeValue: { textContent: '' }
};

describe('SettingsManager', () => {
  let settingsManager;
  let mockLocalStorageStore;

  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();

    // Mock localStorage
    mockLocalStorageStore = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => mockLocalStorageStore[key] || null),
      setItem: vi.fn((key, value) => { mockLocalStorageStore[key] = value; }),
      removeItem: vi.fn((key) => { delete mockLocalStorageStore[key]; }),
      clear: vi.fn(() => { mockLocalStorageStore = {}; }),
    });

    // Mock document.getElementById
    vi.stubGlobal('document', {
      getElementById: vi.fn((id) => {
        if (id === 'node-size-value') return mockControls.nodeSizeValue; // Special case for display
        // Construct the camelCase key from the kebab-case id
        const camelCaseId = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        return mockControls[camelCaseId] || null;
      }),
      querySelectorAll: vi.fn().mockReturnValue([]), // Default empty for things like font updates
      createElement: vi.fn((tagName) => {
        if (tagName === 'option') {
          return {
            value: '',
            textContent: '',
            disabled: false,
            selected: false,
            // Mock any other properties or methods needed for an <option> element
          };
        }
        // Fallback for other elements if needed, though not currently used by SettingsManager for creation
        return {}; 
      })
    });
    
    // Mock URL constructor for validation
    vi.stubGlobal('URL', vi.fn(url => ({ href: url })));


    // Ensure sparqlEndpointSelect.options is an array-like object with a length
    mockControls.sparqlEndpointSelect.options = [];
    mockControls.sparqlEndpointSelect.appendChild.mockImplementation(option => {
        mockControls.sparqlEndpointSelect.options.push(option);
        // Simulate setting value if it's the first non-disabled option or selected
        if (mockControls.sparqlEndpointSelect.options.length === 1 && !option.disabled) {
            mockControls.sparqlEndpointSelect.value = option.value;
        }
        if (option.selected) {
            mockControls.sparqlEndpointSelect.value = option.value;
        }
    });
     mockControls.sparqlEndpointSelect.innerHTML = ''; // Reset for populate


    settingsManager = new SettingsManager({
      visualizer: mockVisualizer,
      editor: mockEditor,
      sparqlEditor: mockSparqlEditor,
      logger: mockLogger,
    });
    
    // Clear mock store after initial load an instance might do
    mockLocalStorageStore = {};
    localStorage.getItem.mockImplementation((key) => mockLocalStorageStore[key] || null);
    localStorage.setItem.mockImplementation((key, value) => { mockLocalStorageStore[key] = value; });
    localStorage.removeItem.mockImplementation((key) => { delete mockLocalStorageStore[key]; });

  });

  afterEach(() => {
    vi.unstubAllGlobals(); // Clean up global stubs
  });

  describe('SPARQL Endpoint Management', () => {
    const endpoint1 = 'http://localhost/sparql1';
    const endpoint2 = 'http://localhost/sparql2';

    it('constructor should call loadSparqlEndpoints', () => {
        expect(document.getElementById).toHaveBeenCalledWith('sparql-endpoint-select');
        expect(mockControls.sparqlEndpointSelect.appendChild).toHaveBeenCalled();
    });
    
    describe('loadSparqlEndpoints', () => {
      it('should load endpoints from localStorage and populate select', () => {
        mockLocalStorageStore[settingsManager.localStorageKeys.endpoints] = JSON.stringify([endpoint1, endpoint2]);
        mockLocalStorageStore[settingsManager.localStorageKeys.activeEndpoint] = endpoint1;
        
        mockControls.sparqlEndpointSelect.appendChild.mockClear();

        settingsManager.loadSparqlEndpoints();

        expect(localStorage.getItem).toHaveBeenCalledWith(settingsManager.localStorageKeys.endpoints);
        expect(localStorage.getItem).toHaveBeenCalledWith(settingsManager.localStorageKeys.activeEndpoint);
        expect(settingsManager.sparqlEndpoints).toEqual([endpoint1, endpoint2]);
        expect(settingsManager.activeSparqlEndpoint).toBe(endpoint1);
        expect(mockControls.sparqlEndpointSelect.appendChild).toHaveBeenCalledTimes(2);
        expect(mockControls.sparqlEndpointSelect.options.find(o => o.value === endpoint1).selected).toBe(true);
      });

      it('should handle no endpoints in localStorage', () => {
        mockControls.sparqlEndpointSelect.appendChild.mockClear();
        settingsManager.loadSparqlEndpoints();

        expect(settingsManager.sparqlEndpoints).toEqual([]);
        expect(settingsManager.activeSparqlEndpoint).toBeNull();
        expect(mockControls.sparqlEndpointSelect.appendChild).toHaveBeenCalledTimes(1);
        expect(mockControls.sparqlEndpointSelect.options[0].disabled).toBe(true);
      });
    });

    describe('addSparqlEndpoint', () => {
      beforeEach(() => {
        settingsManager.sparqlEndpoints = [];
        settingsManager.activeSparqlEndpoint = null;
        mockControls.sparqlEndpointSelect.options = [];
        mockControls.sparqlEndpointSelect.innerHTML = '';
        mockControls.sparqlEndpointUrl.value = '';
        mockLocalStorageStore = {};
      });

      it('should add a valid endpoint', () => {
        mockControls.sparqlEndpointUrl.value = endpoint1;
        settingsManager.addSparqlEndpoint();

        expect(settingsManager.sparqlEndpoints).toContain(endpoint1);
        expect(settingsManager.activeSparqlEndpoint).toBe(endpoint1); 
        expect(localStorage.setItem).toHaveBeenCalledWith(settingsManager.localStorageKeys.endpoints, JSON.stringify([endpoint1]));
        expect(mockControls.sparqlEndpointSelect.appendChild).toHaveBeenCalled();
        expect(mockControls.sparqlEndpointUrl.value).toBe('');
        expect(mockLogger.info).toHaveBeenCalledWith(`SPARQL endpoint added: ${endpoint1}`);
      });

      it('should not add an empty URL', () => {
        mockControls.sparqlEndpointUrl.value = ' ';
        settingsManager.addSparqlEndpoint();
        expect(settingsManager.sparqlEndpoints).toEqual([]);
        expect(mockLogger.warn).toHaveBeenCalledWith('SPARQL endpoint URL is empty.');
      });

      it('should not add an invalid URL', () => {
        mockControls.sparqlEndpointUrl.value = 'invalid-url';
        URL.mockImplementationOnce(() => { throw new TypeError('Invalid URL'); }); 
        settingsManager.addSparqlEndpoint();
        expect(settingsManager.sparqlEndpoints).toEqual([]);
        expect(mockLogger.warn).toHaveBeenCalledWith(`Invalid SPARQL endpoint URL: invalid-url`);
      });

      it('should not add a duplicate URL', () => {
        settingsManager.sparqlEndpoints = [endpoint1];
        settingsManager.activeSparqlEndpoint = endpoint1;
        mockControls.sparqlEndpointUrl.value = endpoint1;
        settingsManager.addSparqlEndpoint();
        expect(settingsManager.sparqlEndpoints.length).toBe(1);
        expect(mockLogger.info).toHaveBeenCalledWith(`SPARQL endpoint already exists: ${endpoint1}`);
      });
        
      it('should make the first added endpoint active', () => {
        mockControls.sparqlEndpointUrl.value = endpoint1;
        settingsManager.addSparqlEndpoint();
        expect(settingsManager.getActiveSparqlEndpoint()).toBe(endpoint1);
      });

      it('should not change active endpoint if one already exists and a new one is added', () => {
        mockControls.sparqlEndpointUrl.value = endpoint1;
        settingsManager.addSparqlEndpoint(); 
        
        mockControls.sparqlEndpointUrl.value = endpoint2;
        settingsManager.addSparqlEndpoint(); 
        
        expect(settingsManager.getActiveSparqlEndpoint()).toBe(endpoint1);
        expect(settingsManager.sparqlEndpoints).toEqual([endpoint1, endpoint2]);
      });
    });
    
    describe('removeSparqlEndpoint', () => {
      beforeEach(() => {
        settingsManager.sparqlEndpoints = [endpoint1, endpoint2];
        settingsManager.activeSparqlEndpoint = endpoint1;
        mockControls.sparqlEndpointSelect.options = [
            { value: endpoint1, textContent: endpoint1, selected: true },
            { value: endpoint2, textContent: endpoint2, selected: false }
        ];
        mockControls.sparqlEndpointSelect.value = endpoint1;
        mockLocalStorageStore[settingsManager.localStorageKeys.endpoints] = JSON.stringify(settingsManager.sparqlEndpoints);
        mockLocalStorageStore[settingsManager.localStorageKeys.activeEndpoint] = settingsManager.activeSparqlEndpoint;
      });

      it('should remove the selected endpoint and make next one active', () => {
        mockControls.sparqlEndpointSelect.value = endpoint1; 
        settingsManager.removeSparqlEndpoint();

        expect(settingsManager.sparqlEndpoints).toEqual([endpoint2]);
        expect(settingsManager.activeSparqlEndpoint).toBe(endpoint2);
        expect(localStorage.setItem).toHaveBeenCalledWith(settingsManager.localStorageKeys.endpoints, JSON.stringify([endpoint2]));
        expect(mockLogger.info).toHaveBeenCalledWith(`SPARQL endpoint removed: ${endpoint1}`);
      });
      
      it('should remove the selected endpoint and set active to null if list becomes empty', () => {
        settingsManager.sparqlEndpoints = [endpoint1];
        settingsManager.activeSparqlEndpoint = endpoint1;
        mockControls.sparqlEndpointSelect.options = [{ value: endpoint1, textContent: endpoint1, selected: true }];
        mockControls.sparqlEndpointSelect.value = endpoint1;

        settingsManager.removeSparqlEndpoint();
        expect(settingsManager.sparqlEndpoints).toEqual([]);
        expect(settingsManager.activeSparqlEndpoint).toBeNull();
      });

      it('should not do anything if no valid endpoint is selected for removal', () => {
        mockControls.sparqlEndpointSelect.value = 'http://nonexistent.com'; 
        const originalEndpoints = [...settingsManager.sparqlEndpoints];
        settingsManager.removeSparqlEndpoint();
        expect(settingsManager.sparqlEndpoints).toEqual(originalEndpoints);
        expect(mockLogger.warn).toHaveBeenCalledWith('No valid endpoint selected for removal.');
      });
    });

    describe('updateActiveSparqlEndpoint', () => {
      it('should update active endpoint based on select and save', () => {
        settingsManager.sparqlEndpoints = [endpoint1, endpoint2];
        mockControls.sparqlEndpointSelect.value = endpoint2;
        
        settingsManager.updateActiveSparqlEndpoint();
        
        expect(settingsManager.activeSparqlEndpoint).toBe(endpoint2);
        expect(localStorage.setItem).toHaveBeenCalledWith(settingsManager.localStorageKeys.activeEndpoint, endpoint2);
        expect(mockLogger.info).toHaveBeenCalledWith(`Active SPARQL endpoint updated: ${endpoint2}`);
      });
        
      it('should clear active endpoint if no endpoints are available', () => {
        settingsManager.sparqlEndpoints = [];
        mockControls.sparqlEndpointSelect.value = 'No endpoints configured';

        settingsManager.updateActiveSparqlEndpoint();
        expect(settingsManager.activeSparqlEndpoint).toBeNull();
        expect(mockLogger.info).toHaveBeenCalledWith('Active SPARQL endpoint cleared as no endpoints are available.');
      });
    });

    it('getActiveSparqlEndpoint should return the current active endpoint', () => {
      settingsManager.activeSparqlEndpoint = endpoint1;
      expect(settingsManager.getActiveSparqlEndpoint()).toBe(endpoint1);
      settingsManager.activeSparqlEndpoint = null;
      expect(settingsManager.getActiveSparqlEndpoint()).toBeNull();
    });
      
    describe('populateSparqlEndpointSelect', () => {
        beforeEach(() => {
            mockControls.sparqlEndpointSelect.options = [];
            mockControls.sparqlEndpointSelect.innerHTML = '';
            mockControls.sparqlEndpointSelect.appendChild.mockClear();
        });

        it('should show "No endpoints configured" if no endpoints exist', () => {
            settingsManager.sparqlEndpoints = [];
            settingsManager.populateSparqlEndpointSelect();
            expect(mockControls.sparqlEndpointSelect.appendChild).toHaveBeenCalledTimes(1);
            const option = mockControls.sparqlEndpointSelect.options[0];
            expect(option.textContent).toBe('No endpoints configured');
            expect(option.disabled).toBe(true);
        });

        it('should populate select with endpoints and select the active one', () => {
            settingsManager.sparqlEndpoints = [endpoint1, endpoint2];
            settingsManager.activeSparqlEndpoint = endpoint2;
            settingsManager.populateSparqlEndpointSelect();
            expect(mockControls.sparqlEndpointSelect.appendChild).toHaveBeenCalledTimes(2);
            const option1 = mockControls.sparqlEndpointSelect.options.find(opt => opt.value === endpoint1);
            const option2 = mockControls.sparqlEndpointSelect.options.find(opt => opt.value === endpoint2);
            expect(option1.selected).toBeFalsy();
            expect(option2.selected).toBe(true);
        });

        it('should make the first endpoint active if no active endpoint is set and list is not empty', () => {
            settingsManager.sparqlEndpoints = [endpoint1, endpoint2];
            settingsManager.activeSparqlEndpoint = null;
            settingsManager.populateSparqlEndpointSelect();
            expect(settingsManager.activeSparqlEndpoint).toBe(endpoint1);
            expect(localStorage.setItem).toHaveBeenCalledWith(settingsManager.localStorageKeys.activeEndpoint, endpoint1);
        });
    });
  });
  
  // TODO: Add describe blocks for other settings like visualizer, editor controls
});
