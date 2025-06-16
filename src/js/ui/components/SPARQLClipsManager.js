import { eventBus, EVENTS } from 'evb';

/**
 * UI Component for managing SPARQL query clips
 * @since 0.2.0
 */
export class SPARQLClipsUI {
  /**
   * Create a new SPARQLClipsUI
   * @param {Object} options - Configuration options
   * @param {Object} options.clipsManager - Instance of SPARQLClipsManager
   * @param {Function} options.onClipSelect - Callback when a clip is selected
   * @param {Object} [options.logger=console] - Logger instance
   */
  constructor({ clipsManager, onClipSelect, logger = console }) {
    this.clipsManager = clipsManager;
    this.onClipSelect = onClipSelect;
    this.logger = logger;
    this.clips = [];
    
    // Bind methods
    this.render = this.render.bind(this);
    this.handleClipSelect = this.handleClipSelect.bind(this);
    this.handleSaveClip = this.handleSaveClip.bind(this);
    this.handleDeleteClip = this.handleDeleteClip.bind(this);
    
    // Initial render
    this.loadClips();
  }
  
  /**
   * Load clips from the manager
   */
  async loadClips() {
    try {
      this.clips = await this.clipsManager.getAllClips();
      this.render();
    } catch (error) {
      this.logger.error('Failed to load clips:', error);
    }
  }
  
  /**
   * Handle clip selection
   * @param {string} clipId - ID of the selected clip
   */
  async handleClipSelect(clipId) {
    try {
      const clip = await this.clipsManager.getClip(clipId);
      if (clip && this.onClipSelect) {
        this.onClipSelect(clip.query);
      }
    } catch (error) {
      this.logger.error('Failed to load clip:', error);
    }
  }
  
  /**
   * Handle saving a new clip
   * @param {string} name - Name for the new clip
   * @param {string} query - SPARQL query to save
   */
  async handleSaveClip(name, query) {
    try {
      await this.clipsManager.saveClip({
        name,
        query,
        timestamp: Date.now()
      });
      await this.loadClips();
    } catch (error) {
      this.logger.error('Failed to save clip:', error);
      throw error;
    }
  }
  
  /**
   * Handle deleting a clip
   * @param {string} clipId - ID of the clip to delete
   */
  async handleDeleteClip(clipId) {
    try {
      await this.clipsManager.deleteClip(clipId);
      await this.loadClips();
    } catch (error) {
      this.logger.error('Failed to delete clip:', error);
      throw error;
    }
  }
  
  /**
   * Render the clips UI
   * @param {HTMLElement} container - Container element to render into
   */
  render(container) {
    if (!container) {
      this.logger.error('No container provided for SPARQLClipsUI');
      return;
    }
    
    this.container = container;
    this.container.innerHTML = `
      <div class="sparql-clips">
        <div class="sparql-clips-header">
          <h3>Saved Queries</h3>
          <button class="btn btn-small" id="add-clip-btn">
            <i class="icon-plus"></i> New
          </button>
        </div>
        <div class="sparql-clips-list" id="clips-list">
          ${this.clips.map(clip => `
            <div class="clip-item" data-clip-id="${clip.id}">
              <div class="clip-name">${clip.name}</div>
              <div class="clip-actions">
                <button class="btn-icon clip-load" title="Load">
                  <i class="icon-play"></i>
                </button>
                <button class="btn-icon clip-delete" title="Delete">
                  <i class="icon-trash"></i>
                </button>
              </div>
            </div>
          `).join('')}
          ${this.clips.length === 0 ? '<div class="no-clips">No saved queries yet</div>' : ''}
        </div>
      </div>
      
      <div class="modal" id="save-clip-modal">
        <div class="modal-content">
          <h3>Save Query</h3>
          <div class="form-group">
            <label for="clip-name">Name:</label>
            <input type="text" id="clip-name" class="form-control" />
          </div>
          <div class="modal-actions">
            <button class="btn" id="save-clip-cancel">Cancel</button>
            <button class="btn btn-primary" id="save-clip-confirm">Save</button>
          </div>
        </div>
      </div>
    `;
    
    // Attach event listeners
    this.attachEventListeners();
  }
  
  /**
   * Attach event listeners to the rendered elements
   * @private
   */
  attachEventListeners() {
    // Clip item click
    this.container.querySelectorAll('.clip-item').forEach(item => {
      const clipId = item.dataset.clipId;
      
      // Load button
      item.querySelector('.clip-load').addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleClipSelect(clipId);
      });
      
      // Delete button
      item.querySelector('.clip-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this saved query?')) {
          this.handleDeleteClip(clipId);
        }
      });
    });
    
    // Add new clip button
    const addButton = this.container.querySelector('#add-clip-btn');
    if (addButton) {
      addButton.addEventListener('click', () => {
        this.showSaveModal();
      });
    }
    
    // Save clip modal
    const modal = this.container.querySelector('#save-clip-modal');
    const confirmBtn = this.container.querySelector('#save-clip-confirm');
    const cancelBtn = this.container.querySelector('#save-clip-cancel');
    
    if (confirmBtn && cancelBtn) {
      confirmBtn.addEventListener('click', async () => {
        const nameInput = this.container.querySelector('#clip-name');
        const name = nameInput?.value.trim();
        
        if (name && this.currentQuery) {
          try {
            await this.handleSaveClip(name, this.currentQuery);
            this.hideSaveModal();
          } catch (error) {
            // Error will be logged by handleSaveClip
          }
        }
      });
      
      cancelBtn.addEventListener('click', () => this.hideSaveModal());
    }
  }
  
  /**
   * Show the save clip modal
   * @param {string} [query] - Optional query to save
   */
  showSaveModal(query = '') {
    this.currentQuery = query;
    const modal = this.container.querySelector('#save-clip-modal');
    const nameInput = this.container.querySelector('#clip-name');
    
    if (modal && nameInput) {
      nameInput.value = '';
      modal.style.display = 'flex';
      nameInput.focus();
    }
  }
  
  /**
   * Hide the save clip modal
   * @private
   */
  hideSaveModal() {
    const modal = this.container.querySelector('#save-clip-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }
  
  /**
   * Update the current query that would be saved
   * @param {string} query - The current SPARQL query
   */
  setCurrentQuery(query) {
    this.currentQuery = query;
  }
}
