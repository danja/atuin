import { StringReadable, stringToStream, streamToString } from '../../../src/js/utils/StreamUtils.js'
import { describe, it, expect } from 'vitest'

// StreamUtils tests migrated from Jasmine to Vitest

describe('StreamUtils', () => {
    describe('StringReadable', () => {
        it('should create a readable stream from a string', async () => {
            const str = 'test string'
            const stream = new StringReadable(str)
            expect(stream.readable).toBe(true)
            let data = ''
            for await (const chunk of stream) {
                data += chunk
            }
            expect(data).toBe(str)
        })

        it('should push data only once', async () => {
            const str = 'test string'
            const stream = new StringReadable(str)
            let dataEvents = 0
            stream.on('data', () => {
                dataEvents++
            })
            await new Promise((resolve) => {
                stream.on('end', resolve)
                stream._read()
                stream._read()
            })
            expect(dataEvents).toBe(1)
        })
    })

    describe('stringToStream', () => {
        it('should create a readable stream from a string', async () => {
            const str = 'test string'
            const stream = stringToStream(str)
            expect(stream.readable).toBe(true)
            let data = ''
            for await (const chunk of stream) {
                data += chunk
            }
            expect(data).toBe(str)
        })
    })

    describe('streamToString', () => {
        it('should convert a stream to a string', async () => {
            const str = 'test string'
            const stream = stringToStream(str)
            const result = await streamToString(stream)
            expect(result).toBe(str)
        })
    })
})
