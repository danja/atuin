/**
 * Tests for URIUtils
 */

import { URIUtils } from '../../../src/js/utils/URIUtils.js'

describe('URIUtils', () => {
    const testPrefixes = {
        rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
        ex: 'http://example.org/'
    }

    describe('splitNamespace', () => {
        it('should split a URI into namespace and local name', () => {
            const uri = 'http://example.org/test'
            const result = URIUtils.splitNamespace(uri)

            expect(result.namespace).toBe('http://example.org/')
            expect(result.name).toBe('test')
        })

        it('should handle URIs with hash fragments', () => {
            const uri = 'http://www.w3.org/2000/01/rdf-schema#Class'
            const result = URIUtils.splitNamespace(uri)

            expect(result.namespace).toBe('http://www.w3.org/2000/01/rdf-schema#')
            expect(result.name).toBe('Class')
        })

        it('should handle literals', () => {
            const literal = '"Hello World"'
            const result = URIUtils.splitNamespace(literal)

            expect(result.namespace).toBe('')
            expect(result.name).toBe(literal)
        })

        it('should handle invalid input', () => {
            expect(URIUtils.splitNamespace(null)).toEqual({ namespace: '', name: '' })
            expect(URIUtils.splitNamespace(undefined)).toEqual({ namespace: '', name: '' })
            expect(URIUtils.splitNamespace(123)).toEqual({ namespace: '', name: '' })
        })
    })

    describe('isLiteral', () => {
        it('should identify string literals', () => {
            expect(URIUtils.isLiteral('"Hello"')).toBe(true)
            expect(URIUtils.isLiteral("'Hello'")).toBe(true)
        })

        it('should identify number literals', () => {
            expect(URIUtils.isLiteral('42')).toBe(true)
            expect(URIUtils.isLiteral('3.14')).toBe(true)
            expect(URIUtils.isLiteral('-10')).toBe(true)
        })

        it('should identify boolean literals', () => {
            expect(URIUtils.isLiteral('true')).toBe(true)
            expect(URIUtils.isLiteral('false')).toBe(true)
        })

        it('should not identify URIs as literals', () => {
            expect(URIUtils.isLiteral('http://example.org/resource')).toBe(false)
        })

        it('should handle invalid input', () => {
            expect(URIUtils.isLiteral(null)).toBe(false)
            expect(URIUtils.isLiteral(undefined)).toBe(false)
            expect(URIUtils.isLiteral(123)).toBe(false)
        })
    })

    describe('shrinkUri', () => {
        it('should shorten a URI using prefixes', () => {
            const uri = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
            const result = URIUtils.shrinkUri(uri, testPrefixes)

            expect(result).toBe('rdf:type')
        })

        it('should not modify literals', () => {
            const literal = '"Hello World"'
            const result = URIUtils.shrinkUri(literal, testPrefixes)

            expect(result).toBe(literal)
        })

        it('should not modify URIs without matching prefixes', () => {
            const uri = 'http://unknown.org/test'
            const result = URIUtils.shrinkUri(uri, testPrefixes)

            expect(result).toBe(uri)
        })

        it('should handle invalid input', () => {
            expect(URIUtils.shrinkUri(null, testPrefixes)).toBe(null)
            expect(URIUtils.shrinkUri(undefined, testPrefixes)).toBe(undefined)
            expect(URIUtils.shrinkUri(123, testPrefixes)).toBe(123)
        })
    })

    describe('expandPrefixed', () => {
        it('should expand a prefixed name to a full URI', () => {
            const prefixed = 'rdf:type'
            const result = URIUtils.expandPrefixed(prefixed, testPrefixes)

            expect(result).toBe('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')
        })

        it('should handle the "a" shorthand for rdf:type', () => {
            const result = URIUtils.expandPrefixed('a', testPrefixes)

            expect(result).toBe('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')
        })

        it('should not modify literals', () => {
            const literal = '"Hello World"'
            const result = URIUtils.expandPrefixed(literal, testPrefixes)

            expect(result).toBe(literal)
        })

        it('should not modify unprefixed names', () => {
            const unprefixed = 'test'
            const result = URIUtils.expandPrefixed(unprefixed, testPrefixes)

            expect(result).toBe(unprefixed)
        })

        it('should not modify unknown prefixes', () => {
            const unknown = 'unknown:test'
            const result = URIUtils.expandPrefixed(unknown, testPrefixes)

            expect(result).toBe(unknown)
        })

        it('should handle invalid input', () => {
            expect(URIUtils.expandPrefixed(null, testPrefixes)).toBe(null)
            expect(URIUtils.expandPrefixed(undefined, testPrefixes)).toBe(undefined)
            expect(URIUtils.expandPrefixed(123, testPrefixes)).toBe(123)
        })
    })

    describe('getLabel', () => {
        it('should create a friendly label for a URI', () => {
            const uri = 'http://example.org/Person'
            const result = URIUtils.getLabel(uri, testPrefixes)

            expect(result).toBe('ex:Person')
        })

        it('should truncate long labels', () => {
            const uri = 'http://example.org/VeryLongResourceNameThatShouldBeTruncated'
            const result = URIUtils.getLabel(uri, testPrefixes, 15)

            expect(result.length).toBeLessThanOrEqual(15)
            expect(result.endsWith('...')).toBe(true)
        })

        it('should extract local name when prefix not found', () => {
            const uri = 'http://unknown.org/Resource'
            const result = URIUtils.getLabel(uri, testPrefixes)

            expect(result).toBe('Resource')
        })

        it('should not modify literals', () => {
            const literal = '"Hello"'
            const result = URIUtils.getLabel(literal, testPrefixes)

            expect(result).toBe(literal)
        })

        it('should handle invalid input', () => {
            expect(URIUtils.getLabel(null, testPrefixes)).toBe('')
            expect(URIUtils.getLabel(undefined, testPrefixes)).toBe('')
            expect(URIUtils.getLabel(123, testPrefixes)).toBe('')
        })
    })

    describe('extractPrefixes', () => {
        it('should extract prefix declarations from Turtle content', () => {
            const turtle = `
        @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
        @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
        @prefix ex: <http://example.org/> .
        
        ex:Person a rdfs:Class .
      `

            const result = URIUtils.extractPrefixes(turtle)

            expect(result.rdf).toBe('http://www.w3.org/1999/02/22-rdf-syntax-ns#')
            expect(result.rdfs).toBe('http://www.w3.org/2000/01/rdf-schema#')
            expect(result.ex).toBe('http://example.org/')
        })

        it('should handle content without prefixes', () => {
            const turtle = `
        <http://example.org/Person> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/2000/01/rdf-schema#Class> .
      `

            const result = URIUtils.extractPrefixes(turtle)

            expect(Object.keys(result).length).toBe(0)
        })

        it('should handle invalid input', () => {
            expect(URIUtils.extractPrefixes(null)).toEqual({})
            expect(URIUtils.extractPrefixes(undefined)).toEqual({})
            expect(URIUtils.extractPrefixes(123)).toEqual({})
        })
    })

    describe('extractBaseUri', () => {
        it('should extract base URI declaration from Turtle content', () => {
            const turtle = `
        @base <http://example.org/> .
        @prefix ex: <http://example.org/> .
        
        ex:Person a rdfs:Class .
      `

            const result = URIUtils.extractBaseUri(turtle)

            expect(result).toBe('http://example.org/')
        })

        it('should return null when no base URI is found', () => {
            const turtle = `
        @prefix ex: <http://example.org/> .
        
        ex:Person a rdfs:Class .
      `

            const result = URIUtils.extractBaseUri(turtle)

            expect(result).toBe(null)
        })

        it('should handle invalid input', () => {
            expect(URIUtils.extractBaseUri(null)).toBe(null)
            expect(URIUtils.extractBaseUri(undefined)).toBe(null)
            expect(URIUtils.extractBaseUri(123)).toBe(null)
        })
    })
})