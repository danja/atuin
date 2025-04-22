import { DatasetUtils } from '../../../src/js/utils/DatasetUtils.js'
import rdf from 'rdf-ext'
import { stringToStream, streamToString } from '../../../src/js/utils/StreamUtils.js'

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
      const turtle = `
        @prefix ex: <http://example.org/> .
        ex:subject ex:predicate ex:object .
      `

      const dataset = await DatasetUtils.parseTurtle(turtle)

      expect(dataset).toBeDefined()
      expect(dataset.size).toBe(1)

      const quad = dataset.toArray()[0]
      expect(quad.subject.value).toBe('http://example.org/subject')
      expect(quad.predicate.value).toBe('http://example.org/predicate')
      expect(quad.object.value).toBe('http://example.org/object')
    })

    it('should throw on invalid Turtle content', async () => {
      const invalidTurtle = `
        @prefix ex: <http://example.org/> .
        ex:subject ex:predicate . # Missing object
      `

      let error
      try {
        await DatasetUtils.parseTurtle(invalidTurtle)
      } catch (e) {
        error = e
      }

      expect(error).toBeDefined()
    })
  })

  describe('datasetToNTriples', () => {
    it('should serialize dataset to N-Triples', async () => {
      const quad = rdf.quad(
        rdf.namedNode('http://example.org/subject'),
        rdf.namedNode('http://example.org/predicate'),
        rdf.namedNode('http://example.org/object')
      )

      const dataset = rdf.dataset([quad])

      const ntriples = await DatasetUtils.datasetToNTriples(dataset)

      expect(ntriples).toContain('<http://example.org/subject>')
      expect(ntriples).toContain('<http://example.org/predicate>')
      expect(ntriples).toContain('<http://example.org/object>')
      expect(ntriples).toContain(' .')
    })
  })

  describe('createNamespaces', () => {
    it('should create namespace helpers from prefixes', () => {
      const prefixes = {
        ex: 'http://example.org/',
        rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
      }

      const ns = DatasetUtils.createNamespaces(prefixes)

      expect(ns.ex).toBeDefined()
      expect(ns.rdf).toBeDefined()

      const typeNode = ns.rdf.type
      expect(typeNode.value).toBe('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')

      const personNode = ns.ex.Person
      expect(personNode.value).toBe('http://example.org/Person')
    })
  })

  describe('findSubjects', () => {
    it('should find all subjects in a dataset', () => {
      const quad1 = rdf.quad(
        rdf.namedNode('http://example.org/subject1'),
        rdf.namedNode('http://example.org/predicate'),
        rdf.namedNode('http://example.org/object')
      )

      const quad2 = rdf.quad(
        rdf.namedNode('http://example.org/subject2'),
        rdf.namedNode('http://example.org/predicate'),
        rdf.namedNode('http://example.org/object')
      )

      const dataset = rdf.dataset([quad1, quad2])

      const subjects = DatasetUtils.findSubjects(dataset)

      expect(subjects.length).toBe(2)
      expect(subjects[0].value).toBe('http://example.org/subject1')
      expect(subjects[1].value).toBe('http://example.org/subject2')
    })
  })

  describe('getQuadsForSubject', () => {
    it('should get all quads for a subject', () => {
      const subject = rdf.namedNode('http://example.org/subject')

      const quad1 = rdf.quad(
        subject,
        rdf.namedNode('http://example.org/predicate1'),
        rdf.namedNode('http://example.org/object1')
      )

      const quad2 = rdf.quad(
        subject,
        rdf.namedNode('http://example.org/predicate2'),
        rdf.namedNode('http://example.org/object2')
      )

      const quad3 = rdf.quad(
        rdf.namedNode('http://example.org/otherSubject'),
        rdf.namedNode('http://example.org/predicate3'),
        rdf.namedNode('http://example.org/object3')
      )

      const dataset = rdf.dataset([quad1, quad2, quad3])

      const result = DatasetUtils.getQuadsForSubject(dataset, subject)

      expect(result.size).toBe(2)

      // Check that the right quads were matched
      const quads = result.toArray()
      expect(quads.some(q =>
        q.predicate.value === 'http://example.org/predicate1' &&
        q.object.value === 'http://example.org/object1'
      )).toBe(true)

      expect(quads.some(q =>
        q.predicate.value === 'http://example.org/predicate2' &&
        q.object.value === 'http://example.org/object2'
      )).toBe(true)
    })
  })

  describe('createQuad', () => {
    it('should create a quad from terms', () => {
      const subject = rdf.namedNode('http://example.org/subject')
      const predicate = rdf.namedNode('http://example.org/predicate')
      const object = rdf.namedNode('http://example.org/object')

      const quad = DatasetUtils.createQuad(subject, predicate, object)

      expect(quad.subject).toBe(subject)
      expect(quad.predicate).toBe(predicate)
      expect(quad.object).toBe(object)
      expect(quad.graph.termType).toBe('DefaultGraph')
    })

    it('should create a quad from URIs', () => {
      const quad = DatasetUtils.createQuad(
        'http://example.org/subject',
        'http://example.org/predicate',
        'http://example.org/object'
      )

      expect(quad.subject.termType).toBe('NamedNode')
      expect(quad.subject.value).toBe('http://example.org/subject')

      expect(quad.predicate.termType).toBe('NamedNode')
      expect(quad.predicate.value).toBe('http://example.org/predicate')

      expect(quad.object.termType).toBe('NamedNode')
      expect(quad.object.value).toBe('http://example.org/object')

      expect(quad.graph.termType).toBe('DefaultGraph')
    })

    it('should detect literal objects', () => {
      const quad1 = DatasetUtils.createQuad(
        'http://example.org/subject',
        'http://example.org/predicate',
        '"string literal"'
      )

      const quad2 = DatasetUtils.createQuad(
        'http://example.org/subject',
        'http://example.org/predicate',
        '42'
      )

      expect(quad1.object.termType).toBe('Literal')
      expect(quad1.object.value).toBe('"string literal"')

      expect(quad2.object.termType).toBe('Literal')
      expect(quad2.object.value).toBe('42')
    })

    it('should handle named graphs', () => {
      const quad = DatasetUtils.createQuad(
        'http://example.org/subject',
        'http://example.org/predicate',
        'http://example.org/object',
        'http://example.org/graph'
      )

      expect(quad.graph.termType).toBe('NamedNode')
      expect(quad.graph.value).toBe('http://example.org/graph')
    })
  })

  describe('createDataset', () => {
    it('should create an empty dataset', () => {
      const dataset = DatasetUtils.createDataset()
      expect(dataset.size).toBe(0)
    })

    it('should create a dataset from quads', () => {
      const quad1 = rdf.quad(
        rdf.namedNode('http://example.org/subject1'),
        rdf.namedNode('http://example.org/predicate1'),
        rdf.namedNode('http://example.org/object1')
      )

      const quad2 = rdf.quad(
        rdf.namedNode('http://example.org/subject2'),
        rdf.namedNode('http://example.org/predicate2'),
        rdf.namedNode('http://example.org/object2')
      )

      const dataset = DatasetUtils.createDataset([quad1, quad2])

      expect(dataset.size).toBe(2)
      expect(dataset.has(quad1)).toBe(true)
      expect(dataset.has(quad2)).toBe(true)
    })
  })