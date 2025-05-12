# Atuin

![Build](https://github.com/danja/atuin/actions/workflows/ci.yml/badge.svg)
![Tests](https://github.com/danja/atuin/actions/workflows/test.yml/badge.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

# Turtle RDF Editor

### [Demo](https://danja.github.io/atuin/)

**If you recognise the general design or even created the logo yourself, please let me know so I can acknowledge.** Atuin is all-new code but based heavily on someone else's from years ago. Alas I forget who, and I didn't see a ref in the original code I have.

This is mostly a (lively) placeholder right now. You can only load files using copy & paste. I don't actually need it as a Turtle editor _per se_, though I will add things like fs load/save soon. My motivation is to use it in [Semem](https://github.com/danja/semem), an agent memory thing I'm working on that will need seriously cluster-capable visualization of RDF graphs.

_The following written by my colleague ~~Claude~~ GitHub Copilot. Be warned, reality isn't their first language. Proper docs may appear in finite time._

Atuin is a web-based editor for Turtle RDF files with an integrated graph visualization. This modern implementation uses vanilla JavaScript with ES modules (ESM), providing a clean, modular architecture. It is tested with [Vitest](https://vitest.dev/) and uses the [evb](https://github.com/danja/evb) event bus for decoupled communication between components.

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

```sh
git clone https://github.com/your-username/atuin.git
cd atuin
```

2. Install dependencies (including the local evb event bus library)

```sh
npm install
npm install ../evb
```

3. Start the development server

```sh
npm run dev
```

4. Open your browser at http://localhost:9000

### Building for Production

To create a production build:

```sh
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
- Vitest (testing)
- JSDoc (documentation)
- [evb](https://github.com/danja/evb) (event bus)

## Testing

This project uses [Vitest](https://vitest.dev/) for unit and integration tests. To run the tests:

```sh
npx vitest run
```

The test suite covers core logic, utilities, and integration between the editor and graph visualizer.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
