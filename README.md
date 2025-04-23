# Atuin - Turtle RDF Editor

### [Demo](https://danja.github.io/atuin/)

**If you recognise the general design or even created the logo yourself, please let me know so I can acknowledge.** Atuin is all-new code but based heavily on someone else's from years ago. Alas I forget who, and I didn't see a ref in the original code I have.

This is mostly a (lively) placeholder right now. You can only load files using copy & paste. I don't actually need it as a Turtle editor _per se_, though I will add things like fs load/save soon. My motivation is to use it in [Semem](https://github.com/danja/semem), an agent memory thing I'm working on that will need very cluster-capable visualization of RDF graphs.

_The following written by my colleague Claude. Be warned, reality isn't his first language. Proper docs will appear in finite time._

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
