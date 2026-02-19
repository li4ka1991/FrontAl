# Plan: FrontAl — Frontend Analysis Tool Setup

Create a browser-based code analyzer with vanilla HTML/CSS/JavaScript. The tool will parse and analyze uploaded frontend files (HTML, CSS, JS) to detect performance issues, estimate bundle sizes, find duplications, and provide PageSpeed-style recommendations—all client-side with no backend required initially.

## Steps

1. **Create project structure** with `index.html`, `styles.css`, `app.js`, and organized modules folder (`modules/`) for analyzers (size, duplication, performance, scoring)

2. **Build UI layout** in `index.html` with file upload/textarea input area, analysis trigger button, and results display sections for metrics, issues, and recommendations

3. **Implement core analysis modules** — create `modules/sizeAnalyzer.js`, `modules/duplicationDetector.js`, `modules/performanceAnalyzer.js`, and `modules/scorer.js` with exported functions for each analysis type

4. **Wire up main application logic** in `app.js` to handle file inputs, coordinate analysis modules, aggregate results, and render findings to the UI with categorized issues and actionable recommendations

5. **Style the interface** in `styles.css` with attractive, modern, developer-friendly design using flexbox/grid layout, syntax highlighting for code snippets, color-coded severity indicators, and responsive design. Don't make it mainly white of darkmode-like - use some fresh colors.

## Further Considerations

1. **File input approach** — Support both drag-and-drop multi-file upload AND raw code paste in textareas

2. **Analysis depth** — Start with basic heuristics (regex patterns, simple AST parsing) or integrate a lightweight parser library like Acorn for JavaScript AST analysis

