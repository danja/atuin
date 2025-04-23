import { JSDOM } from 'jsdom'

const { window } = new JSDOM('<!doctype html><html><body></body></html>')
global.window = window
global.document = window.document
global.HTMLElement = window.HTMLElement
global.Node = window.Node
// global.navigator = window.navigator // Removed because it's read-only in Node.js
global.getComputedStyle = window.getComputedStyle

// Polyfill MutationObserver for CodeMirror and other browser code
if (!global.MutationObserver) {
    global.MutationObserver = window.MutationObserver || window.WebKitMutationObserver
}

// Polyfill requestAnimationFrame and cancelAnimationFrame
if (!global.window.requestAnimationFrame) {
    global.window.requestAnimationFrame = function (cb) {
        return setTimeout(cb, 0)
    }
    global.window.cancelAnimationFrame = function (id) {
        clearTimeout(id)
    }
} 