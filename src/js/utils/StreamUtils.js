import { Readable } from 'readable-stream'

/**
 * Custom Readable stream implementation
 */
export class StringReadable extends Readable {
  /**
   * Create a new StringReadable instance
   * 
   * @param {string|Buffer} data - Data to stream
   */
  constructor(data) {
    super()
    this.data = data
    this.pushed = false
  }

  /**
   * Implementation of Readable _read method
   */
  _read() {
    if (!this.pushed) {
      this.push(this.data)
      this.push(null)
      this.pushed = true
    }
  }
}

/**
 * Convert a string to a readable stream
 * 
 * @param {string} str - String to convert to stream
 * @returns {Readable} A readable stream
 */
export function stringToStream(str) {
  return new StringReadable(str)
}

/**
 * Convert a stream to a string
 * 
 * @param {Readable} stream - Stream to convert
 * @returns {Promise<string>} Promise resolving to the string content
 */
export function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    
    stream.on('data', chunk => {
      chunks.push(typeof chunk === 'string' ? chunk : chunk.toString('utf8'))
    })
    
    stream.on('error', err => reject(err))
    
    stream.on('end', () => {
      resolve(chunks.join(''))
    })
  })
}
