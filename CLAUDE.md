# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
- `npm run dev` - Start development server at http://localhost:9000
- `npm run build` - Create production build in `dist/` directory
- `npm run test` - Run tests with Vitest
- `npm run coverage` - Run tests with coverage report
- `npm test -- --run test/unit/core/Parser.spec.js` - Run single test file

### Documentation & Deployment
- `npm run docs` - Generate JSDoc documentation
- `npm run ghp` - Build and deploy to GitHub Pages
- `npm run rp` - Generate repository mix with repomix

## Architecture Overview

Atuin is a Turtle RDF editor with graph visualization built using vanilla JavaScript ES modules and the [evb](https://github.com/danja/evb) event bus for decoupled component communication.

### Core Architecture Pattern
The application uses an event-driven architecture with the `evb` event bus library for inter-component communication. Components import `{ eventBus, EVENTS }` from 'evb' and use it for publishing/subscribing to events.

#### Event Bus Usage
Atuin uses the [evb](https://github.com/danja/evb) event bus library for loose coupling between components to simplify reuse. Key patterns:

- **Publishing events**: `eventBus.emit(EVENTS.MODEL_SYNCED, content)`
- **Subscribing to events**: `eventBus.on(EVENTS.MODEL_SYNCED, callback)`
- **Event constants**: Use predefined constants from `EVENTS` object (e.g., `EVENTS.ENDPOINT_UPDATED`, `EVENTS.SPARQL_QUERY_COMPLETED`)
- **Component isolation**: Components communicate through events rather than direct references, making them more modular and testable

### Key Components Structure
- **Core**: Main functionality (TurtleEditor, SPARQLEditor, GraphVisualizer, Parser)
- **Services**: Helper services (LoggerService, SparqlService) 
- **UI**: User interface components (UIManager, SplitPaneManager, SettingsManager)
- **Utils**: Utility functions (RDFUtils, URIUtils, DatasetUtils, StreamUtils)

### Data Flow
1. TurtleEditor receives user input and emits change events
2. Parser processes Turtle content into RDF triples
3. GraphVisualizer renders triples as a vis-network graph
4. Node selection in graph highlights corresponding text in editor
5. Settings manager coordinates visualization options

### Key Dependencies
- **CodeMirror 6**: Provides syntax highlighting and editing for Turtle/SPARQL
- **vis-network**: Graph visualization with physics simulation
- **N3.js**: RDF parsing and serialization
- **@rdfjs/***: RDF data model and utilities
- **evb**: Event bus for component communication

### Testing Setup
Uses Vitest with jsdom environment. Test files are in `test/` directory with `.spec.js` extension. The setup file `vitest.setup.js` configures the test environment.

### Module Resolution
Webpack aliases are configured for clean imports:
- `@` → `src/`
- `@core` → `src/js/core/`
- `@services` → `src/js/services/`
- `@utils` → `src/js/utils/`
- `@ui` → `src/js/ui/`