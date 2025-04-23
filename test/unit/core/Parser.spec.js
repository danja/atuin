import { RDFParser } from '../../../src/js/core/Parser.js'

describe('RDFParser', () => {
  let parser
  let mockLogger

  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      error: jasmine.createSpy('error'),
      warning: jasmine.createSpy('warning'),
      info: jasmine.createSpy('info'),
      success: jasmine.createSpy('success'),
      debug: jasmine.createSpy('debug')
    }

    parser = new RDFParser(mockLogger)
  })

  it('should parse valid Turtle content', async () => {
    const validTurtle = `
      @prefix ex: <http://example.org/> .
      ex:subject ex:predicate ex:object .
    `

    // This test will need to be updated to match the new RDFJS data model
    // as the resulting object structure will be different
    const result = await parser.parseTriples(validTurtle)

    expect(result).toBeDefined()
    expect(result.triples).toBeDefined()
    expect(result.triples.length).toBe(1)

    const triple = result.triples[0]

    // In RDFJS, these will be term objects with value properties
    expect(triple.subject.value).toBe('http://example.org/subject')
    expect(triple.predicate.value).toBe('http://example.org/predicate')
    expect(triple.object.value).toBe('http://example.org/object')

    expect(result.prefixes).toBeDefined()
    // Accept both string and NamedNode for prefixes
    const exPrefix = result.prefixes.ex
    expect(typeof exPrefix === 'string' ? exPrefix : exPrefix.value).toBe('http://example.org/')
  })

  it('should extract prefixes from Turtle content', async () => {
    const turtleWithPrefixes = `
      @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
      @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
      @prefix ex: <http://example.org/> .

      ex:Resource rdf:type rdfs:Class .
    `

    const result = await parser.parseTriples(turtleWithPrefixes)

    expect(result.prefixes).toBeDefined()
    // Accept both string and NamedNode for prefixes
    const rdfPrefix = result.prefixes.rdf
    const rdfsPrefix = result.prefixes.rdfs
    const exPrefix2 = result.prefixes.ex
    expect(typeof rdfPrefix === 'string' ? rdfPrefix : rdfPrefix.value).toBe('http://www.w3.org/1999/02/22-rdf-syntax-ns#')
    expect(typeof rdfsPrefix === 'string' ? rdfsPrefix : rdfsPrefix.value).toBe('http://www.w3.org/2000/01/rdf-schema#')
    expect(typeof exPrefix2 === 'string' ? exPrefix2 : exPrefix2.value).toBe('http://example.org/')
  })

  it('should handle syntax errors appropriately', async () => {
    const invalidTurtle = `
      @prefix ex: <http://example.org/> .
      ex:subject ex:predicate . # Missing object
    `

    let error
    try {
      await parser.parseTriples(invalidTurtle)
    } catch (e) {
      error = e
    }

    expect(error).toBeDefined()
    // Accept any error message, just check for line number
    expect(error.line).toBeGreaterThan(0)
  })

  it('should handle error callback when parsing', (done) => {
    const invalidTurtle = `
      @prefix ex: <http://example.org/> .
      ex:subject ex:predicate . # Missing object
    `

    const errorCallback = jasmine.createSpy('errorCallback').and.callFake((error) => {
      // Accept any error message, just check for line number
      expect(error.line).toBeGreaterThan(0)
      done()
    })

    parser.parse(invalidTurtle, {
      onError: errorCallback
    })
  })

  it('should handle triple and complete callbacks when parsing', (done) => {
    const validTurtle = `
      @prefix ex: <http://example.org/> .
      ex:subject ex:predicate ex:object .
    `

    const tripleCallback = jasmine.createSpy('tripleCallback').and.callFake((triple) => {
      expect(triple.subject.value).toBe('http://example.org/subject')
    })

    const completeCallback = jasmine.createSpy('completeCallback').and.callFake((prefixes, store) => {
      const exPrefix = prefixes.ex
      expect(typeof exPrefix === 'string' ? exPrefix : exPrefix.value).toBe('http://example.org/')
      expect(tripleCallback).toHaveBeenCalled()
      done()
    })

    parser.parse(validTurtle, {
      onTriple: tripleCallback,
      onComplete: completeCallback
    })
  })

  it('should check if content is valid Turtle', async () => {
    const validTurtle = `
      @prefix ex: <http://example.org/> .
      ex:subject ex:predicate ex:object .
    `

    const invalidTurtle = `
      @prefix ex: <http://example.org/> .
      ex:subject ex:predicate . # Missing object
    `

    const validResult = await parser.isValid(validTurtle)
    expect(validResult).toBe(true)

    const invalidResult = await parser.isValid(invalidTurtle)
    expect(invalidResult).toBe(false)
  })
})