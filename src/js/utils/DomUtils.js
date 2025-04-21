/**
 * Utility functions for DOM manipulation (jQuery replacement)
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
   * @param {Element|Element[]|NodeList}