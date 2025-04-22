/**
 * Utility class for working with RDF URIs
 */
export class URIUtils {
  /**
   * Split a URI into namespace and local name parts
   * 
   * @param {string|Object} uri - URI string or RDFJS term
   * @returns {Object} Object with namespace and name properties
   */
  static splitNamespace(uri) {
    // Handle RDFJS term objects
    if (uri && typeof uri === 'object' && uri.value) {
      uri = uri.value
    }

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
   * Check if a string or term is an RDF literal
   * 
   * @param {string|Object} value - The value to check
   * @returns {boolean} - True if it's a literal
   */
  static isLiteral(value) {
    // Handle RDFJS term objects
    if (value && typeof value === 'object') {
      // Check if it's a Literal term
      if (value.termType === 'Literal') {
        return true
      }

      // If it has a value property, extract that
      if (value.value) {
        value = value.value
      } else {
        return false
      }
    }

    if (!value || typeof value !== 'string') {
      return false
    }

    // Check for literal indicators in the string value
    return (
      value.startsWith('"') ||
      value.startsWith("'") ||
      /^[+-]?\d+(\.\d+)?$/.test(value) ||
      value === 'true' ||
      value === 'false'
    )
  }

  /**
   * Shrink a URI using namespace prefixes
   * 
   * @param {string|Object} uri - URI string or RDFJS term
   * @param {Object} prefixes - Prefix mappings
   * @returns {string} The shortened URI
   */
  static shrinkUri(uri, prefixes) {
    // Handle RDFJS term objects
    if (uri && typeof uri === 'object' && uri.value) {
      uri = uri.value
    }

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
   * Expand a prefixed URI to its full form
   * 
   * @param {string|Object} prefixed - Prefixed URI string or RDFJS term
   * @param {Object} prefixes - Prefix mappings
   * @returns {string} The expanded URI
   */
  static expandPrefixed(prefixed, prefixes) {
    // Handle RDFJS term objects
    if (prefixed && typeof prefixed === 'object' && prefixed.value) {
      prefixed = prefixed.value
    }

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

    // Return original if prefix not found
    return prefixed
  }

  /**
   * Extract base URI from Turtle content
   * 
   * @param {string} content - Turtle content
   * @returns {string|null} The base URI or null if not found
   */
  static extractBaseUri(content) {
    if (!content || typeof content !== 'string') {
      return null
    }

    const match = content.match(/@base\s+<([^>]+)>\s*\./)
    return match ? match[1] : null
  }

  /**
   * Extract prefix declarations from Turtle content
   * 
   * @param {string} content - Turtle content
   * @returns {Object} Map of prefix to namespace
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
   * Get a display label for a URI
   * 
   * @param {string|Object} uri - URI string or RDFJS term
   * @param {Object} prefixes - Prefix mappings
   * @param {number} maxLength - Maximum length for the label
   * @returns {string} The display label
   */
  static getLabel(uri, prefixes, maxLength = 30) {
    // Handle RDFJS term objects
    if (uri && typeof uri === 'object') {
      // If it's a Literal, format it appropriately
      if (uri.termType === 'Literal') {
        const value = uri.value || ''
        // For shorter literals, just return the value
        if (value.length <= maxLength || maxLength === 0) {
          return `"${value}"${uri.language ? `@${uri.language}` : ''}`
        }
        // For longer literals, truncate
        return `"${value.substring(0, maxLength - 3)}..."${uri.language ? `@${uri.language}` : ''}`
      }

      // For other term types, extract the value
      if (uri.value) {
        uri = uri.value
      }
    }

    if (!uri || typeof uri !== 'string') {
      return ''
    }

    // For literals, just return them
    if (this.isLiteral(uri)) {
      if (maxLength > 0 && uri.length > maxLength) {
        return `${uri.substring(0, maxLength - 3)}...`
      }
      return uri
    }

    // Try to shrink using prefixes
    const shortened = this.shrinkUri(uri, prefixes)

    // If we couldn't shrink, use the local name
    if (shortened === uri) {
      const parts = this.splitNamespace(uri)
      return parts.name || uri
    }

    // Truncate if too long
    if (maxLength > 0 && shortened.length > maxLength) {
      return `${shortened.substring(0, maxLength - 3)}...`
    }

    return shortened
  }
}