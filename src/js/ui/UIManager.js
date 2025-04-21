/**
 * UI Manager for handling user interface interactions
 * @module ui/UIManager
 */

/**
 * Manages UI interactions and binds components together
 */
export class UIManager {
  /**
   * Create a new UIManager
   * @param {Object} components - Application components
   * @param {Object} components.editor - TurtleEditor instance
   * @param {Object} components.visualizer - GraphVisualizer instance
   * @param {Object} components.logger - LoggerService instance
   */
  constructor(components) {
    this.editor = components.editor
    this.visualizer = components.visualizer
    this.logger = components.logger

    this.state = {
      syntaxCheck: 'pending',
      isSplitView: true
    }

    this._initializeUI()
  }

  /**
   * Initialize UI elements and event listeners
   * @private
   */
  _initializeUI() {
    // Get UI elements
    this.elements = {
      // Syntax check elements
      syntaxCheck: document.getElementById('syntax-check'),
      syntaxWorking: document.getElementById('syntax-check-working'),
      syntaxPending: document.getElementById('syntax-check-pending'),
      syntaxPassed: document.getElementById('syntax-check-passed'),
      syntaxFailed: document.getElementById('syntax-check-failed'),
      syntaxOff: document.getElementById('syntax-check-off'),

      // View controls
      splitButton: document.getElementById('split-button'),
      hideNodesCheckbox: document.getElementById('hide-nodes'),
      freezeCheckbox: document.getElementById('freeze'),
      clusterButton: document.getElementById('cluster'),
      declusterButton: document.getElementById('decluster'),

      // Popups
      networkPopup: document.getElementById('network-popUp'),
      popupLabel: document.getElementById('label'),
      savePopupButton: document.getElementById('saveButton'),
      cancelPopupButton: document.getElementById('cancelButton'),

      // Dialog
      dialog: document.getElementById('dialog'),
      dialogYesButton: document.getElementById('dialog-yes'),
      dialogNoButton: document.getElementById('dialog-no'),
      dialogCancelButton: document.getElementById('dialog-cancel')
    }

    // Set up event listeners
    this._setupEventListeners()

    // Log initialization
    this.logger.debug('UI Manager initialized')
  }

  /**
   * Set up event listeners for UI elements
   * @private
   */
  _setupEventListeners() {
    // View controls
    this.elements.splitButton.addEventListener('click', this._handleSplitView.bind(this))
    this.elements.hideNodesCheckbox.addEventListener('change', this._handleHideNodes.bind(this))
    this.elements.freezeCheckbox.addEventListener('change', this._handleFreeze.bind(this))
    this.elements.clusterButton.addEventListener('click', this._handleCluster.bind(this))
    this.elements.declusterButton.addEventListener('click', this._handleDecluster.bind(this))

    // Syntax check state changes
    document.addEventListener('syntax-check-state-change', (event) => {
      this._handleSyntaxCheckStateChange(event.detail.state, event.detail.error)
    })

    // Node/Edge edit popup
    this.elements.savePopupButton.addEventListener('click', this._handleSavePopup.bind(this))
    this.elements.cancelPopupButton.addEventListener('click', this._handleCancelPopup.bind(this))

    // Confirmation dialog
    this.elements.dialogYesButton.addEventListener('click', () => this._handleDialogResponse(true))
    this.elements.dialogNoButton.addEventListener('click', () => this._handleDialogResponse(false))
    this.elements.dialogCancelButton.addEventListener('click', () => this._handleDialogCancel())
  }

  /**
   * Handle split view toggle
   * @private
   */
  _handleSplitView() {
    this.state.isSplitView = !this.state.isSplitView

    const container = document.querySelector('.split-container')
    const leftPane = document.getElementById('editor-container')
    const rightPane = document.getElementById('graph-container')
    const divider = document.getElementById('divider')

    if (this.state.isSplitView) {
      // Show both panes
      leftPane.style.display = 'block'
      rightPane.style.display = 'block'
      divider.style.display = 'block'
      leftPane.style.width = '50%'
      this.elements.splitButton.textContent = 'Toggle View'
    } else {
      // Toggle between panes
      const isEditorVisible = leftPane.style.display !== 'none'

      leftPane.style.display = isEditorVisible ? 'none' : 'block'
      rightPane.style.display = isEditorVisible ? 'block' : 'none'
      divider.style.display = 'none'

      if (leftPane.style.display === 'block') {
        leftPane.style.width = '100%'
      }

      this.elements.splitButton.textContent = isEditorVisible ? 'Show Editor' : 'Show Graph'
    }

    // Trigger resize for the graph
    window.dispatchEvent(new Event('resize'))
  }

