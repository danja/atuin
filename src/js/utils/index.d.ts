// Type definitions for atuin-utils
// Project: https://github.com/danja/atuin
// Definitions by: Claude Code

import { Dataset, Quad, Term, Literal, NamedNode } from '@rdfjs/types';

/**
 * Element input type for DOM utilities
 */
export type ElementInput = Element | Element[] | NodeList;

/**
 * CSS property value type
 */
export type CSSPropertyValue = string | Record<string, string>;

/**
 * Namespace split result
 */
export interface NamespaceSplit {
  namespace: string;
  name: string;
}

/**
 * RDF term validation result
 */
export interface TermValidation {
  isValid: boolean;
  termType?: string;
  error?: string;
}

/**
 * Dataset statistics
 */
export interface DatasetStats {
  tripleCount: number;
  subjectCount: number;
  predicateCount: number;
  objectCount: number;
  literalCount: number;
}

/**
 * Utility class for working with RDF datasets
 */
export declare class DatasetUtils {
  /**
   * Parse Turtle string to RDF dataset
   */
  static parseTurtle(turtleString: string): Promise<Dataset>;
  
  /**
   * Serialize RDF dataset to N-Triples
   */
  static datasetToNTriples(dataset: Dataset): Promise<string>;
  
  /**
   * Get basic statistics about a dataset
   */
  static getDatasetStats(dataset: Dataset): DatasetStats;
  
  /**
   * Filter dataset by predicate
   */
  static filterByPredicate(dataset: Dataset, predicate: NamedNode): Dataset;
  
  /**
   * Merge multiple datasets
   */
  static mergeDatasets(...datasets: Dataset[]): Dataset;
  
  /**
   * Convert dataset to array of quads
   */
  static datasetToQuads(dataset: Dataset): Quad[];
  
  /**
   * Create dataset from array of quads
   */
  static quadsToDataset(quads: Quad[]): Dataset;
}

/**
 * DOM utility functions (jQuery replacement)
 */
export declare class DOMUtils {
  /**
   * Select elements by CSS selector
   */
  static select(selector: string, context?: Element | Document): Element[];
  
  /**
   * Select a single element by CSS selector
   */
  static selectOne(selector: string, context?: Element | Document): Element | null;
  
  /**
   * Add event listener
   */
  static on(elements: ElementInput, eventType: string, handler: EventListener, options?: AddEventListenerOptions): void;
  
  /**
   * Remove event listener
   */
  static off(elements: ElementInput, eventType: string, handler: EventListener, options?: EventListenerOptions): void;
  
  /**
   * Add class to elements
   */
  static addClass(elements: ElementInput, className: string): void;
  
  /**
   * Remove class from elements
   */
  static removeClass(elements: ElementInput, className: string): void;
  
  /**
   * Toggle class on elements
   */
  static toggleClass(elements: ElementInput, className: string, force?: boolean): void;
  
  /**
   * Check if element has class
   */
  static hasClass(element: Element, className: string): boolean;
  
  /**
   * Get or set HTML content
   */
  static html(elements: ElementInput): string;
  static html(elements: ElementInput, html: string): void;
  
  /**
   * Get or set text content
   */
  static text(elements: ElementInput): string;
  static text(elements: ElementInput, text: string): void;
  
  /**
   * Get or set attribute value
   */
  static attr(elements: ElementInput, name: string): string;
  static attr(elements: ElementInput, name: string, value: string): void;
  
  /**
   * Remove attribute from elements
   */
  static removeAttr(elements: ElementInput, name: string): void;
  
  /**
   * Get or set CSS style property
   */
  static css(elements: ElementInput, property: string): string;
  static css(elements: ElementInput, property: string, value: string): void;
  static css(elements: ElementInput, properties: Record<string, string>): void;
  
  /**
   * Show elements (remove display: none)
   */
  static show(elements: ElementInput): void;
  
  /**
   * Hide elements (set display: none)
   */
  static hide(elements: ElementInput): void;
  
  /**
   * Create a new element
   */
  static createElement(tagName: string, attributes?: Record<string, string>, content?: string): Element;
  
  /**
   * Remove elements from DOM
   */
  static remove(elements: ElementInput): void;
  
  /**
   * Append elements to a parent
   */
  static append(parent: Element, elements: ElementInput): void;
  
  /**
   * Prepend elements to a parent
   */
  static prepend(parent: Element, elements: ElementInput): void;
}

/**
 * Utility class for working with RDF data
 */
export declare class RDFUtils {
  /**
   * Check if a term is a blank node
   */
  static isBlankNode(term: Term): boolean;
  
  /**
   * Check if a term is a named node (URI)
   */
  static isNamedNode(term: Term): boolean;
  
  /**
   * Check if a term is a literal
   */
  static isLiteral(term: Term): boolean;
  
  /**
   * Validate an RDF term
   */
  static validateTerm(term: Term): TermValidation;
  
  /**
   * Extract all prefixes from a dataset
   */
  static extractPrefixes(dataset: Dataset): Record<string, string>;
  
  /**
   * Create a prefixed name from a URI
   */
  static createPrefixedName(uri: string, prefixes: Record<string, string>): string;
}

/**
 * Utility class for stream operations
 */
export declare class StreamUtils {
  /**
   * Convert string to readable stream
   */
  static stringToStream(str: string): NodeJS.ReadableStream;
  
  /**
   * Convert readable stream to string
   */
  static streamToString(stream: NodeJS.ReadableStream): Promise<string>;
  
  /**
   * Create a transform stream
   */
  static createTransformStream(transformFn: (chunk: any) => any): NodeJS.Transform;
  
  /**
   * Pipe streams together
   */
  static pipeStreams(...streams: NodeJS.ReadWriteStream[]): NodeJS.ReadableStream;
}

/**
 * Utility class for working with RDF URIs
 */
export declare class URIUtils {
  /**
   * Split a URI into namespace and local name parts
   */
  static splitNamespace(uri: string | Term): NamespaceSplit;
  
  /**
   * Check if a string or term is an RDF literal
   */
  static isLiteral(value: string | Term): boolean;
  
  /**
   * Check if a string or term is a URI
   */
  static isURI(value: string | Term): boolean;
  
  /**
   * Check if a string or term is a blank node
   */
  static isBlankNode(value: string | Term): boolean;
  
  /**
   * Validate URI format
   */
  static isValidURI(uri: string): boolean;
  
  /**
   * Extract URI scheme
   */
  static getScheme(uri: string): string;
  
  /**
   * Resolve relative URI against base
   */
  static resolveURI(base: string, relative: string): string;
  
  /**
   * Create a shortened display name for a URI
   */
  static createDisplayName(uri: string | Term, maxLength?: number): string;
  
  /**
   * Check if URI is from a standard vocabulary
   */
  static isStandardVocabulary(uri: string, vocabularies?: string[]): boolean;
}

/**
 * Browser-compatible RDF extensions
 */
export declare namespace rdfExt {
  // Re-export relevant types and functions from rdf-ext
  export const factory: any;
  export const formats: any;
  export function dataset(): Dataset;
}