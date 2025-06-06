// Type definitions for atuin
// Project: https://github.com/danja/atuin
// Definitions by: Claude Code

import { Dataset, Quad, Term, NamedNode, BlankNode, Literal } from '@rdfjs/types';
import { EditorView } from '@codemirror/view';
import { Network } from 'vis-network';

/**
 * Logger alert types
 */
export type AlertType = 'info' | 'success' | 'warning' | 'error';

/**
 * Logger alert interface
 */
export interface Alert {
  type: AlertType;
  message: string;
  timestamp: Date;
}

/**
 * Graph visualization options
 */
export interface GraphOptions {
  defaultPrefixes?: string[];
  labelMaxLength?: number;
  hidden?: boolean;
  freeze?: boolean;
}

/**
 * Settings manager configuration
 */
export interface SettingsConfig {
  visualizer: GraphVisualizer;
  editor: TurtleEditor;
  sparqlEditor: SPARQLEditor;
  logger: LoggerService;
}

/**
 * UI manager configuration
 */
export interface UIManagerConfig {
  editor: TurtleEditor;
  sparqlEditor: SPARQLEditor;
  visualizer: GraphVisualizer;
  logger: LoggerService;
  settingsManager: SettingsManager;
  sparqlService: SparqlService;
}

/**
 * Split pane manager configuration
 */
export interface SplitPaneConfig {
  container: HTMLElement;
  leftPane: HTMLElement;
  rightPane: HTMLElement;
  divider: HTMLElement;
}

/**
 * Turtle Editor component for RDF Turtle syntax with syntax highlighting
 */
export declare class TurtleEditor {
  constructor(textareaElement: HTMLElement, logger: LoggerService);
  
  /**
   * Initialize the editor with CodeMirror
   */
  initialize(): void;
  
  /**
   * Set the content of the editor
   */
  setValue(content: string): void;
  
  /**
   * Get the current content of the editor
   */
  getValue(): string;
  
  /**
   * Register a callback for content changes
   */
  onChange(callback: (content: string) => void): void;
  
  /**
   * Highlight a node in the editor
   */
  highlightNode(nodeId: string): void;
  
  /**
   * Clear all highlights
   */
  clearHighlights(): void;
  
  /**
   * Focus the editor
   */
  focus(): void;
  
  /**
   * Get the CodeMirror view instance
   */
  getView(): EditorView;
}

/**
 * SPARQL Editor component with syntax highlighting
 */
export declare class SPARQLEditor {
  constructor(textareaElement: HTMLElement, logger: LoggerService);
  
  /**
   * Initialize the editor with CodeMirror
   */
  initialize(): void;
  
  /**
   * Set the content of the editor
   */
  setValue(content: string): void;
  
  /**
   * Get the current content of the editor
   */
  getValue(): string;
  
  /**
   * Register a callback for content changes
   */
  onChange(callback: (content: string) => void): void;
  
  /**
   * Focus the editor
   */
  focus(): void;
  
  /**
   * Get the CodeMirror view instance
   */
  getView(): EditorView;
}

/**
 * Graph visualizer component using vis-network
 */
export declare class GraphVisualizer {
  constructor(container: HTMLElement, logger: LoggerService);
  
  /**
   * Initialize the graph visualization
   */
  initialize(): void;
  
  /**
   * Update the graph with new RDF content
   */
  updateGraph(turtleContent: string): void;
  
  /**
   * Register a callback for node selection
   */
  onNodeSelect(callback: (nodeId: string) => void): void;
  
  /**
   * Resize and fit the graph to container
   */
  resizeAndFit(): void;
  
  /**
   * Set graph options
   */
  setOptions(options: Partial<GraphOptions>): void;
  
  /**
   * Get the vis-network instance
   */
  getNetwork(): Network;
  
  /**
   * Clear the graph
   */
  clear(): void;
}

/**
 * RDF Parser for Turtle content
 */
export declare class RDFParser {
  constructor(logger: LoggerService);
  
  /**
   * Parse Turtle content to RDF dataset
   */
  parse(turtleContent: string): Promise<Dataset>;
  
  /**
   * Parse Turtle content to quads array
   */
  parseToQuads(turtleContent: string): Promise<Quad[]>;
  
  /**
   * Extract prefixes from Turtle content
   */
  extractPrefixes(turtleContent: string): Record<string, string>;
}

/**
 * SPARQL service for executing queries
 */
export declare class SparqlService {
  constructor(logger: LoggerService);
  
  /**
   * Execute a SPARQL query against an endpoint
   */
  executeQuery(query: string, endpoint?: string): Promise<any>;
  
  /**
   * Set the default SPARQL endpoint
   */
  setEndpoint(endpoint: string): void;
  
  /**
   * Get the current endpoint
   */
  getEndpoint(): string;
}

/**
 * Logger service for application messages
 */
export declare class LoggerService {
  constructor(containerId: string);
  
  /**
   * Log an info message
   */
  info(message: string): void;
  
  /**
   * Log a success message
   */
  success(message: string): void;
  
  /**
   * Log a warning message
   */
  warning(message: string): void;
  
  /**
   * Log an error message
   */
  error(message: string): void;
  
  /**
   * Clear all messages
   */
  clear(): void;
  
  /**
   * Get all alerts
   */
  getAlerts(): Alert[];
}

/**
 * UI Manager for application interface
 */
export declare class UIManager {
  constructor(config: UIManagerConfig);
  
  /**
   * Initialize UI components
   */
  initialize(): void;
  
  /**
   * Show/hide loading indicator
   */
  setLoading(loading: boolean): void;
  
  /**
   * Update status message
   */
  setStatus(message: string): void;
}

/**
 * Split pane manager for resizable layout
 */
export declare class SplitPaneManager {
  constructor(config: SplitPaneConfig);
  
  /**
   * Initialize split pane functionality
   */
  initialize(): void;
  
  /**
   * Toggle split view
   */
  toggle(): void;
  
  /**
   * Set split ratio
   */
  setSplitRatio(ratio: number): void;
}

/**
 * Settings manager for application configuration
 */
export declare class SettingsManager {
  constructor(config: SettingsConfig);
  
  /**
   * Apply all settings
   */
  applyAllSettings(): void;
  
  /**
   * Get a setting value
   */
  getSetting(key: string): any;
  
  /**
   * Set a setting value
   */
  setSetting(key: string, value: any): void;
  
  /**
   * Reset settings to defaults
   */
  resetSettings(): void;
}

// Re-export utility types and classes
export * from './src/js/utils/index.d.ts';

// Namespace export for utilities
export declare namespace utils {
  export { DatasetUtils, DOMUtils, RDFUtils, StreamUtils, URIUtils, rdfExt } from './src/js/utils/index.d.ts';
}