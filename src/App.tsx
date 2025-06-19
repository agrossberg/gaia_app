import React, { useState, useEffect, useMemo } from 'react';
import PathwayVisualization from './components/PathwayVisualization';
import HierarchicalNetwork from './components/HierarchicalNetwork';
import SankeyFlowDiagram from './components/SankeyFlowDiagram';
import RadarChart from './components/RadarChart';
import PerturbationAnimation from './components/PerturbationAnimation';
import EnsembleFans from './components/EnsembleFans';
import DoseResponse3D from './components/DoseResponse3D';
import { generateMockData, applyDrugPerturbation, DRUG_TREATMENTS } from './data/mockData';
import { PathwayData, VisualizationMode, OmicsType, BiologicalNode } from './types';
import { NaturalLanguageQueryParser, QueryResult, EXAMPLE_QUERIES } from './utils/naturalLanguageQuery';
import './App.css';

// Dashboard view types
type DashboardView = 'dashboard' | 'network' | 'heatmap' | 'sankey' | 'radar' | 'animation' | 'ensemble' | 'drugdesign' | 'dose3d' | 'featurespace';

// Visualization tile configuration
interface VisualizationTile {
  id: DashboardView;
  title: string;
  description: string;
  category: 'molecular' | 'cellular' | 'system' | 'design';
  status: 'active' | 'preview' | 'coming-soon';
  icon: string;
}

const VISUALIZATION_TILES: VisualizationTile[] = [
  {
    id: 'network',
    title: 'Network Explorer',
    description: 'Interactive molecular network visualization with drug perturbation effects',
    category: 'molecular',
    status: 'active',
    icon: '🌐'
  },
  {
    id: 'heatmap',
    title: 'Hierarchical Network',
    description: 'Multi-scale constellation from molecular to system-level organization',
    category: 'molecular',
    status: 'active',
    icon: '🔥'
  },
  {
    id: 'sankey',
    title: 'Multi-Scale Flow',
    description: 'Sankey diagrams showing molecular → cellular → system cascades',
    category: 'system',
    status: 'active',
    icon: '🌊'
  },
  {
    id: 'radar',
    title: 'Drug Profile Radar',
    description: 'Spider charts comparing drug effects across multiple dimensions',
    category: 'design',
    status: 'preview',
    icon: '🕸️'
  },
  {
    id: 'animation',
    title: 'Perturbation Animation',
    description: 'Animated propagation of drug effects through biological networks',
    category: 'molecular',
    status: 'preview',
    icon: '⚡'
  },
  {
    id: 'ensemble',
    title: 'Prediction Fans',
    description: 'Uncertainty visualization with ensemble prediction confidence bands',
    category: 'system',
    status: 'preview',
    icon: '📊'
  },
  {
    id: 'drugdesign',
    title: 'Drug Design Explorer',
    description: 'Interactive parameter space for novel drug design and optimization',
    category: 'design',
    status: 'coming-soon',
    icon: '🧪'
  },
  {
    id: 'dose3d',
    title: '3D Dose Response',
    description: '3D surface plots showing dose-response relationships across conditions',
    category: 'system',
    status: 'preview',
    icon: '📈'
  },
  {
    id: 'featurespace',
    title: 'Feature Space Navigation',
    description: 'Navigate drug feature space with evolutionary optimization visualization',
    category: 'design',
    status: 'coming-soon',
    icon: '🎯'
  }
];

