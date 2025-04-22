import { isBrowser } from './BrowserUtils.js'
import logger from './Logger.js'

class RDFUtils {
    static async readDataset(filename) {
        if (isBrowser()) {
            try {
                const response = await fetch(filename)
                if (!response.ok) {
                    throw new Error(`Failed to load dataset: ${filename}`)
                }
                const turtleText = await response.text()

                // Import the browser-compatible extension
                const rdfExt = await import('./browser-rdf-ext.js').then(m => m.default)

                // Determine format based on file extension
                if (filename.endsWith('.ttl') || filename.endsWith('.nt')) {
                    // For a complete implementation, use proper N3 parser
                    return await rdfExt.parseTurtle(turtleText)
                } else if (filename.endsWith('.jsonld')) {
                    // For JSON-LD you'd use the proper JSON-LD parser
                    // This is a placeholder
                    logger.warn('JSON-LD parsing not yet implemented in browser')
                    return rdfExt.dataset()
                } else {
                    // Default to turtle parser
                    return await rdfExt.parseTurtle(turtleText)
                }
            } catch (error) {
                logger.error(`Error loading dataset in browser: ${error.message}`)
                throw error
            }
        } else {
            try {
                const rdfExt = await import('rdf-ext').then(m => m.default)
                const { fromFile } = await import('rdf-utils-fs')
                const stream = fromFile(filename)
                const dataset = await rdfExt.dataset().import(stream)
                return dataset
            } catch (error) {
                logger.error(`Error loading dataset in Node.js: ${error.message}`)
                throw error
            }
        }
    }

    static async writeDataset(dataset, filename) {
        if (isBrowser()) {
            try {
                // Import the browser-compatible extension
                const rdfExt = await import('./browser-rdf-ext.js').then(m => m.default)

                // Determine serializer based on filename extension
                let serializedData = ''

                if (filename.endsWith('.ttl')) {
                    // In a complete implementation, you'd use proper serializer
                    // This is a simplified approach
                    serializedData = dataset.toString()
                } else if (filename.endsWith('.jsonld')) {
                    // For JSON-LD you'd use the proper serializer
                    logger.warn('JSON-LD serialization not yet implemented in browser')
                    serializedData = dataset.toString()
                } else {
                    // Default to N-Triples format
                    serializedData = dataset.toString()
                }

                // Create download
                const blob = new Blob([serializedData], { type: 'text/plain' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = filename.split('/').pop() || 'dataset.ttl'
                document.body.appendChild(a)
                a.click()

                setTimeout(() => {
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                }, 0)

                return true
            } catch (error) {
                logger.error(`Error saving dataset in browser: ${error.message}`)
                throw error
            }
        } else {
            try {
                const { toFile } = await import('rdf-utils-fs')
                await toFile(dataset.toStream(), filename)
                return true
            } catch (error) {
                logger.error(`Error saving dataset in Node.js: ${error.message}`)
                throw error
            }
        }
    }

    static async loadDataset(relativePath) {
        try {
            let filePath

            if (isBrowser()) {
                filePath = relativePath
            } else {
                const { fileURLToPath } = await import('url')
                const nodePath = await import('path')
                const __filename = fileURLToPath(import.meta.url)
                const __dirname = nodePath.dirname(__filename)
                const rootDir = nodePath.resolve(__dirname, '../..')
                filePath = nodePath.join(rootDir, relativePath)
            }

            logger.debug(`Loading RDF dataset from: ${filePath}`)
            return await RDFUtils.readDataset(filePath)
        } catch (error) {
            logger.error(`Error loading dataset: ${error.message}`)
            logger.error(`Stack: ${error.stack}`)
            throw error
        }
    }
}

export default RDFUtils