  /**
   * Handle hide nodes toggle
   * @private
   */
  _handleHideNodes() {
    const hideNodes = this.elements.hideNodesCheckbox.checked
    this.visualizer.options.hidden = hideNodes
    this.visualizer.toggleHideDefaults()
  }

  /**
   * Handle freeze toggle
   * @private
   */
  _handleFreeze() {
    const freeze = this.elements.freezeCheckbox.checked
    this.visualizer.options.freeze = freeze
    this.visualizer.toggleFreeze()
  }

  /**
   * Handle cluster button click
   * @private
   */
  _handleCluster() {
    this.visualizer.makeClusters()
  }

  /**
   * Handle decluster button click
   * @private
   */
  _handleDecluster() {
    this.visualizer.openClusters()
  }

  /**
   * Handle syntax check state change
   * @private
   * @param {string} newState - New state
   * @param {string} error - Error message (if any)
   */
  _handleSyntaxCheckStateChange(newState, error) {
    if (newState === this.state.syntaxCheck) {
      return
    }

    // Hide current state
    this.elements[`syntax${this._capitalize(this.state.syntaxCheck)}`].style.display = 'none'

    // Update state
    this.state.syntaxCheck = newState

    // Update error message if needed
    if (newState === 'failed' && error) {
      const statusElement = this.elements.syntaxFailed.querySelector('.status')
      if (error.startsWith('Syntax error:')) {
        statusElement.textContent = ` ${error}`
      } else {
        statusElement.textContent = ` Syntax error: ${error}`
      }
    }

    // Show new state
    this.elements[`syntax${this._capitalize(newState)}`].style.display = 'block'
  }

  /**
   * Handle save button in node/edge popup
   * @private
   */
  _handleSavePopup() {
    if (this.popupCallback) {
      const label = this.elements.popupLabel.value
      this.popupCallback(label)
      this.popupCallback = null
    }

    this.elements.networkPopup.style.display = 'none'
  }

  /**
   * Handle cancel button in node/edge popup
   * @private
   */
  _handleCancelPopup() {
    if (this.popupCallback) {
      this.popupCallback(null)
      this.popupCallback = null
    }

    this.elements.networkPopup.style.display = 'none'
  }

  /**
   * Handle dialog response
   * @private
   * @param {boolean} confirm - Whether the action was confirmed
   */
  _handleDialogResponse(confirm) {
    if (this.dialogCallback) {
      this.dialogCallback(confirm)
      this.dialogCallback = null
    }

    this.elements.dialog.style.display = 'none'
  }

  /**
   * Handle dialog cancel
   * @private
   */
  _handleDialogCancel() {
    if (this.dialogCallback) {
      this.dialogCallback(null)
      this.dialogCallback = null
    }

    this.elements.dialog.style.display = 'none'
  }

  /**
   * Show node/edge edit popup
   * @param {string} operation - Operation name ('Add Node', 'Edit Node', etc.)
   * @param {string} [initialValue=''] - Initial label value
   * @param {Function} callback - Callback function
   */
  showPopup(operation, initialValue = '', callback) {
    this.elements.networkPopup.style.display = 'block'
    this.elements.popupLabel.value = initialValue

    const operationElement = document.getElementById('operation')
    if (operationElement) {
      operationElement.textContent = operation
    }

    this.popupCallback = callback
  }

  /**
   * Show confirmation dialog
   * @param {string} message - Dialog message
   * @param {Function} callback - Callback function
   */
  showConfirmationDialog(message, callback) {
    this.elements.dialog.style.display = 'block'

    const messageElement = this.elements.dialog.querySelector('p')
    if (messageElement) {
      messageElement.textContent = message
    }

    this.dialogCallback = callback
  }

  /**
   * Capitalize first letter of a string
   * @private
   * @param {string} str - String to capitalize
   * @returns {string} - Capitalized string
   */
  _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }
}