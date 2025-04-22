import rdfExt from 'rdf-ext'
import N3Parser from '@rdfjs/parser-n3'
import SerializerJsonld from '@rdfjs/serializer-jsonld'
import SerializerNtriples from '@rdfjs/serializer-ntriples'
import { Readable } from 'readable-stream'

// Browser-compatible stream implementation
class BrowserReadable extends Readable {
    constructor(data) {
        super()
        this.data = data
        this.pushed = false
    }

    _read() {
        if (!this.pushed) {
            this.push(this.data)
            this.push(null)
            this.pushed = true
        }
    }
}

// Extend rdf-ext for browser environments
const rdfExtBrowser = {
    ...rdfExt,

    // Parse Turtle/N3 content using the proper parser
    async parseTurtle(turtleString) {
        try {
            // Create parser
            const parser = new N3Parser({ factory: rdfExt })

            // Create input stream from string
            const input = new BrowserReadable(turtleString)

            // Parse input stream to quad stream
            const quadStream = parser.import(input)

            // Create dataset and import quad stream
            const dataset = await rdfExt.dataset().import(quadStream)

            return dataset
        } catch (error) {
            console.error('Error parsing Turtle:', error)
            throw error
        }
    },

    // Parse JSON-LD content using the proper parser
    async parseJsonld(jsonldString) {
        try {
            // Assuming JsonLdParser is available
            const parser = new JsonLdParser({ factory: rdfExt })

            // Create input stream from string
            const input = new BrowserReadable(jsonldString)

            // Parse input stream to quad stream
            const quadStream = parser.import(input)

            // Create dataset and import quad stream
            const dataset = await rdfExt.dataset().import(quadStream)

            return dataset
        } catch (error) {
            console.error('Error parsing JSON-LD:', error)
            throw error
        }
    },

    // Serialize dataset to JSON-LD
    async datasetToJsonld(dataset) {
        try {
            const serializer = new SerializerJsonld()
            const input = dataset.toStream()
            const output = serializer.import(input)

            // Collect chunks
            const chunks = []

            return new Promise((resolve, reject) => {
                output.on('data', chunk => {
                    chunks.push(chunk)
                })

                output.on('error', err => {
                    reject(err)
                })

                output.on('end', () => {
                    resolve(chunks.join(''))
                })
            })
        } catch (error) {
            console.error('Error serializing to JSON-LD:', error)
            throw error
        }
    },

    // Serialize dataset to N-Triples
    async datasetToNtriples(dataset) {
        try {
            const serializer = new SerializerNtriples()
            const input = dataset.toStream()
            const output = serializer.import(input)

            // Collect chunks
            const chunks = []

            return new Promise((resolve, reject) => {
                output.on('data', chunk => {
                    chunks.push(chunk)
                })

                output.on('error', err => {
                    reject(err)
                })

                output.on('end', () => {
                    resolve(chunks.join(''))
                })
            })
        } catch (error) {
            console.error('Error serializing to N-Triples:', error)
            throw error
        }
    },

    // Stream string to Stream object
    stringToStream(str) {
        return new BrowserReadable(str)
    },

    // Stream to string utility
    streamToString(stream) {
        const chunks = []
        return new Promise((resolve, reject) => {
            stream.on('data', chunk => {
                chunks.push(Buffer.from(chunk))
            })
            stream.on('error', err => reject(err))
            stream.on('end', () => {
                resolve(Buffer.concat(chunks).toString('utf8'))
            })
        })
    }
}

export default rdfExtBrowser