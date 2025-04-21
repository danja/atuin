/**
 * Split pane manager for responsive layout
 * @module ui/SplitPaneManager
 */

/**
 * Manages split pane layout
 */
export class SplitPaneManager {
  /**
   * Create a new SplitPaneManager
   * @param {Object} options - Configuration options
   * @param {HTMLElement} options.container - Container element
   * @param {HTMLElement} options.leftPane - Left pane element
   * @param {HTMLElement} options.rightPane - Right pane element
   * @param {HTMLElement} options.divider - Divider element
   */
  constructor(options) {
    this.container = options.container
    this.leftPane = options.leftPane
    this.rightPane = options.rightPane
    this.divider = options.divider

    this.isResizing = false
    this.startX = 0
    this.startLeftWidth = 0

    this.minLeftWidth = 200
    this.minRightWidth = 200

    this._initializeEvents()
  }

  /**
   * Initialize event listeners
   * @private
   */
  _initializeEvents() {
    // Mouse events for dragging
    this.divider.addEventListener('mousedown', this._onMouseDown.bind(this))
    document.addEventListener('mousemove', this._onMouseMove.bind(this))
    document.addEventListener('mouseup', this._onMouseUp.bind(this))

    // Touch events for mobile
    this.divider.addEventListener('touchstart', this._onTouchStart.bind(this))
    document.addEventListener('touchmove', this._onTouchMove.bind(this))
    document.addEventListener('touchend', this._onTouchEnd.bind(this))

    // Window resize event
    window.addEventListener('resize', this._onWindowResize.bind(this))

    // Initial layout
    this._setInitialSizes()
  }

  /**
   * Set initial sizes
   * @private
   */
  _setInitialSizes() {
    const containerWidth = this.container.clientWidth
    const initialLeftWidth = Math.max(containerWidth * 0.5, this.minLeftWidth)

    this.leftPane.style.width = `${initialLeftWidth}px`
  }

  /**
   * Handle mouse down on divider
   * @private
   * @param {MouseEvent} e - Mouse event
   */
  _onMouseDown(e) {
    e.preventDefault()
    this.isResizing = true
    this.startX = e.clientX
    this.startLeftWidth = this.leftPane.getBoundingClientRect().width

    this.container.classList.add('resizing')
  }

  /**
   * Handle mouse move while resizing
   * @private
   * @param {MouseEvent} e - Mouse event
   */
  _onMouseMove(e) {
    if (!this.isResizing) return

    const containerRect = this.container.getBoundingClientRect()
    const containerWidth = containerRect.width

    const delta = e.clientX - this.startX
    let newLeftWidth = this.startLeftWidth + delta

    // Apply constraints
    newLeftWidth = Math.max(this.minLeftWidth, newLeftWidth)
    newLeftWidth = Math.min(containerWidth - this.minRightWidth, newLeftWidth)

    this.leftPane.style.width = `${newLeftWidth}px`

    // Trigger resize event on graph container
    window.dispatchEvent(new Event('resize'))
  }

  /**
   * Handle mouse up after resizing
   * @private
   */
  _onMouseUp() {
    this.isResizing = false
    this.container.classList.remove('resizing')

    // Trigger resize event on graph container
    window.dispatchEvent(new Event('resize'))
  }

  /**
   * Handle touch start on divider
   * @private
   * @param {TouchEvent} e - Touch event
   */
  _onTouchStart(e) {
    if (e.touches.length === 1) {
      e.preventDefault()
      this.isResizing = true
      this.startX = e.touches[0].clientX
      this.startLeftWidth = this.leftPane.getBoundingClientRect().width

      this.container.classList.add('resizing')
    }
  }

  /**
   * Handle touch move while resizing
   * @private
   * @param {TouchEvent} e - Touch event
   */
  _onTouchMove(e) {
    if (!this.isResizing || e.touches.length !== 1) return

    const containerRect = this.container.getBoundingClientRect()
    const containerWidth = containerRect.width

    const delta = e.touches[0].clientX - this.startX
    let newLeftWidth = this.startLeftWidth + delta

    // Apply constraints
    newLeftWidth = Math.max(this.minLeftWidth, newLeftWidth)
    newLeftWidth = Math.min(containerWidth - this.minRightWidth, newLeftWidth)

    this.leftPane.style.width = `${newLeftWidth}px`

    // Trigger resize event on graph container
    window.dispatchEvent(new Event('resize'))
  }

  /**
   * Handle touch end after resizing
   * @private
   */
  _onTouchEnd() {
    this.isResizing = false
    this.container.classList.remove('resizing')

    // Trigger resize event on graph container
    window.dispatchEvent(new Event('resize'))
  }

  /**
   * Handle window resize
   * @private
   */
  _onWindowResize() {
    const containerWidth = this.container.clientWidth
    let leftWidth = this.leftPane.getBoundingClientRect().width

    // If left pane is too wide, adjust it
    if (leftWidth + this.minRightWidth > containerWidth) {
      leftWidth = containerWidth - this.minRightWidth
      this.leftPane.style.width = `${leftWidth}px`
    }
  }

  /**
   * Set the split position
   * @param {number} percentage - Percentage (0-100) for left pane width
   */
  setSplitPosition(percentage) {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Percentage must be between 0 and 100')
    }

    const containerWidth = this.container.clientWidth
    const leftWidth = (containerWidth * percentage) / 100

    // Apply constraints
    const constrainedWidth = Math.max(
      this.minLeftWidth,
      Math.min(containerWidth - this.minRightWidth, leftWidth)
    )

    this.leftPane.style.width = `${constrainedWidth}px`

    // Trigger resize event on graph container
    window.dispatchEvent(new Event('resize'))
  }

  /**
   * Toggle between editor and graph views
   * @param {string} view - View to show ('editor', 'graph', 'split')
   */
  setView(view) {
    const containerWidth = this.container.clientWidth

    switch (view) {
      case 'editor':
        this.leftPane.style.width = `${containerWidth}px`
        this.rightPane.style.display = 'none'
        this.divider.style.display = 'none'
        break

      case 'graph':
        this.leftPane.style.display = 'none'
        this.rightPane.style.display = 'block'
        this.divider.style.display = 'none'
        break

      case 'split':
      default:
        this.leftPane.style.display = 'block'
        this.rightPane.style.display = 'block'
        this.divider.style.display = 'block'
        this.setSplitPosition(50)
        break
    }

    // Trigger resize event on graph container
    window.dispatchEvent(new Event('resize'))
  }
}