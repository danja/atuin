/**
 * Utility functions for DOM manipulation (jQuery replacement)
 * TODO remove - probably not needed
 * 
 * @module utils/DOMUtils
 */

/**
 * DOM utility functions
 */
export class DOMUtils {
  /**
   * Select elements by CSS selector
   * @param {string} selector - CSS selector
   * @param {Element} [context=document] - Context element
   * @returns {Element[]} - Array of matching elements
   */
  static select(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
  }

  /**
   * Select a single element by CSS selector
   * @param {string} selector - CSS selector
   * @param {Element} [context=document] - Context element
   * @returns {Element|null} - Matching element or null
   */
  static selectOne(selector, context = document) {
    return context.querySelector(selector);
  }

  /**
   * Add event listener
   * @param {Element|Element[]|NodeList} elements - Element(s)
   * @param {string} eventType - Event type
   * @param {Function} handler - Event handler
   * @param {Object} [options] - Event options
   */
  static on(elements, eventType, handler, options) {
    const elementList = this._normalizeElements(elements);

    elementList.forEach(el => {
      el.addEventListener(eventType, handler, options);
    });
  }

  /**
   * Remove event listener
   * @param {Element|Element[]|NodeList} elements - Element(s)
   * @param {string} eventType - Event type
   * @param {Function} handler - Event handler
   * @param {Object} [options] - Event options
   */
  static off(elements, eventType, handler, options) {
    const elementList = this._normalizeElements(elements);

    elementList.forEach(el => {
      el.removeEventListener(eventType, handler, options);
    });
  }

  /**
   * Add class to elements
   * @param {Element|Element[]|NodeList} elements - Element(s)
   * @param {string} className - Class name to add
   */
  static addClass(elements, className) {
    const elementList = this._normalizeElements(elements);

    elementList.forEach(el => {
      el.classList.add(className);
    });
  }

  /**
   * Remove class from elements
   * @param {Element|Element[]|NodeList} elements - Element(s)
   * @param {string} className - Class name to remove
   */
  static removeClass(elements, className) {
    const elementList = this._normalizeElements(elements);

    elementList.forEach(el => {
      el.classList.remove(className);
    });
  }

  /**
   * Toggle class on elements
   * @param {Element|Element[]|NodeList} elements - Element(s)
   * @param {string} className - Class name to toggle
   * @param {boolean} [force] - Force add or remove
   */
  static toggleClass(elements, className, force) {
    const elementList = this._normalizeElements(elements);

    elementList.forEach(el => {
      el.classList.toggle(className, force);
    });
  }

  /**
   * Check if element has class
   * @param {Element} element - Element
   * @param {string} className - Class name to check
   * @returns {boolean} - True if element has class
   */
  static hasClass(element, className) {
    return element.classList.contains(className);
  }

  /**
   * Get or set HTML content
   * @param {Element|Element[]|NodeList} elements - Element(s)
   * @param {string} [html] - HTML content to set
   * @returns {string|undefined} - HTML content if getting
   */
  static html(elements, html) {
    const elementList = this._normalizeElements(elements);

    if (typeof html === 'undefined') {
      return elementList[0]?.innerHTML || '';
    }

    elementList.forEach(el => {
      el.innerHTML = html;
    });
  }

  /**
   * Get or set text content
   * @param {Element|Element[]|NodeList} elements - Element(s)
   * @param {string} [text] - Text content to set
   * @returns {string|undefined} - Text content if getting
   */
  static text(elements, text) {
    const elementList = this._normalizeElements(elements);

    if (typeof text === 'undefined') {
      return elementList[0]?.textContent || '';
    }

    elementList.forEach(el => {
      el.textContent = text;
    });
  }

  /**
   * Get or set attribute value
   * @param {Element|Element[]|NodeList} elements - Element(s)
   * @param {string} name - Attribute name
   * @param {string} [value] - Attribute value to set
   * @returns {string|undefined} - Attribute value if getting
   */
  static attr(elements, name, value) {
    const elementList = this._normalizeElements(elements);

    if (typeof value === 'undefined') {
      return elementList[0]?.getAttribute(name) || '';
    }

    elementList.forEach(el => {
      el.setAttribute(name, value);
    });
  }

  /**
   * Remove attribute from elements
   * @param {Element|Element[]|NodeList} elements - Element(s)
   * @param {string} name - Attribute name to remove
   */
  static removeAttr(elements, name) {
    const elementList = this._normalizeElements(elements);

    elementList.forEach(el => {
      el.removeAttribute(name);
    });
  }

  /**
   * Get or set CSS style property
   * @param {Element|Element[]|NodeList} elements - Element(s)
   * @param {string|Object} property - CSS property name or object of properties
   * @param {string} [value] - CSS value to set
   * @returns {string|undefined} - CSS value if getting
   */
  static css(elements, property, value) {
    const elementList = this._normalizeElements(elements);

    if (typeof property === 'object') {
      // Set multiple properties
      elementList.forEach(el => {
        Object.keys(property).forEach(prop => {
          el.style[prop] = property[prop];
        });
      });
      return;
    }

    if (typeof value === 'undefined') {
      // Get property value
      const el = elementList[0];
      return el ? window.getComputedStyle(el)[property] : '';
    }

    // Set property value
    elementList.forEach(el => {
      el.style[property] = value;
    });
  }

  /**
   * Show elements (remove display: none)
   * @param {Element|Element[]|NodeList} elements - Element(s)
   */
  static show(elements) {
    const elementList = this._normalizeElements(elements);

    elementList.forEach(el => {
      el.style.display = '';
    });
  }

  /**
   * Hide elements (set display: none)
   * @param {Element|Element[]|NodeList} elements - Element(s)
   */
  static hide(elements) {
    const elementList = this._normalizeElements(elements);

    elementList.forEach(el => {
      el.style.display = 'none';
    });
  }

  /**
   * Create a new element
   * @param {string} tagName - Tag name
   * @param {Object} [attributes] - Attributes to set
   * @param {string} [content] - Text content
   * @returns {Element} - Created element
   */
  static createElement(tagName, attributes = {}, content = '') {
    const element = document.createElement(tagName);

    Object.keys(attributes).forEach(key => {
      element.setAttribute(key, attributes[key]);
    });

    if (content) {
      element.textContent = content;
    }

    return element;
  }

  /**
   * Remove elements from DOM
   * @param {Element|Element[]|NodeList} elements - Element(s)
   */
  static remove(elements) {
    const elementList = this._normalizeElements(elements);

    elementList.forEach(el => {
      el.remove();
    });
  }

  /**
   * Append elements to a parent
   * @param {Element} parent - Parent element
   * @param {Element|Element[]|NodeList} elements - Element(s) to append
   */
  static append(parent, elements) {
    const elementList = this._normalizeElements(elements);

    elementList.forEach(el => {
      parent.appendChild(el);
    });
  }

  /**
   * Prepend elements to a parent
   * @param {Element} parent - Parent element
   * @param {Element|Element[]|NodeList} elements - Element(s) to prepend
   */
  static prepend(parent, elements) {
    const elementList = this._normalizeElements(elements);

    elementList.forEach(el => {
      parent.insertBefore(el, parent.firstChild);
    });
  }

  /**
   * Normalize elements to array
   * @private
   * @param {Element|Element[]|NodeList} elements - Element(s)
   * @returns {Element[]} - Array of elements
   */
  static _normalizeElements(elements) {
    if (!elements) return [];

    if (elements instanceof Element) {
      return [elements];
    }

    if (elements instanceof NodeList || Array.isArray(elements)) {
      return Array.from(elements);
    }

    return [elements];
  }
}