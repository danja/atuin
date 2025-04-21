/**
 * Logger service for displaying messages to the user and console
 * @module services/LoggerService
 */

/**
 * Represents a message alert
 */
class Alert {
  /**
   * Create a new alert
   * @param {string} type - The type of alert (error, warning, info, success)
   * @param {string} description - The alert message
   */
  constructor(type, description) {
    this.type = type
    this.description = description
    this.time = Date.now()
    this.count = 1

    let classname, heading

    switch (type) {
      case 'error':
        classname = 'alert-danger'
        heading = 'Error'
        break
      case 'warning':
        classname = 'alert-warning'
        heading = 'Warning'
        break
      case 'info':
        classname = 'alert-info'
        heading = 'Info'
        break
      case 'success':
        classname = 'alert-success'
        heading = 'Success'
        break
    }

    this.element = document.createElement('div')
    this.element.className = `alert ${classname}`
    this.element.setAttribute('role', 'alert')
    this.element.innerHTML = `<strong>${heading}:</strong> ${description}`
  }
}

/**
 * Service for logging messages to console and UI
 */
export class LoggerService {
  /**
   * Create a new LoggerService
   * @param {string} containerId - ID of the DOM element to append alerts to
   */
  constructor(containerId) {
    this.container = document.getElementById(containerId)

    if (!this.container) {
      console.error('Logger container not found')
      return
    }

    this.messageQueue = []

    // Set up timer to remove old messages
    setInterval(() => this.updateMessageQueue(), 2500)
  }

  /**
   * Update the message queue by removing expired messages
   * @private
   */
  updateMessageQueue() {
    if (this.messageQueue.length > 0 && Date.now() - this.messageQueue[0].time >= 10000) {
      const alert = this.messageQueue.shift()

      // Fade out the element before removing
      alert.element.style.opacity = '0'
      alert.element.style.transition = 'opacity 0.5s'

      setTimeout(() => {
        alert.element.remove()
      }, 500)

      // Show the next message if we have more than 3
      if (this.messageQueue.length >= 3) {
        const hiddenAlert = this.messageQueue[2]
        hiddenAlert.element.style.display = 'block'
      }
    }
  }

  /**
   * Log a message to the console
   * @private
   * @param {string} type - Type of message
   * @param {string} description - Message content
   * @param {any} data - Optional data to log to console
   */
  logConsole(type, description, data) {
    if (data) {
      console.log(`${type}: ${description}`, data)
    } else {
      console.log(`${type}: ${description}`)
    }
  }

  /**
   * Display a message in the UI
   * @private
   * @param {string} type - Type of message
   * @param {string} description - Message content
   */
  logDocument(type, description) {
    const len = this.messageQueue.length
    const last = this.messageQueue[len - 1]

    if (len === 0 || last.type !== type || last.description !== description) {
      // New message, create alert
      const alert = new Alert(type, description)
      this.container.appendChild(alert.element)
      this.messageQueue.push(alert)

      // Hide alerts beyond the third one
      if (len >= 3) {
        alert.element.style.display = 'none'
      }
    } else {
      // Duplicate message, increment counter
      last.count++
      last.time = Date.now()

      if (last.count === 2) {
        // Add counter badge
        const badge = document.createElement('span')
        badge.className = 'badge'
        badge.textContent = '2'
        last.element.appendChild(badge)
      } else {
        // Update existing badge
        const badge = last.element.querySelector('.badge')
        if (badge) {
          badge.textContent = last.count
        }
      }
    }
  }

  /**
   * Log an error message
   * @param {string} description - Error message
   * @param {any} data - Additional data to log to console
   */
  error(description, data) {
    this.logConsole('ERROR', description, data)
    this.logDocument('error', description)
  }

  /**
   * Log a warning message
   * @param {string} description - Warning message
   * @param {any} data - Additional data to log to console
   */
  warning(description, data) {
    this.logConsole('Warning', description, data)
    this.logDocument('warning', description)
  }

  /**
   * Log an info message
   * @param {string} description - Info message
   * @param {any} data - Additional data to log to console
   */
  info(description, data) {
    this.logConsole('Info', description, data)
    this.logDocument('info', description)
  }

  /**
   * Log a success message
   * @param {string} description - Success message
   * @param {any} data - Additional data to log to console
   */
  success(description, data) {
    this.logConsole('Success', description, data)
    this.logDocument('success', description)
  }

  /**
   * Log a debug message (console only)
   * @param {string} description - Debug message
   * @param {any} data - Additional data to log
   */
  debug(description, data) {
    this.logConsole('Debug', description, data)
  }
}