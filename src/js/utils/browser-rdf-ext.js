import rdfExt from 'rdf-ext'
import ParserN3 from '@rdfjs/parser-n3'
import SerializerNTriples from '@rdfjs/serializer-ntriples'
import namespace from '@rdfjs/namespace'
import { stringToStream, streamToString } from './StreamUtils.js'

/**
 * Browser-compatible RDF extensions that provide additional functionality
 * on top of the standard rdf-ext library
 */
const rdfExtBrowser = {
    /**
     * Core rdf-ext functionality
     */
    ...rdfExt,

    /**
     * Parse Turtle content to an RDF dataset
     * 
     * @param {string} turtleString - Turtle content to parse
     * @returns {Promise<Dataset>} Promise resolving to RDF dataset
     */
    async parseTurtle(turtleString) {
        try {
            // Create parser instance
            const parser = new ParserN3({ factory: rdfExt })

            // Convert string to stream and parse
            const input = stringToStream(turtleString)
            const quadStream = parser.import(input)

            // Import quad stream into dataset
            const dataset = await rdfExt.dataset().import(quadStream)

            return dataset
        } catch (error) {
            console.error('Error parsing Turtle:', error)
            throw error
        }
    },

    /**
     * Serialize dataset to N-Triples format
     * 
     * @param {Dataset} dataset - RDF dataset to serialize
     * @returns {Promise<string>} Promise resolving to N-Triples string
     */
    async datasetToNtriples(dataset) {
        try {
            // Create serializer
            const serializer = new SerializerNTriples()

            // Serialize dataset to stream
            const quadStream = dataset.toStream()
            const outputStream = serializer.import(quadStream)

            // Convert stream to string
            return await streamToString(outputStream)
        } catch (error) {
            console.error('Error serializing to N-Triples:', error)
            throw error
        }
    },

    /**
     * Create namespace helpers for common prefixes
     * 
     * @param {Object} prefixes - Prefix mappings
     * @returns {Object} Namespace helpers
     */
    createNamespaces(prefixes) {
        const ns = {}

        for (const [prefix, uri] of Object.entries(prefixes)) {
            ns[prefix] = namespace(uri)
        }

        return ns
    },

    /**
     * Extract triples with a specific subject from a dataset
     * 
     * @param {Dataset} dataset - Dataset to query
     * @param {string|Term} subject - Subject to match
     * @returns {Dataset} Dataset with matching triples
     */
    getQuadsForSubject(dataset, subject) {
        if (typeof subject === 'string') {
            subject = rdfExt.namedNode(subject)
        }

        return dataset.match(subject)
    },

    /**
     * Find subjects in a dataset
     * 
     * @param {Dataset} dataset - Dataset to query
     * @returns {Array} Array of subject terms
     */
    findSubjects(dataset) {
        const subjects = new Set()

        for (const quad of dataset) {
            subjects.add(quad.subject)
        }

        return Array.from(subjects)
    },

    /**
     * Create a triple (quad with default graph)
     * 
     * @param {string|Term} subject - Subject term or URI
     * @param {string|Term} predicate - Predicate term or URI
     * @param {string|Term} object - Object term or URI
     * @returns {Quad} The created quad
     */
    createTriple(subject, predicate, object) {
        // Convert strings to terms if needed
        if (typeof subject === 'string') {
            subject = rdfExt.namedNode(subject)
        }

        if (typeof predicate === 'string') {
            predicate = rdfExt.namedNode(predicate)
        }

        if (typeof object === 'string') {
            // Try to detect if this is a literal or URI
            if (object.startsWith('"') || object.startsWith("'") ||
                /^[+-]?\d+(\.\d+)?$/.test(object) ||
                object === 'true' || object === 'false') {
                object = rdfExt.literal(object)
            } else {
                object = rdfExt.namedNode(object)
            }
        }

        return rdfExt.quad(subject, predicate, object)
    }
}

export default rdfExtBrowser