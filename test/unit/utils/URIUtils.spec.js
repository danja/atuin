import { URIUtils } from '../../../src/js/utils/URIUtils.js'
import { describe, it, expect } from 'vitest'

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

        it('should not identify non-literals', () => {
            expect(URIUtils.isLiteral('http://example.org/')).toBe(false)
            expect(URIUtils.isLiteral('ex:subject')).toBe(false)
        })
    })
})
