import { StringReadable, stringToStream, streamToString } from '../../../src/js/utils/StreamUtils.js'

describe('StreamUtils', () => {
  describe('StringReadable', () => {
    it('should create a readable stream from a string', (done) => {
      const str = 'test string'
      const stream = new StringReadable(str)
      
      expect(stream.readable).toBe(true)
      
      let data = ''
      
      stream.on('data', chunk => {
        data += chunk
      })
      
      stream.on('end', () => {
        expect(data).toBe(str)
        done()
      })
      
      stream.on('error', error => {
        fail(error)
      })
    })
    
    it('should push data only once', (done) => {
      const str = 'test string'
      const stream = new StringReadable(str)
      
      let dataEvents = 0
      
      stream.on('data', () => {
        dataEvents++
      })
      
      stream.on('end', () => {
        expect(dataEvents).toBe(1)
        done()
      })
      
      // Force multiple _read calls
      stream._read()
      stream._read()
    })
  })
  
  describe('stringToStream', () => {
    it('should create a readable stream from a string', () => {
      const str = 'test string'
      const stream = stringToStream(str)
      
      expect(stream).toBeInstanceOf(StringReadable)
      expect(stream.readable).toBe(true)
    })
  })
  
  describe('streamToString', () => {
    it('should convert a stream to a string', async () => {
      const str = 'test string'
      const stream = stringToStream(str)
      
      const result = await streamToString(stream)
      expect(result).toBe(str)
    })
    
    it('should handle Buffer chunks', async () => {
      const str = 'test string'
      const stream = stringToStream(Buffer.from(str))
      
      const result = await streamToString(stream)
      expect(result).toBe(str)
    })
    
    it('should reject on stream error', async () => {
      const errorStream = stringToStream('test')
      
      // Override _read to emit an error
      errorStream._read = function() {
        this.emit('error', new Error('Test error'))
      }
      
      try {
        await streamToString(errorStream)
        fail('Should have thrown an error')
      } catch (error) {
        expect(error.message).toBe('Test error')
      }
    })
  })
})
