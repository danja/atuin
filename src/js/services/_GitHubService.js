/**
 * Service for interacting with GitHub API
 * @module services/GitHubService
 */

import { Octokit } from 'octokit';

/**
 * Service for GitHub operations
 */
export class GitHubService {
  /**
   * Create a new GitHubService
   * @param {Object} logger - Logger service
   */
  constructor(logger) {
    this.logger = logger;
    this.octokit = null;
    this.currentRepo = null;
    this.currentBranch = null;
    this.currentUser = null;
    this.fileCache = new Map();
  }
  
  /**
   * Initialize the GitHub service with credentials
   * @param {Object} options - GitHub options
   * @param {string} options.username - GitHub username (optional for token auth)
   * @param {string} options.password - GitHub password or token
   * @param {string} options.owner - Repository owner
   * @param {string} options.repo - Repository name
   * @param {string} options.branch - Branch name (default: 'main')
   * @returns {Promise<boolean>} - True if authentication succeeded
   */
  async initialize(options) {
    try {
      // Create Octokit instance
      if (options.username) {
        // Basic authentication (deprecated by GitHub but kept for compatibility)
        this.octokit = new Octokit({
          auth: {
            username: options.username,
            password: options.password,
            on2fa: () => {
              this.logger.error('Two-factor authentication is not supported');
              return Promise.reject(new Error('2FA not supported'));
            }
          }
        });
      } else {
        // Token authentication
        this.octokit = new Octokit({
          auth: options.password
        });
      }
      
      // Store repo info
      this.currentRepo = {
        owner: options.owner,
        repo: options.repo
      };
      
      this.currentBranch = options.branch || 'main';
      
      // Verify authentication
      const { data: user } = await this.octokit.rest.users.getAuthenticated();
      this.currentUser = user;
      this.logger.info(`Authenticated as ${user.login}`);
      
      return true;
    } catch (error) {
      this.logger.error('Failed to authenticate with GitHub', error);
      this.octokit = null;
      return false;
    }
  }
  
  /**
   * Check if the service is initialized
   * @returns {boolean} - True if initialized
   */
  isInitialized() {
    return !!this.octokit && !!this.currentRepo;
  }
  
  /**
   * List Turtle files in the repository
   * @returns {Promise<string[]>} - Array of file paths
   */
  async listTurtleFiles() {
    if (!this.isInitialized()) {
      throw new Error('GitHub service not initialized');
    }
    
    try {
      // Get branch reference
      const { data: ref } = await this.octokit.rest.git.getRef({
        ...this.currentRepo,
        ref: `heads/${this.currentBranch}`
      });
      
      // Get the tree
      const { data: tree } = await this.octokit.rest.git.getTree({
        ...this.currentRepo,
        tree_sha: ref.object.sha,
        recursive: 1
      });
      
      // Filter for Turtle files
      return tree.tree
        .filter(item => item.type === 'blob' && item.path.endsWith('.ttl'))
        .map(item => item.path);
    } catch (error) {
      this.logger.error('Failed to list Turtle files', error);
      throw error;
    }
  }
  
  /**
   * Read a file from the repository
   * @param {string} path - File path
   * @param {boolean} binary - Whether the file is binary
   * @returns {Promise<Object>} - File content and metadata
   */
  async readFile(path, binary = false) {
    if (!this.isInitialized()) {
      throw new Error('GitHub service not initialized');
    }
    
    try {
      // Check cache first
      if (this.fileCache.has(path)) {
        return this.fileCache.get(path);
      }
      
      // Get the file content
      const { data } = await this.octokit.rest.repos.getContent({
        ...this.currentRepo,
        path,
        ref: this.currentBranch
      });
      
      // Decode content
      const content = binary 
        ? atob(data.content)
        : Buffer.from(data.content, 'base64').toString('utf-8');
      
      const result = {
        content,
        sha: data.sha,
        path: data.path,
        size: data.size
      };
      
      // Cache the result
      this.fileCache.set(path, result);
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to read file: ${path}`, error);
      throw error;
    }
  }
  
  /**
   * Write a file to the repository
   * @param {string} path - File path
   * @param {string} content - File content
   * @param {string} message - Commit message
   * @param {boolean} binary - Whether the file is binary
   * @returns {Promise<Object>} - Response data
   */
  async writeFile(path, content, message, binary = false) {
    if (!this.isInitialized()) {
      throw new Error('GitHub service not initialized');
    }
    
    try {
      let sha;
      
      // Get the current file's SHA if it exists
      try {
        const existingFile = await this.readFile(path, binary);
        sha = existingFile.sha;
      } catch (error) {
        // File doesn't exist yet, which is fine
      }
      
      // Encode content
      const encodedContent = binary
        ? btoa(content)
        : Buffer.from(content).toString('base64');
      
      // Update the file
      const response = await this.octokit.rest.repos.createOrUpdateFileContents({
        ...this.currentRepo,
        path,
        message,
        content: encodedContent,
        sha,
        branch: this.currentBranch
      });
      
      // Update cache
      this.fileCache.set(path, {
        content,
        sha: response.data.content.sha,
        path,
        size: response.data.content.size
      });
      
      this.logger.success(`File saved: ${path}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to write file: ${path}`, error);
      throw error;
    }
  }
  
  /**
   * Generate a link to view a file on GitHub
   * @param {string} path - File path
   * @returns {string} - GitHub URL
   */
  getGitHubFileUrl(path) {
    return `https://github.com/${this.currentRepo.owner}/${this.currentRepo.repo}/blob/${this.currentBranch}/${path}`;
  }
  
  /**
   * Generate a link to view the file in WebVOWL
   * @param {string} path - File path
   * @returns {string} - WebVOWL URL
   */
  getWebVowlUrl(path) {
    return `http://vowl.visualdataweb.org/webvowl/index.html#iri=https://raw.githubusercontent.com/${this.currentRepo.owner}/${this.currentRepo.repo}/${this.currentBranch}/${path}`;
  }
  
  /**
   * Generate a link to query the file with SPARQL
   * @param {string} path - File path
   * @returns {string} - SPARQL processor URL
   */
  getSparqlUrl(path) {
    return `../SparqlProcessor/sparql-processor.html#${this.currentRepo.owner}/${this.currentRepo.repo}/${path}`;
  }
  
  /**
   * Clear credentials and reset state
   */
  logout() {
    this.octokit = null;
    this.currentRepo = null;
    this.currentBranch = null;
    this.currentUser = null;
    this.fileCache.clear();
  }
}
