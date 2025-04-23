import rdf from 'rdf-ext'
import ParserN3 from '@rdfjs/parser-n3'
import SerializerNTriples from '@rdfjs/serializer-ntriples'
import namespace from '@rdfjs/namespace'
import { stringToStream, streamToString } from './StreamUtils.js'

/**
 * Utility class for working with RDF datasets
 */
export class DatasetUtils {
  /**
   * Parse Turtle string to RDF dataset
   * 
   * @param {string} turtleString - Turtle content to parse
   * @returns {Promise<Dataset>} Promise resolving to RDF dataset
   */
  static async parseTurtle(turtleString) {
    try {
      // Create parser instance
      const parser = new ParserN3({ factory: rdf })

      // Create input stream from string
      const input = stringToStream(turtleString)

      // Parse content to quad stream
      const quadStream = parser.import(input)

      // Import quad stream to dataset
      const dataset = await rdf.dataset().import(quadStream)

      return dataset
    } catch (error) {
      console.error('Error parsing Turtle:', error)
      throw error
    }
  }

  /**
   * Serialize RDF dataset to N-Triples
   * 
   * @param {Dataset} dataset - RDF dataset to serialize
   * @returns {Promise<string>} Promise resolving to N-Triples string
   */
  static async datasetToNTriples(dataset) {
    try {
      // Create serializer
      const serializer = new SerializerNTriples()

      // Create quad stream from dataset
      const input = dataset.toStream()

      // Serialize to N-Triples
      const output = serializer.import(input)

      // Collect output chunks and join to string
      return await streamToString(output)
    } catch (error) {
      console.error('Error serializing to N-Triples:', error)
      throw error
    }
  }

  /**
   * Create a namespace helper for common prefixes
   * 
   * @param {Object} prefixes - Prefix mappings
   * @returns {Object} Namespace helpers
   */
  static createNamespaces(prefixes) {
    const namespaces = {}

    for (const [prefix, uri] of Object.entries(prefixes)) {
      namespaces[prefix] = namespace(uri)
    }

    return namespaces
  }

  /**
   * Convert prefixes from parser to namespace helpers
   * 
   * @param {Object} prefixes - Prefix mappings from parser
   * @returns {Object} Namespace helpers
   */
  static prefixesToNamespaces(prefixes) {
    return this.createNamespaces(prefixes)
  }

  /**
   * Find all subjects in a dataset
   * 
   * @param {Dataset} dataset - RDF dataset to query
   * @returns {Array} Array of subject terms
   */
  static findSubjects(dataset) {
    const subjects = new Set()

    for (const quad of dataset) {
      subjects.add(quad.subject)
    }

    return Array.from(subjects)
  }

  /**
   * Find all predicates in a dataset
   * 
   * @param {Dataset} dataset - RDF dataset to query
   * @returns {Array} Array of predicate terms
   */
  static findPredicates(dataset) {
    const predicates = new Set()

    for (const quad of dataset) {
      predicates.add(quad.predicate)
    }

    return Array.from(predicates)
  }

  /**
   * Find all objects in a dataset
   * 
   * @param {Dataset} dataset - RDF dataset to query
   * @returns {Array} Array of object terms
   */
  static findObjects(dataset) {
    const objects = new Set()

    for (const quad of dataset) {
      objects.add(quad.object)
    }

    return Array.from(objects)
  }

  /**
   * Get all quads for a subject
   * 
   * @param {Dataset} dataset - RDF dataset to query
   * @param {Term} subject - Subject term to match
   * @returns {Dataset} Dataset of matching quads
   */
  static getQuadsForSubject(dataset, subject) {
    return dataset.match(subject)
  }

  /**
   * Create a new quad
   * 
   * @param {string|Term} subject - Subject term or URI
   * @param {string|Term} predicate - Predicate term or URI
   * @param {string|Term} object - Object term or URI
   * @param {string|Term} [graph=null] - Graph term or URI
   * @returns {Quad} The created quad
   */
  static createQuad(subject, predicate, object, graph = null) {
    // Convert strings to terms if needed
    if (typeof subject === 'string') {
      subject = rdf.namedNode(subject)
    }

    if (typeof predicate === 'string') {
      predicate = rdf.namedNode(predicate)
    }

    if (typeof object === 'string') {
      // Try to detect if this is a literal or URI
      if (object.startsWith('"') || object.startsWith("'") ||
        /^[+-]?\d+(\.\d+)?$/.test(object) ||
        object === 'true' || object === 'false') {
        object = rdf.literal(object)
      } else {
        object = rdf.namedNode(object)
      }
    }

    // Use DefaultGraph if not provided
    if (!graph) {
      graph = rdf.defaultGraph()
    } else if (typeof graph === 'string') {
      graph = rdf.namedNode(graph)
    }

    return rdf.quad(subject, predicate, object, graph)
  }

  /**
   * Create a new dataset from an array of quads
   * 
   * @param {Array} quads - Array of quads
   * @returns {Dataset} New dataset containing the quads
   */
  static createDataset(quads = []) {
    return rdf.dataset(quads)
  }
}