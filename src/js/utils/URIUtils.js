/**
 * Utilities for handling URIs and IRIs in RDF
 * @module utils/URIUtils
 */

/**
 * Utilities for URI/IRI handling
 */
export class URIUtils {
  /**
   * Split a URI into namespace and local name
   * @param {string} uri - The URI to split
   * @returns {Object} - Object with namespace and name properties
   */
  static splitNamespace(uri) {
    if (!uri || typeof uri !== 'string') {
      return { namespace: '', name: '' }
    }

    // Handle literals
    if (this.isLiteral(uri)) {
      return { namespace: '', name: uri }
    }

    // Find the last hash or slash
    const lastHash = uri.lastIndexOf('#')
    const lastSlash = uri.lastIndexOf('/')
    const pos = Math.max(lastHash, lastSlash) + 1

    if (pos <= 0) {
      return { namespace: '', name: uri }
    }

    return {
      namespace: uri.substring(0, pos),
      name: uri.substring(pos)
    }
  }

  /**
   * Check if a string is an RDF literal
   * @param {string} value - The value to check
   * @returns {boolean} - True if it's a literal
   */
  static isLiteral(value) {
    if (!value || typeof value !== 'string') {
      return false
    }

    // Simple check for common literal patterns
    return (
      value.startsWith('"') ||
      value.startsWith("'") ||
      /^[+-]?\d+(\.\d+)?$/.test(value) || // Numbers
      value === 'true' ||
      value === 'false'
    )
  }

  /**
   * Shrink a URI using prefixes
   * @param {string} uri - The URI to shrink
   * @param {Object} prefixes - The prefix mappings
   * @returns {string} - The shortened URI
   */
  static shrinkUri(uri, prefixes) {
    if (!uri || typeof uri !== 'string' || this.isLiteral(uri)) {
      return uri
    }

    for (const [prefix, namespace] of Object.entries(prefixes)) {
      if (uri.startsWith(namespace)) {
        return `${prefix}:${uri.substring(namespace.length)}`
      }
    }

    return uri
  }

  /**
   * Expand a prefixed name to a full URI
   * @param {string} prefixed - The prefixed name
   * @param {Object} prefixes - The prefix mappings
   * @returns {string} - The expanded URI
   */
  static expandPrefixed(prefixed, prefixes) {
    if (!prefixed || typeof prefixed !== 'string' || this.isLiteral(prefixed)) {
      return prefixed
    }

    const colonPos = prefixed.indexOf(':')
    if (colonPos === -1) {
      return prefixed
    }

    const prefix = prefixed.substring(0, colonPos)
    const local = prefixed.substring(colonPos + 1)

    if (prefix === 'a') {
      return 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
    }

    if (prefixes[prefix]) {
      return `${prefixes[prefix]}${local}`
    }

    // If prefix not found, return as is
    return prefixed
  }

  /**
   * Extract the base URI from Turtle content
   * @param {string} content - The content to analyze
   * @returns {string|null} - The base URI or null if not found
   */
  static extractBaseUri(content) {
    if (!content || typeof content !== 'string') {
      return null
    }

    const match = content.match(/@base\s+<([^>]+)>\s*\./)
    return match ? match[1] : null
  }

  /**
   * Extract prefixes from Turtle content
   * @param {string} content - The content to analyze
   * @returns {Object} - The prefix mappings
   */
  static extractPrefixes(content) {
    if (!content || typeof content !== 'string') {
      return {}
    }

    const prefixes = {}
    const regex = /@prefix\s+([a-zA-Z0-9_-]+):\s+<([^>]+)>\s*\./g

    let match
    while ((match = regex.exec(content)) !== null) {
      prefixes[match[1]] = match[2]
    }

    return prefixes
  }

  /**
   * Get a label for display from a URI
   * @param {string} uri - The URI
   * @param {Object} prefixes - The prefix mappings
   * @param {number} maxLength - Maximum label length
   * @returns {string} - The label
   */
  static getLabel(uri, prefixes, maxLength = 30) {
    if (!uri || typeof uri !== 'string') {
      return ''
    }

    // For literals, just return them
    if (this.isLiteral(uri)) {
      return uri
    }

    // Try to shrink using prefixes
    const shortened = this.shrinkUri(uri, prefixes)

    // If we couldn't shrink, use the local name
    if (shortened === uri) {
      const parts = this.splitNamespace(uri)
      return parts.name || uri
    }

    // Trim if too long
    if (maxLength > 0 && shortened.length > maxLength) {
      return `${shortened.substring(0, maxLength - 3)}...`
    }

    return shortened
  }
}