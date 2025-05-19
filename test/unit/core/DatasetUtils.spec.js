import { DatasetUtils } from '../../../src/js/utils/DatasetUtils.js'
import rdf from 'rdf-ext'
import { stringToStream, streamToString } from '../../../src/js/utils/StreamUtils.js'
import { describe, it, expect } from 'vitest'

describe('DatasetUtils', () => {
    describe('stringToStream and streamToString', () => {
        it('should convert a string to a readable stream and back', async () => {
            const str = 'test string'
            const stream = stringToStream(str)
            expect(stream.readable).toBe(true)
            const result = await streamToString(stream)
            expect(result).toBe(str)
        })
    })

    describe('parseTurtle', () => {
        it('should parse valid Turtle content', async () => {
            const turtle = `@prefix ex: <http://example.org/> .
                       ex:subject ex:predicate ex:object .`
            const dataset = await DatasetUtils.parseTurtle(turtle)
            expect(dataset).toBeDefined()
            expect(dataset.size).toBe(1)
            const quad = Array.from(dataset)[0]
            expect(quad.subject.value).toBe('http://example.org/subject')
            expect(quad.predicate.value).toBe('http://example.org/predicate')
            expect(quad.object.value).toBe('http://example.org/object')
        })

        it('should throw on invalid Turtle content', async () => {
            const invalidTurtle = `@prefix ex: <http://example.org/> .\nex:subject ex:predicate . # Missing object`
            let error
            try {
                await DatasetUtils.parseTurtle(invalidTurtle)
            } catch (e) {
                error = e
            }
            expect(error).toBeDefined()
        })
    })
})
