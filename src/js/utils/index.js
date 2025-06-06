/**
 * Atuin Utils - A collection of utilities for RDF/Turtle editing and DOM manipulation
 * @module atuin-utils
 */

export { DatasetUtils } from './DatasetUtils.js';
export { DOMUtils } from './DomUtils.js';
export { RDFUtils } from './RDFUtils.js';
export { StreamUtils } from './StreamUtils.js';
export { URIUtils } from './URIUtils.js';

// Re-export browser-rdf-ext as a namespace
import * as rdfExt from './browser-rdf-ext.js';
export { rdfExt };