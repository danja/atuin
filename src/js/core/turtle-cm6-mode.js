// Adapted from src/js/ui/TurtleMode.js for CodeMirror 6 StreamLanguage

// Helper function from the original mode
function wordRegexp(words) {
    return new RegExp("^(?:" + words.join("|") + ")$", "i")
}

const keywords = wordRegexp(["@prefix", "@base"])
const typeKeyword = wordRegexp(["a"]) // Treat 'a' specially
const booleanLiteral = wordRegexp(["true", "false"])
// Original 'ops' was empty, likely not needed
// const operatorChars = /[*/+\-<>=&|]/; // Turtle doesn't really have operators like SPARQL

function tokenBase(stream, state) {
    const ch = stream.next()
    state.curPunc = null // Reset punctuation marker

    // Comments
    if (ch == "#") {
        stream.skipToEnd()
        return "comment"
    }

    // URIs <...>
    if (ch == "<" && !stream.match(/^[\s\u00a0=]/, false)) {
        stream.match(/^[^\s\u00a0>]*>?/)
        return "link" // Use 'link' for URIs in CM6
    }

    // Literals "..." or '...'
    if (ch == '"' || ch == "'") {
        // Check for triple quotes
        if (stream.match(ch + ch)) {
            state.tokenize = tokenTripleString(ch)
            return state.tokenize(stream, state)
        }
        state.tokenize = tokenSingleString(ch)
        return state.tokenize(stream, state)
    }

    // Language tags or datatypes ^^
    if (ch == '@') {
        stream.eatWhile(/[a-zA-Z\-]/) // Consume language tag
        return "string-2" // Style for language tags
    }
    if (ch == '^') {
        if (stream.peek() === '^') {
            stream.next() // consume second ^
            // Now expect a URI or prefixed name for the datatype
            return "operator" // Style for ^^ delimiter
        }
    }


    // Punctuation .,;[{}()
    if (/[.,;\[\]{}()]/.test(ch)) {
        state.curPunc = ch
        return "punctuation" // Use a specific CM6 style
    }

    // Variables (less common in Turtle, more SPARQL, but handle ?)
    if (ch == '?') {
        stream.eatWhile(/[\w\d]/)
        return "variableName-2" // Style for variables
    }

    // Blank nodes _:
    if (ch == '_') {
        if (stream.peek() == ':') {
            stream.next() // consume ':'
            stream.eatWhile(/[\w\d]/)
            return "variableName" // Style for blank node labels
        }
    }

    // Prefixed names (potentially) - starts with a letter or underscore
    // Note: More complex IRI character ranges are not fully handled here for simplicity
    if (/[a-zA-Z_]/.test(ch)) {
        stream.eatWhile(/[\w\d\-_.]/) // Allow more chars in local names
        const word = stream.current()

        if (stream.peek() == ':') {
            // It's potentially a prefix part
            return "namespace" // Style for the prefix part
        } else if (keywords.test(word)) {
            return "keyword" // Style for @prefix, @base
        } else if (typeKeyword.test(word)) {
            // Special case for 'a' predicate shortcut
            return "type"
        } else if (booleanLiteral.test(word)) {
            return "atom" // Style for boolean literals true/false
        } else {
            // Could be a bare local name (invalid Turtle without a base IRI or prefix)
            // or part of a prefixed name if ':' was consumed earlier.
            // Let's style it as a potential variable/identifier for now.
            return "variableName"
        }
    }

    // Numbers (integer, decimal, double) - basic handling
    if (/\d/.test(ch) || (ch == '.' && /\d/.test(stream.peek() || '')) || ((ch == '+' || ch == '-') && /\d/.test(stream.peek() || ''))) {
        stream.eatWhile(/[\d]/)
        if (stream.eat('.')) {
            stream.eatWhile(/[\d]/) // decimal
        }
        if (stream.eat(/[eE]/)) {
            stream.eat(/[-+]/) // exponent sign
            stream.eatWhile(/[\d]/) // exponent value
        }
        return "number"
    }

    // If we see a colon not preceded by anything specific, treat it as separator/operator
    if (ch == ":") {
        return "operator"
    }


    // Fallback for anything else
    stream.eatWhile(/[^\s\u00a0]/) // Consume till whitespace
    return "error" // Mark unrecognized sequences as errors
}

// Tokenizer for single-quoted strings
function tokenSingleString(quote) {
    return function (stream, state) {
        let escaped = false
        let next
        while ((next = stream.next()) != null) {
            if (next == quote && !escaped) {
                state.tokenize = tokenBase // End of string
                break
            }
            escaped = !escaped && next == "\\"
        }
        return "string" // Style for strings
    }
}

// Tokenizer for triple-quoted strings
function tokenTripleString(quote) {
    return function (stream, state) {
        let escaped = false
        let counter = 0 // Count closing quotes
        let next
        while ((next = stream.next()) != null) {
            if (!escaped && next == quote) {
                counter++
                if (counter == 3) { // Triple quote found
                    state.tokenize = tokenBase // End of string
                    break
                }
            } else {
                counter = 0 // Reset counter if character is not a quote
            }
            escaped = !escaped && next == "\\"
        }
        return "string" // Style for strings
    }
}


// Export the mode object for StreamLanguage.define
export const turtleMode = {
    startState: function () {
        return {
            tokenize: tokenBase,
            curPunc: null,
            // No complex context needed for basic stream parsing
            // Indentation/nesting is better handled by CM6's structured language support if required
        }
    },

    token: function (stream, state) {
        if (stream.sol()) {
            state.curPunc = null // Reset punctuation at line start
        }
        // Skip whitespace
        if (stream.eatSpace()) return null

        // Call the current tokenizer function
        const style = state.tokenize(stream, state)
        return style
    },

    // Basic line comment handling
    lineComment: "#"

    // Indentation is generally omitted for StreamLanguage modes in CM6
    // as it relies on simpler tokenization. For proper indentation based
    // on Turtle's structure, a Lezer grammar would be needed.
}