/**
 * Tests for SPARQLClipsManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SPARQLClipsManager } from '../../../src/js/services/SPARQLClipsManager.js';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('SPARQLClipsManager', () => {
  let clipsManager;
  let mockLogger;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();

    // Mock logger
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    };
  });

  describe('initialization with default clips', () => {
    it('should initialize with default clips when localStorage is empty', () => {
      clipsManager = new SPARQLClipsManager(mockLogger);
      
      expect(clipsManager.getClipsCount()).toBeGreaterThan(0);
      
      const clips = clipsManager.getAllClips();
      expect(clips).toHaveLength(4);
      
      // Check that we have the expected default clips
      const clipNames = clips.map(clip => clip.name);
      expect(clipNames).toContain('Wikidata: Countries by Population');
      expect(clipNames).toContain('Wikidata: Simple Example Query');
      expect(clipNames).toContain('Basic SELECT Query Template');
      expect(clipNames).toContain('Wikidata: Countries RDF Graph (CONSTRUCT)');
    });

    it('should contain a Wikidata query with proper SPARQL syntax', () => {
      clipsManager = new SPARQLClipsManager(mockLogger);
      
      const clips = clipsManager.getAllClips();
      const wikidataClip = clips.find(clip => clip.name === 'Wikidata: Countries by Population');
      
      expect(wikidataClip).toBeDefined();
      expect(wikidataClip.query).toContain('SELECT');
      expect(wikidataClip.query).toContain('wdt:P31');
      expect(wikidataClip.query).toContain('wikibase:label');
      expect(wikidataClip.query).toContain('ORDER BY DESC(?population)');
    });

    it('should initialize default clips with proper data structure', () => {
      clipsManager = new SPARQLClipsManager(mockLogger);
      
      // Verify all clips have required properties
      const clips = clipsManager.getAllClips();
      clips.forEach(clip => {
        expect(clip.id).toBeDefined();
        expect(clip.name).toBeDefined();
        expect(clip.query).toBeDefined();
        expect(clip.timestamp).toBeDefined();
        expect(clip.created).toBeDefined();
      });
    });
  });

  describe('default clip queries', () => {
    it('should provide useful default clips for first-time users', () => {
      clipsManager = new SPARQLClipsManager(mockLogger);
      const defaultClips = clipsManager.getDefaultClips();
      
      expect(defaultClips).toHaveLength(4);
      
      // Check Wikidata countries query
      const countriesClip = defaultClips.find(clip => clip.name === 'Wikidata: Countries by Population');
      expect(countriesClip.query).toContain('# Wikidata SPARQL query');
      expect(countriesClip.query).toContain('query.wikidata.org/sparql');
      
      // Check basic template
      const templateClip = defaultClips.find(clip => clip.name === 'Basic SELECT Query Template');
      expect(templateClip.query).toContain('PREFIX ex:');
      expect(templateClip.query).toContain('SELECT ?subject ?predicate ?object');
    });

    it('should have proper clip structure for default clips', () => {
      clipsManager = new SPARQLClipsManager(mockLogger);
      const defaultClips = clipsManager.getDefaultClips();
      
      defaultClips.forEach(clip => {
        expect(clip).toHaveProperty('id');
        expect(clip).toHaveProperty('name');
        expect(clip).toHaveProperty('query');
        expect(clip).toHaveProperty('timestamp');
        expect(clip).toHaveProperty('created');
        
        expect(typeof clip.id).toBe('string');
        expect(typeof clip.name).toBe('string');
        expect(typeof clip.query).toBe('string');
        expect(typeof clip.timestamp).toBe('number');
        expect(typeof clip.created).toBe('string');
      });
    });
  });

  describe('default clips content validation', () => {
    it('should include practical SPARQL examples', () => {
      clipsManager = new SPARQLClipsManager(mockLogger);
      const clips = clipsManager.getAllClips();
      
      // Should have at least one Wikidata query
      const wikidataQueries = clips.filter(clip => 
        clip.query.includes('wikidata') || clip.query.includes('wdt:')
      );
      expect(wikidataQueries.length).toBeGreaterThan(0);
      
      // Should have at least one basic template
      const basicQueries = clips.filter(clip => 
        clip.query.includes('?subject ?predicate ?object')
      );
      expect(basicQueries.length).toBeGreaterThan(0);
    });
  });

  describe('ensureDefaultClips behavior', () => {
    it('should add missing default clips to existing collection', () => {
      // Create a manager with existing clips first
      const manager = new SPARQLClipsManager(mockLogger);
      
      // Manually set up a scenario with one existing clip
      manager.clips = [
        {
          id: 'existing_clip',
          name: 'Person Query over 25',
          query: 'SELECT ?person WHERE { ?person ex:age ?age . FILTER(?age > 25) }',
          timestamp: Date.now(),
          created: new Date().toISOString()
        }
      ];
      
      // Now call ensureDefaultClips to add missing defaults
      manager.ensureDefaultClips();
      
      const allClips = manager.getAllClips();
      
      // Should now have the existing clip plus the 4 default clips
      expect(allClips.length).toBe(5);
      
      // Should contain both user clip and default clips
      const clipNames = allClips.map(clip => clip.name);
      expect(clipNames).toContain('Person Query over 25');
      expect(clipNames).toContain('Wikidata: Countries by Population');
      expect(clipNames).toContain('Wikidata: Simple Example Query');
      expect(clipNames).toContain('Basic SELECT Query Template');
      expect(clipNames).toContain('Wikidata: Countries RDF Graph (CONSTRUCT)');
    });

    it('should not duplicate existing default clips', () => {
      // Create a manager and manually set clips that include one of the defaults
      const manager = new SPARQLClipsManager(mockLogger);
      
      manager.clips = [
        {
          id: 'default_wikidata_countries',
          name: 'Wikidata: Countries by Population',
          query: 'SELECT ?country WHERE { ?country wdt:P31 wd:Q3624078 }',
          timestamp: Date.now(),
          created: new Date().toISOString()
        }
      ];
      
      // Call ensureDefaultClips to add missing defaults
      manager.ensureDefaultClips();
      
      const allClips = manager.getAllClips();
      
      // Should have original clip plus the 3 missing defaults (4 total)
      expect(allClips.length).toBe(4);
      
      // Should not duplicate the existing default
      const countriesClips = allClips.filter(clip => 
        clip.name === 'Wikidata: Countries by Population'
      );
      expect(countriesClips.length).toBe(1);
    });
  });
});