# Biological Pathway Constellations

An interactive web visualization tool for exploring biological pathways and multi-omics data relationships, inspired by network constellation visualizations. Built with React and D3.js.

![Biological Pathway Visualization](https://via.placeholder.com/800x400/667eea/ffffff?text=Biological+Pathway+Constellations)

## Features

🧬 **Multi-Omics Integration**: Visualize relationships between mRNA transcripts, proteins, metabolites, and lipids

🌐 **Interactive Network**: Drag nodes, zoom, pan, and click to explore pathway connections

🎯 **Smart Filtering**: Filter by specific biological pathways or omics types

🎨 **Dynamic Visualization**: 
- Node size represents statistical significance
- Color intensity shows expression levels
- Link thickness indicates interaction strength

📱 **Responsive Design**: Works on desktop, tablet, and mobile devices

## Technology Stack

- **React** with TypeScript for the UI framework
- **D3.js** for data visualization and force simulations
- **Chroma.js** for beautiful color scaling
- **CSS3** with modern styling including glassmorphism effects

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd biological-pathways-viz
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Data Structure

The application uses simulated biological pathway data with the following structure:

### Node Types (Omics)
- **mRNA transcripts**: Gene expression data
- **Proteins**: Protein abundance measurements  
- **Metabolites**: Small molecule concentrations
- **Lipids**: Lipid species measurements

### Pathways Included
- Glucose Metabolism
- Lipid Metabolism
- Protein Synthesis
- Signal Transduction
- Cell Cycle
- Apoptosis
- DNA Repair
- Immune Response

### Interaction Types
- **Regulation**: Transcriptional/translational control
- **Interaction**: Protein-protein interactions
- **Conversion**: Metabolic transformations
- **Transport**: Molecular transport processes

## User Interface

### Control Panel
- **Pathway Filter**: Focus on specific biological pathways
- **Omics Filter**: Show only certain data types
- **Legend**: Color coding and visualization guide
- **Instructions**: Interactive help for navigation

### Visualization Canvas
- **Force-directed network**: Nodes automatically arrange based on connections
- **Zoom & Pan**: Mouse wheel and drag for navigation
- **Node Selection**: Click nodes to view detailed information
- **Drag Interaction**: Manually position nodes

## Customization

### Adding New Data
To use your own biological data, modify the `src/data/mockData.ts` file:

```typescript
// Add your pathway data
const YOUR_PATHWAYS = ['Custom Pathway 1', 'Custom Pathway 2'];

// Modify the generateNodes() function to use your data
const generateNodes = (): BiologicalNode[] => {
  // Your data generation logic here
};
```

### Styling
- Main styles: `src/App.css`
- Visualization styles: `src/components/PathwayVisualization.css`
- Control panel styles: `src/components/ControlPanel.css`

### Color Schemes
Modify the color schemes in `PathwayVisualization.tsx`:

```typescript
const omicsColors = {
  [OmicsType.mRNA]: chroma.scale(['#yourStartColor', '#yourEndColor']),
  // ... other omics types
};
```

## Architecture

### Component Structure
```
src/
├── components/
│   ├── PathwayVisualization.tsx    # Main D3.js visualization
│   ├── ControlPanel.tsx            # UI controls and filters
│   └── *.css                       # Component styles
├── data/
│   └── mockData.ts                 # Data generation utilities
├── types/
│   └── index.ts                    # TypeScript type definitions
└── App.tsx                         # Main application component
```

### Data Flow
1. Mock data generation (`mockData.ts`)
2. State management in main App component
3. Props passing to visualization and control components
4. D3.js force simulation and rendering
5. User interactions trigger state updates

## Performance Considerations

- **Efficient Rendering**: Uses React.memo and useCallback for optimization
- **D3.js Integration**: Separates D3 calculations from React rendering
- **Responsive Design**: Adapts to different screen sizes
- **Memory Management**: Proper cleanup of D3 simulations

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Future Enhancements

- [ ] Real data integration with biological databases
- [ ] Export functionality (PNG, SVG, PDF)
- [ ] Animation of temporal pathway changes
- [ ] Advanced statistical analysis tools
- [ ] Collaborative features for data sharing
- [ ] Integration with popular bioinformatics tools

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by network visualization techniques in systems biology
- Built with modern web technologies for interactive data exploration
- Color palettes designed for accessibility and scientific clarity

## Contact

For questions, suggestions, or collaborations, please open an issue in the repository.

---

**Note**: This application uses simulated biological data for demonstration purposes. For production use with real biological data, please ensure proper data validation and scientific accuracy.
