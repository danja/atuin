import { RDFParser } from '../../../src/js/core/Parser.js'
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('RDFParser', () => {
    let parser
    let mockLogger

    beforeEach(() => {
        mockLogger = {
            error: vi.fn(),
            warning: vi.fn(),
            info: vi.fn(),
            success: vi.fn(),
            debug: vi.fn()
        }
        parser = new RDFParser(mockLogger)
    })

    it('should parse valid Turtle content', async () => {
        const validTurtle = `@prefix ex: <http://example.org/> .\nex:subject ex:predicate ex:object .`
        const result = await parser.parseTriples(validTurtle)
        expect(result).toBeDefined()
        expect(result.triples).toBeDefined()
        expect(result.triples.length).toBe(1)
        const triple = result.triples[0]
        expect(triple.subject.value).toBe('http://example.org/subject')
        expect(triple.predicate.value).toBe('http://example.org/predicate')
        expect(triple.object.value).toBe('http://example.org/object')
        expect(result.prefixes).toBeDefined()
        const exPrefix = result.prefixes.ex
        expect(typeof exPrefix === 'string' ? exPrefix : exPrefix.value).toBe('http://example.org/')
    })

    it('should extract prefixes from Turtle content', async () => {
        const turtleWithPrefixes = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .`
        const result = await parser.parseTriples(turtleWithPrefixes)
        const getValue = v => (typeof v === 'string' ? v : v.value)
        expect(getValue(result.prefixes.rdf)).toBe('http://www.w3.org/1999/02/22-rdf-syntax-ns#')
        expect(getValue(result.prefixes.rdfs)).toBe('http://www.w3.org/2000/01/rdf-schema#')
    })
})
