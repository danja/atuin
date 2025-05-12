import { JSDOM } from 'jsdom'

const { window } = new JSDOM('<!doctype html><html><body></body></html>')
global.window = window
global.document = window.document
global.HTMLElement = window.HTMLElement
global.Node = window.Node
global.getComputedStyle = window.getComputedStyle

if (!global.MutationObserver) {
    global.MutationObserver = window.MutationObserver || window.WebKitMutationObserver
}

if (!global.window.requestAnimationFrame) {
    global.window.requestAnimationFrame = function (cb) {
        return setTimeout(cb, 0)
    }
    global.window.cancelAnimationFrame = function (id) {
        clearTimeout(id)
    }
}
