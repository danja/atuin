/**
 * UI Manager for handling user interface interactions
 * @module ui/UIManager
 */
import { SparqlService } from '../core/SparqlService.js';

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
   * @param {Object} components.settingsManager - SettingsManager instance
   * @param {Object} components.sparqlService - SparqlService instance
   * @param {Object} components.sparqlEditor - SPARQLEditor instance
   */
  constructor(components) {
    this.editor = components.editor;
    this.visualizer = components.visualizer;
    this.logger = components.logger;
    this.sparqlService = components.sparqlService;
    this.settingsManager = components.settingsManager;
    this.sparqlEditor = components.sparqlEditor; // Added SPARQLEditor instance

    this.state = {
      syntaxCheck: 'pending',
      isSplitView: true
    };

    this._initializeUI();
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
      dialogCancelButton: document.getElementById('dialog-cancel'),

      // SPARQL Editor Toolbar
      runSparqlQueryButton: document.getElementById('run-sparql-query'),
      
      // File controls
      loadFileInput: document.getElementById('load-file'),
      loadFileButton: document.getElementById('load-file-btn'),

      // View Pane Content
      graphContainer: document.getElementById('graph-container'),
      sparqlResultsContainer: document.getElementById('sparql-results-container'),
      sparqlResultsTableWrapper: document.getElementById('sparql-results-table-wrapper')
    }

    // Set up event listeners
    this._setupEventListeners();
    
    // Set up file handling
    this._setupFileHandling();

    // Log initialization
    this.logger.debug('UI Manager initialized');

    // Check if settingsManager is provided
    if (!this.settingsManager) {
        this.logger.error('SettingsManager not provided to UIManager. SPARQL execution might fail.');
    }
  }


  /**
   * Set up file handling functionality
   * @private
   */
  _setupFileHandling() {
    // Handle file selection
    this.elements.loadFileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        const extension = file.name.split('.').pop().toLowerCase();
        
        try {
          if (['ttl', 'turtle'].includes(extension)) {
            // Load into Turtle editor
            this.editor.setValue(content);
            // Switch to Turtle tab if not already
            document.getElementById('tab-turtle').click();
            this.logger.info(`Loaded Turtle file: ${file.name}`);
          } else if (['rq', 'sparql'].includes(extension)) {
            // Load into SPARQL editor
            this.sparqlEditor.setValue(content);
            // Switch to SPARQL tab if not already
            document.getElementById('tab-sparql').click();
            this.logger.info(`Loaded SPARQL file: ${file.name}`);
          } else {
            throw new Error('Unsupported file type');
          }
        } catch (error) {
          this.logger.error(`Error loading file: ${error.message}`);
          // Show error to user
          this._showMessage(`Error loading file: ${error.message}`, 'error');
        }
      };
      
      reader.onerror = () => {
        this.logger.error('Error reading file');
        this._showMessage('Error reading file', 'error');
      };
      
      reader.readAsText(file);
      
      // Reset the input so the same file can be loaded again if needed
      event.target.value = '';
    });
    
    // Make the load file button trigger the file input
    this.elements.loadFileButton.addEventListener('click', () => {
      this.elements.loadFileInput.click();
    });
  }
  
  /**
   * Show a message to the user
   * @param {string} message - The message to show
   * @param {string} type - The type of message (info, success, warning, error)
   * @private
   */
  _showMessage(message, type = 'info') {
    const messageQueue = document.getElementById('message-queue');
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;
    
    messageQueue.appendChild(messageEl);
    
    // Remove message after 5 seconds
    setTimeout(() => {
      messageEl.classList.add('fade-out');
      setTimeout(() => messageEl.remove(), 500);
    }, 5000);
  }

  /**
   * Set up event listeners for UI elements
   * @private
   */
  _setupEventListeners() {
    // View controls
    this.elements.splitButton.addEventListener('click', this._handleSplitView.bind(this));
    this.elements.hideNodesCheckbox.addEventListener('change', this._handleHideNodes.bind(this));
    this.elements.freezeCheckbox.addEventListener('change', this._handleFreeze.bind(this));
    this.elements.clusterButton.addEventListener('click', this._handleCluster.bind(this));
    this.elements.declusterButton.addEventListener('click', this._handleDecluster.bind(this));

    // Syntax check state changes
    document.addEventListener('syntax-check-state-change', (event) => {
      this._handleSyntaxCheckStateChange(event.detail.state, event.detail.error);
    });

    // Node/Edge edit popup
    this.elements.savePopupButton.addEventListener('click', this._handleSavePopup.bind(this));
    this.elements.cancelPopupButton.addEventListener('click', this._handleCancelPopup.bind(this));

    // Confirmation dialog
    this.elements.dialogYesButton.addEventListener('click', () => this._handleDialogResponse(true));
    this.elements.dialogNoButton.addEventListener('click', () => this._handleDialogResponse(false));
    this.elements.dialogCancelButton.addEventListener('click', () => this._handleDialogCancel());

    // SPARQL Toolbar
    if (this.elements.runSparqlQueryButton) {
      this.elements.runSparqlQueryButton.addEventListener('click', this._handleRunSparqlQuery.bind(this));
    } else {
      this.logger.warn('Run SPARQL Query button not found during listener setup.');
    }
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
   * Displays SPARQL query results in a table.
   * @private
   * @param {Object} data - The SPARQL query result data in JSON format.
   */
  _displaySparqlResults(data) {
    if (!this.elements.sparqlResultsContainer || !this.elements.sparqlResultsTableWrapper || !this.elements.graphContainer) {
      this.logger.error('SPARQL results view elements not found.');
      return;
    }

    // Clear previous results
    this.elements.sparqlResultsTableWrapper.innerHTML = '';

    if (!data || !data.results || !data.results.bindings || data.results.bindings.length === 0) {
      const noResultsMessage = document.createElement('p');
      noResultsMessage.textContent = 'No results found for the query.';
      this.elements.sparqlResultsTableWrapper.appendChild(noResultsMessage);
    } else {
      const table = document.createElement('table');
      const thead = document.createElement('thead');
      const tbody = document.createElement('tbody');
      const headerRow = document.createElement('tr');

      // Create table headers
      data.head.vars.forEach(varName => {
        const th = document.createElement('th');
        th.textContent = varName;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Create table rows
      data.results.bindings.forEach(binding => {
        const tr = document.createElement('tr');
        data.head.vars.forEach(varName => {
          const td = document.createElement('td');
          const valueObj = binding[varName];
          if (valueObj) {
            td.textContent = valueObj.value;
            if (valueObj.type === 'uri') {
              const a = document.createElement('a');
              a.href = valueObj.value;
              a.textContent = valueObj.value;
              a.target = '_blank';
              td.innerHTML = ''; // Clear textContent
              td.appendChild(a);
            }
          } else {
            td.textContent = ''; // Variable not bound in this solution
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      this.elements.sparqlResultsTableWrapper.appendChild(table);
    }

    // Show results, hide graph
    this.elements.graphContainer.style.display = 'none';
    this.elements.sparqlResultsContainer.style.display = ''; // Or 'flex' if it was set to display:flex initially
    // Ensure the parent #view-pane is visible (if tab switching logic is elsewhere)
    // This UIManager focuses on content within the view-pane.
    // Actual tab switching for #view-pane vs #settings-pane is in main.js activateRightPanelTab
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
   * Display a temporary message to the user.
   * @param {string} message - The message to display.
   * @param {string} [type='info'] - The type of message (e.g., 'info', 'success', 'warning', 'error').
   * @param {number} [duration=3000] - How long to display the message in milliseconds.
   */
  showMessage(message, type = 'info', duration = 3000) {
    const messageQueue = document.getElementById('message-queue');
    if (!messageQueue) {
      this.logger.warn('Message queue element not found.');
      console.log(`Message (${type}): ${message}`); // Fallback to console
      return;
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;

    messageQueue.appendChild(messageDiv);

    // Automatically remove the message after the duration
    setTimeout(() => {
      messageDiv.style.opacity = '0'; // Start fade out
      setTimeout(() => {
        if (messageDiv.parentNode === messageQueue) { // Check if still child, might have been cleared
            messageQueue.removeChild(messageDiv);
        }
      }, 500); // CSS transition duration
    }, duration);
  }

  /**
   * Handle Run SPARQL Query button click
   * @private
   */
  _handleRunSparqlQuery() {
    const sparqlQuery = this.sparqlEditor ? this.sparqlEditor.getValue() : ''; 

    if (!this.settingsManager) {
        this.logger.error('SettingsManager is not available in UIManager.');
        this.showMessage('Configuration error: SettingsManager not found.', 'error');
        return;
    }
    const activeEndpoint = this.settingsManager.getActiveSparqlEndpoint();

    if (!activeEndpoint) {
      this.logger.warn('No active SPARQL endpoint selected. Please select one in Settings.');
      this.showMessage('No active SPARQL endpoint. Select one in Settings.', 'warning');
      return;
    }

    if (!sparqlQuery || sparqlQuery.trim() === '') {
      this.logger.warn('SPARQL query is empty.');
      this.showMessage('SPARQL query is empty.', 'warning');
      return;
    }

    this.logger.info(`Running SPARQL query on endpoint: ${activeEndpoint}`);
    this.logger.debug(`Query:\n${sparqlQuery}`);

    this.showMessage(`Executing query on ${activeEndpoint}...`, 'info');

    if (this.sparqlService && typeof this.sparqlService.executeQuery === 'function') {
      this.sparqlService.executeQuery(sparqlQuery, activeEndpoint)
        .then(results => {
          this.logger.info('SPARQL query executed successfully. Displaying results.');
          this._displaySparqlResults(results);
        })
        .catch(error => {
          this.logger.error('SPARQL query execution failed:', error.message);
          // Optionally, clear or hide the results view on error
          if (this.elements.sparqlResultsTableWrapper) {
            this.elements.sparqlResultsTableWrapper.innerHTML = '<p>Error executing query. See console for details.</p>';
          }
          if (this.elements.graphContainer && this.elements.sparqlResultsContainer) {
            this.elements.graphContainer.style.display = 'none'; // Or show graph as default error view
            this.elements.sparqlResultsContainer.style.display = '';
          }
          this.showMessage(`Query failed: ${error.message || 'Unknown error'}`, 'error');
        });
    } else {
      this.logger.error('SparqlService is not available in UIManager or executeQuery is not a function.');
      this.showMessage('SPARQL execution service not configured or unavailable.', 'error');
    }
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