function App() {
  // Dashboard state
  const [currentView, setCurrentView] = useState<DashboardView>('dashboard');
  
  // Existing states (preserved exactly)
  const [baselineData, setBaselineData] = useState<PathwayData>({ nodes: [], links: [], pathways: [] });
  const [dimensions, setDimensions] = useState({
    width: Math.max(2000, window.innerWidth * 1.8),
    height: Math.max(1800, window.innerHeight * 2)
  });

  // Enhanced control states
  const [treatmentMode, setTreatmentMode] = useState<'control' | 'drug'>('control');
  const [selectedDrugs, setSelectedDrugs] = useState<Set<string>>(new Set()); // Multi-drug selection
  const [visibleNodeTypes, setVisibleNodeTypes] = useState<Set<OmicsType>>(
    new Set([OmicsType.mRNA, OmicsType.PROTEIN, OmicsType.METABOLITE, OmicsType.LIPID])
  );

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Natural language query states
  const [queryText, setQueryText] = useState<string>('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [showQueryHelp, setShowQueryHelp] = useState<boolean>(false);
  const [nlpParser, setNlpParser] = useState<NaturalLanguageQueryParser | null>(null);
  
  // Info popup state
  const [showInfoPopup, setShowInfoPopup] = useState<boolean>(false);

  useEffect(() => {
    // Generate mock data on component mount
    const mockData = generateMockData();
    setBaselineData(mockData);
    
    // Initialize NLP parser
    const parser = new NaturalLanguageQueryParser(mockData);
    setNlpParser(parser);
  }, []);

  useEffect(() => {
    // Handle window resize
    const handleResize = () => {
      setDimensions({
        width: Math.max(2000, window.innerWidth * 1.8),
        height: Math.max(1800, window.innerHeight * 2)
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Apply theme class to document body
  useEffect(() => {
    document.body.className = isDarkMode ? 'dark-mode' : 'light-mode';
  }, [isDarkMode]);

  // Compute individual drug effects for each selected drug
  const drugPerturbedData = useMemo(() => {
    console.log('=== DRUG DATA COMPUTATION ===');
    console.log('selectedDrugs.size:', selectedDrugs.size);
    console.log('treatmentMode:', treatmentMode);
    console.log('baselineData.nodes.length:', baselineData.nodes.length);
    
    if (selectedDrugs.size === 0 || treatmentMode === 'control') {
      console.log('Returning null - no drugs selected or control mode');
      return null; // No drug data when in control mode or no drugs selected
    }

    // Create individual datasets for each selected drug
    const individualDrugData: { [drugId: string]: PathwayData } = {};
    
    selectedDrugs.forEach(drugId => {
      console.log(`Processing drug: ${drugId}`);
      const drug = DRUG_TREATMENTS.find(d => d.id === drugId);
      console.log(`Found drug:`, drug?.name);
      
      if (drug) {
        const perturbedData = applyDrugPerturbation(baselineData, drug);
        console.log(`Drug ${drugId} perturbation created ${perturbedData.nodes.length} nodes`);
        
        // Count how many nodes are perturbation targets
        const targetCount = perturbedData.nodes.filter(n => n.isPerturbationTarget).length;
        console.log(`Drug ${drugId} has ${targetCount} perturbation targets`);
        
        individualDrugData[drugId] = perturbedData;
      }
    });
    
    console.log('Final individualDrugData keys:', Object.keys(individualDrugData));
    console.log('=== END DRUG DATA COMPUTATION ===');
    return individualDrugData;
  }, [baselineData, selectedDrugs, treatmentMode]);

  // Get the current data to display (always baseline as base, with drug overlays)
  const currentData = useMemo(() => {
    // Always return baseline data as the base network
    return baselineData;
  }, [baselineData]);

  // Apply natural language query filtering and node type filtering
  const filteredData = useMemo(() => {
    let dataToFilter = currentData;
    
    // Apply natural language query filtering first
    if (queryText.trim() && nlpParser) {
      console.log('Applying NLP query:', queryText);
      const result = nlpParser.parseQuery(queryText, dataToFilter.nodes);
      console.log('Query result:', result);
      setQueryResult(result);
      
      // Use the filtered nodes from the query
      dataToFilter = {
        ...dataToFilter,
        nodes: result.nodes
      };
    } else {
      setQueryResult(null);
    }
    
    // Apply node type filtering
    const filteredNodes = dataToFilter.nodes.filter((node: BiologicalNode) => 
      visibleNodeTypes.has(node.type)
    );
    
    // Filter links to only include those between visible nodes
    const nodeIds = new Set(filteredNodes.map((n: BiologicalNode) => n.id));
    const filteredLinks = dataToFilter.links.filter((link: any) => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });
    
    return {
      nodes: filteredNodes,
      links: filteredLinks,
      pathways: dataToFilter.pathways
    };
  }, [currentData, queryText, nlpParser, visibleNodeTypes]);

  const toggleNodeType = (nodeType: OmicsType) => {
    const newVisibleTypes = new Set(visibleNodeTypes);
    if (newVisibleTypes.has(nodeType)) {
      newVisibleTypes.delete(nodeType);
    } else {
      newVisibleTypes.add(nodeType);
    }
    setVisibleNodeTypes(newVisibleTypes);
  };

  const toggleDrug = (drugId: string) => {
    const newSelectedDrugs = new Set(selectedDrugs);
    if (newSelectedDrugs.has(drugId)) {
      newSelectedDrugs.delete(drugId);
    } else {
      newSelectedDrugs.add(drugId);
    }
    setSelectedDrugs(newSelectedDrugs);
  };

  const handleQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Query processing happens automatically via useMemo
  };

  const handleExampleQuery = (exampleQuery: string) => {
    setQueryText(exampleQuery);
    setShowQueryHelp(false);
  };

  const clearQuery = () => {
    setQueryText('');
    setQueryResult(null);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Dashboard tile click handler
  const handleTileClick = (tileId: DashboardView) => {
    const tile = VISUALIZATION_TILES.find(t => t.id === tileId);
    if (tile?.status === 'active' || tile?.status === 'preview') {
      setCurrentView(tileId);
    }
  };

  // Render dashboard grid
  const renderDashboard = () => (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-subtitle">
          Multi-Scale Drug Discovery
          <svg viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
        <h2>Innovative Solutions for Biological Networks</h2>
        <p>Explore biological networks from molecular to system-level emergent properties</p>
      </div>
      
      <div className="tiles-grid">
        {VISUALIZATION_TILES.map(tile => (
          <div
            key={tile.id}
            className={`dashboard-tile ${tile.status} ${(tile.status === 'active' || tile.status === 'preview') ? 'clickable' : ''}`}
            onClick={() => handleTileClick(tile.id)}
          >
            <div className="tile-content">
              <div className="tile-icon">
                {/* Minimal black/white icons */}
                {tile.id === 'network' && '⚬'}
                {tile.id === 'heatmap' && '▦'}
                {tile.id === 'sankey' && '⟶'}
                {tile.id === 'radar' && '◈'}
                {tile.id === 'animation' && '◐'}
                {tile.id === 'ensemble' && '▬'}
                {tile.id === 'drugdesign' && '◯'}
                {tile.id === 'dose3d' && '△'}
                {tile.id === 'featurespace' && '◇'}
              </div>
              <h4>{tile.title}</h4>
              <p>{tile.description}</p>
              <div className={`tile-status ${tile.status}`}>
                {tile.status === 'active' && 'Explore Now'}
                {tile.status === 'preview' && 'Preview'}
                {tile.status === 'coming-soon' && 'Coming Soon'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render controls (only for network view)
  const renderControls = () => {
    if (currentView !== 'network') return null;
    
    return (
      <div className="controls-container">
        <div className="controls-content">
          {/* Natural Language Query */}
          <div className="control-group query-group">
            <label className="control-label">Query:</label>
            <div className="query-input-container">
              <form onSubmit={handleQuerySubmit}>
                <input
                  type="text"
                  className="query-input"
                  placeholder="Ask about the network (e.g., 'Show proteins in energy metabolism')"
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                />
                <button type="button" className="query-help-btn" onClick={() => setShowQueryHelp(!showQueryHelp)}>
                  ?
                </button>
                {queryText && (
                  <button type="button" className="query-clear-btn" onClick={clearQuery}>
                    ×
                  </button>
                )}
              </form>
              
              {showQueryHelp && (
                <div className="query-help">
                  <h4>Example Queries:</h4>
                  <div className="query-examples">
                    {EXAMPLE_QUERIES.slice(0, 6).map((example, index) => (
                      <button
                        key={index}
                        className="query-example"
                        onClick={() => handleExampleQuery(example)}
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {queryResult && (
                <div className="query-result">
                  <span className="query-explanation">{queryResult.explanation}</span>
                  <span className={`query-confidence ${queryResult.confidence > 0.7 ? 'high' : queryResult.confidence > 0.4 ? 'medium' : 'low'}`}>
                    {Math.round(queryResult.confidence * 100)}% confidence
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Treatment Mode Toggle */}
          <div className="control-group">
            <label className="control-label">Treatment:</label>
            <div className="toggle-group">
              <button 
                className={`toggle-button ${treatmentMode === 'control' ? 'active' : ''}`}
                onClick={() => setTreatmentMode('control')}
              >
                Control
              </button>
              <button 
                className={`toggle-button ${treatmentMode === 'drug' ? 'active' : ''}`}
                onClick={() => setTreatmentMode('drug')}
              >
                Drug
              </button>
            </div>
          </div>

          {/* Multi-Drug Selection (only visible when drug mode is selected) */}
          {treatmentMode === 'drug' && (
            <div className="control-group">
              <label className="control-label">Drugs:</label>
              <div className="drug-toggles">
                {DRUG_TREATMENTS.map(drug => (
                  <button
                    key={drug.id}
                    className={`drug-toggle ${selectedDrugs.has(drug.id) ? 'active' : ''}`}
                    onClick={() => toggleDrug(drug.id)}
                    title={`${drug.name} - ${drug.mechanism}`}
                  >
                    {drug.name}
                    {selectedDrugs.has(drug.id) && <span className="drug-check">✓</span>}
                  </button>
                ))}
              </div>

              

            </div>
          )}

          {/* Node Type Filters */}
          <div className="control-group">
            <label className="control-label">Show:</label>
            <div className="node-type-toggles">
              <button 
                className={`node-type-button proteins ${visibleNodeTypes.has(OmicsType.PROTEIN) ? 'active' : ''}`}
                onClick={() => toggleNodeType(OmicsType.PROTEIN)}
              >
                Proteins
              </button>
              <button 
                className={`node-type-button metabolites ${visibleNodeTypes.has(OmicsType.METABOLITE) ? 'active' : ''}`}
                onClick={() => toggleNodeType(OmicsType.METABOLITE)}
              >
                Metabolites
              </button>
              <button 
                className={`node-type-button lipids ${visibleNodeTypes.has(OmicsType.LIPID) ? 'active' : ''}`}
                onClick={() => toggleNodeType(OmicsType.LIPID)}
              >
                Lipids
              </button>
              <button 
                className={`node-type-button transcripts ${visibleNodeTypes.has(OmicsType.mRNA) ? 'active' : ''}`}
                onClick={() => toggleNodeType(OmicsType.mRNA)}
              >
                Transcripts
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render current visualization
  const renderCurrentVisualization = () => {
    switch (currentView) {
      case 'dashboard':
        return renderDashboard();
        
      case 'network':
        return (
          <div className="visualization-container-fullwidth">
            {filteredData.nodes.length > 0 && (
              <PathwayVisualization
                baselineData={filteredData}
                individualDrugData={drugPerturbedData}
                width={dimensions.width}
                height={dimensions.height}
                visualizationMode={treatmentMode === 'drug' ? VisualizationMode.PERTURBED : VisualizationMode.BASELINE}
                visibleNodeTypes={visibleNodeTypes}
                selectedDrugs={selectedDrugs}
                isDarkMode={isDarkMode}
              />
            )}
            
            {/* Info button for user instructions */}
            <button 
              className="info-button"
              onClick={() => setShowInfoPopup(!showInfoPopup)}
              title="Show network instructions"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M12 16v-4"/>
                <path d="M12 8h.01"/>
              </svg>
            </button>
            
            {/* Info popup */}
            {showInfoPopup && (
              <div className="info-popup">
                <div className="info-popup-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, color: 'var(--accent-primary)' }}>Network Instructions</h4>
                    <button
                      onClick={() => setShowInfoPopup(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '16px',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        opacity: 0.7
                      }}
                      onMouseEnter={(e) => (e.target as HTMLButtonElement).style.opacity = '1'}
                      onMouseLeave={(e) => (e.target as HTMLButtonElement).style.opacity = '0.7'}
                    >
                      ✕
                    </button>
                  </div>
                  <p style={{ margin: '8px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Click any node to highlight its pathway network
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case 'heatmap':
        return (
          <div className="visualization-container-fullwidth">
            <HierarchicalNetwork 
              data={baselineData}
              drugData={drugPerturbedData}
              selectedDrugs={selectedDrugs}
              isDarkMode={isDarkMode}
            />
          </div>
        );

      case 'sankey':
        return (
          <div className="visualization-container-fullwidth">
            <SankeyFlowDiagram 
              data={baselineData}
              drugData={drugPerturbedData}
              selectedDrugs={selectedDrugs}
              isDarkMode={isDarkMode}
            />
          </div>
        );

      case 'radar':
        return (
          <div className="visualization-container-fullwidth">
            <RadarChart 
              data={baselineData}
              drugData={drugPerturbedData}
              selectedDrugs={selectedDrugs}
              isDarkMode={isDarkMode}
            />
          </div>
        );

      case 'animation':
        return (
          <div className="visualization-container-fullwidth">
            <PerturbationAnimation 
              data={baselineData}
              drugData={drugPerturbedData}
              selectedDrugs={selectedDrugs}
              isDarkMode={isDarkMode}
            />
          </div>
        );

      case 'ensemble':
        return (
          <div className="visualization-container-fullwidth">
            <EnsembleFans 
              data={baselineData}
              drugData={drugPerturbedData}
              selectedDrugs={selectedDrugs}
              isDarkMode={isDarkMode}
            />
          </div>
        );

      case 'dose3d':
        return (
          <div className="visualization-container-fullwidth">
            <DoseResponse3D 
              data={baselineData}
              drugData={drugPerturbedData}
              selectedDrugs={selectedDrugs}
              isDarkMode={isDarkMode}
            />
          </div>
        );

      case 'drugdesign':
      case 'featurespace':
      default:
        return (
          <div className="visualization-container-fullwidth">
            <div className="coming-soon-message">
              <h3>🚧 Coming Soon</h3>
              <p>This visualization is under development.</p>
              <button 
                className="back-to-dashboard"
                onClick={() => setCurrentView('dashboard')}
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="app">
      <div className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1>GAIA</h1>
          </div>
          <div className="header-center">
            {currentView !== 'dashboard' && (
              <button 
                className="back-to-dashboard-btn"
                onClick={() => setCurrentView('dashboard')}
              >
                ← Dashboard
              </button>
            )}
          </div>
          <div className="header-right">
            <div className="header-nav">
              <button 
                className="theme-toggle"
                onClick={toggleTheme}
                title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
              >
              </button>
              <span className="nav-item">Setup</span>
              <span className="nav-item active">Dashboard</span>
              <span className="nav-item">Sign-In</span>
            </div>
          </div>
        </div>
      </div>

      {renderControls()}
      
      <div className="app-content">
        {renderCurrentVisualization()}
      </div>
      
      {/* Static footer at bottom of page */}
      <div className="static-footer">
        <p>Hansjörg Wyss Institute for Biologically Inspired Engineering at Harvard University</p>
      </div>
    </div>
  );
}

export default App;
