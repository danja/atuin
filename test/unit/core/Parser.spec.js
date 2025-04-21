/**
 * Tests for RDF Parser
 */

import { RDFParser } from '../../../src/js/core/Parser.js';

describe('RDFParser', () => {
  let parser;
  let mockLogger;
  
  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      error: jasmine.createSpy('error'),
      warning: jasmine.createSpy('warning'),
      info: jasmine.createSpy('info'),
      success: jasmine.createSpy('success'),
      debug: jasmine.createSpy('debug')
    };
    
    parser = new RDFParser(mockLogger);
  });
  
  it('should parse valid Turtle content', async () => {
    const validTurtle = `
      @prefix ex: <http://example.org/> .
      ex:subject ex:predicate ex:object .
    `;
    
    const result = await parser.parseTriples(validTurtle);
    
    expect(result).toBeDefined();
    expect(result.triples).toBeDefined();
    expect(result.triples.length).toBe(1);
    
    const triple = result.triples[0];
    expect(triple.subject).toBe('http://example.org/subject');
    expect(triple.predicate).toBe('http://example.org/predicate');
    expect(triple.object).toBe('http://example.org/object');
    
    expect(result.prefixes).toBeDefined();
    expect(result.prefixes.ex).toBe('http://example.org/');
  });
  
  it('should extract prefixes from Turtle content', async () => {
    const turtleWithPrefixes = `
      @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
      @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
      @prefix ex: <http://example.org/> .
      
      ex:Resource rdf:type rdfs:Class .
    `;
    
    const result = await parser.parseTriples(turtleWithPrefixes);
    
    expect(result.prefixes).toBeDefined();
    expect(result.prefixes.rdf).toBe('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
    expect(result.prefixes.rdfs).toBe('http://www.w3.org/2000/01/rdf-schema#');
    expect(result.prefixes.ex).toBe('http://example.org/');
  });
  
  it('should handle syntax errors appropriately', async () => {
    const invalidTurtle = `
      @prefix ex: <http://example.org/> .
      ex:subject ex:predicate . # Missing object
    `;
    
    let error;
    try {
      await parser.parseTriples(invalidTurtle);
    } catch (e) {
      error = e;
    }
    
    expect(error).toBeDefined();
    expect(error.message).toContain('syntax');
    expect(error.line).toBeGreaterThan(0);
  });
  
  it('should handle error callback when parsing', () => {
    const invalidTurtle = `
      @prefix ex: <http://example.org/> .
      ex:subject ex:predicate . # Missing object
    `;
    
    const errorCallback = jasmine.createSpy('errorCallback');
    
    parser.parse(invalidTurtle, {
      onError: errorCallback
    });
    
    expect(errorCallback).toHaveBeenCalled();
    const error = errorCallback.calls.first().args[0];
    expect(error.message).toContain('syntax');
    expect(error.line).toBeGreaterThan(0);
  });
  
  it('should handle triple and complete callbacks when parsing', () => {
    const validTurtle = `
      @prefix ex: <http://example.org/> .
      ex:subject ex:predicate ex:object .
    `;
    
    const tripleCallback = jasmine.createSpy('tripleCallback');
    const completeCallback = jasmine.createSpy('completeCallback');
    
    parser.parse(validTurtle, {
      onTriple: tripleCallback,
      onComplete: completeCallback
    });
    
    expect(tripleCallback).toHaveBeenCalled();
    const triple = tripleCallback.calls.first().args[0];
    expect(triple.subject).toBe('http://example.org/subject');
    
    expect(completeCallback).toHaveBeenCalled();
    const prefixes = completeCallback.calls.first().args[0];
    expect(prefixes.ex).toBe('http://example.org/');
  });
  
  it('should check if content is valid Turtle', async () => {
    const validTurtle = `
      @prefix ex: <http://example.org/> .
      ex:subject ex:predicate ex:object .
    `;
    
    const invalidTurtle = `
      @prefix ex: <http://example.org/> .
      ex:subject ex:predicate . # Missing object
    `;
    
    const validResult = await parser.isValid(validTurtle);
    expect(validResult).toBe(true);
    
    const invalidResult = await parser.isValid(invalidTurtle);
    expect(invalidResult).toBe(false);
  });
});
