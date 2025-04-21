# Atuin - Turtle RDF Editor

**mostly functional**

Atuin is a web-based editor for Turtle RDF files with an integrated graph visualization. This modern implementation uses vanilla JavaScript with ES modules, providing a clean, modular architecture.

## Features

- Turtle syntax editing with syntax highlighting
- Real-time RDF graph visualization
- Visual node and edge manipulation
- Syntax validation
- Graph clustering for large datasets
- Options to hide standard vocabulary nodes (RDF, RDFS, OWL)
- Responsive split-pane layout

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

### Installation

1. Clone this repository

```
git clone https://github.com/your-username/atuin.git
cd atuin
```

2. Install dependencies

```
npm install
```

3. Start the development server

```
npm run dev
```

4. Open your browser at http://localhost:9000

### Building for Production

To create a production build:

```
npm run build
```

The built files will be in the `dist` directory.

## Usage

1. Enter or paste Turtle RDF content in the editor pane
2. Syntax validation runs automatically
3. The graph visualization updates in real-time
4. Click on nodes in the graph to highlight their references in the editor
5. Use the toolbar controls to:
   - Toggle split view
   - Hide/show standard vocabulary nodes
   - Freeze/unfreeze the graph physics
   - Add/remove clustering

## Project Structure

```
atuin/
├── src/
│   ├── js/
│   │   ├── core/          # Core functionality
│   │   ├── services/      # Helper services
│   │   ├── utils/         # Utility functions
│   │   ├── ui/            # UI components
│   │   └── main.js        # App entry point
│   ├── css/               # Stylesheets
│   ├── html/              # HTML templates
│   └── img/               # Images and icons
├── test/                  # Test files
├── dist/                  # Build output
├── webpack.config.js      # Webpack configuration
├── package.json           # Project dependencies
└── README.md              # This file
```

## Technologies Used

- Vanilla JavaScript (ES Modules)
- CodeMirror 6 (editor)
- vis-network (graph visualization)
- N3.js (RDF parsing)
- Webpack (bundling)
- Jasmine (testing)
- JSDoc (documentation)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
