import React, { useState, useEffect, useMemo } from 'react';
import PathwayVisualization from './components/PathwayVisualization';
import HierarchicalNetwork3D from './components/HierarchicalNetwork3D';
import SankeyFlowDiagram from './components/SankeyFlowDiagram';
import RadarChart from './components/RadarChart';
import { generateMockData, applyDrugPerturbation, DRUG_TREATMENTS } from './data/mockData';
import { PathwayData, VisualizationMode, OmicsType, BiologicalNode } from './types';
import { NaturalLanguageQueryParser, QueryResult, EXAMPLE_QUERIES } from './utils/naturalLanguageQuery';
import './App.css';

// Dashboard view types
type DashboardView = 'dashboard' | 'network' | 'sankey' | 'radar' | 'drugdesign' | 'featurespace' | 'network3d';

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
    id: 'network3d',
    title: '3D Force Graph',
    description: 'Interactive 3D hierarchical network exploring biological systems from molecular to organismal scales',
    category: 'molecular',
    status: 'active',
    icon: '🌌'
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
    id: 'drugdesign',
    title: 'Drug Design Explorer',
    description: 'Interactive parameter space for novel drug design and optimization',
    category: 'design',
    status: 'coming-soon',
    icon: '🧪'
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
  
  // Core application states
  const [baselineData, setBaselineData] = useState<PathwayData>({ nodes: [], links: [], pathways: [] });
  const [dimensions, setDimensions] = useState({
    width: Math.max(window.innerWidth - 40, 1200), // More reasonable sizing for laptops
    height: Math.max(window.innerHeight - 200, 800) // Account for header and controls
  });

  // Control states
  const [treatmentMode, setTreatmentMode] = useState<'control' | 'drug'>('control');
  const [selectedDrugs, setSelectedDrugs] = useState<Set<string>>(new Set());
  const [visibleNodeTypes, setVisibleNodeTypes] = useState<Set<OmicsType>>(
    new Set([OmicsType.mRNA, OmicsType.PROTEIN, OmicsType.METABOLITE, OmicsType.LIPID])
  );

  // Theme and layer states
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set([
    'systems', 'organs', 'tissues', 'cellular', 'molecular'
  ]));

  // Query states
  const [queryText, setQueryText] = useState<string>('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [showQueryHelp, setShowQueryHelp] = useState<boolean>(false);
  const [nlpParser, setNlpParser] = useState<NaturalLanguageQueryParser | null>(null);
  const [showInfoPopup, setShowInfoPopup] = useState<boolean>(false);

  useEffect(() => {
    const mockData = generateMockData();
    setBaselineData(mockData);
    
    const parser = new NaturalLanguageQueryParser(mockData);
    setNlpParser(parser);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: Math.max(window.innerWidth - 40, 1200), // More reasonable sizing for laptops
        height: Math.max(window.innerHeight - 200, 800) // Account for header and controls
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const viewFromUrl = urlParams.get('view') as DashboardView;
      const validView = VISUALIZATION_TILES.find(tile => tile.id === viewFromUrl)?.id || 'dashboard';
      setCurrentView(validView);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (currentView === 'dashboard') {
      url.searchParams.delete('view');
    } else {
      url.searchParams.set('view', currentView);
    }
    
    window.history.replaceState({}, '', url.toString());
  }, [currentView]);

  useEffect(() => {
    document.body.className = isDarkMode ? 'dark-mode' : 'light-mode';
  }, [isDarkMode]);

  // Compute individual drug effects for each selected drug
  const drugPerturbedData = useMemo(() => {
    if (selectedDrugs.size === 0 || treatmentMode === 'control') {
      return null;
    }

    const individualDrugData: { [drugId: string]: PathwayData } = {};
    
    selectedDrugs.forEach(drugId => {
      const drug = DRUG_TREATMENTS.find(d => d.id === drugId);
      
      if (drug) {
        const perturbedData = applyDrugPerturbation(baselineData, drug);
        individualDrugData[drugId] = perturbedData;
      }
    });
    
    return individualDrugData;
  }, [baselineData, selectedDrugs, treatmentMode]);

  // Get the current data to display (always baseline as base, with drug overlays)
  const currentData = useMemo(() => {
    return baselineData;
  }, [baselineData]);

  // Apply natural language query filtering and node type filtering
  const filteredData = useMemo(() => {
    let dataToFilter = currentData;
    
    if (queryText.trim() && nlpParser) {
      const result = nlpParser.parseQuery(queryText, dataToFilter.nodes);
      setQueryResult(result);
      
      if (result.nodes.length > 0) {
        dataToFilter = {
          ...dataToFilter,
          nodes: result.nodes,
          links: dataToFilter.links.filter(link => {
            const sourceId = typeof link.source === 'string' ? link.source : (link.source as BiologicalNode).id;
            const targetId = typeof link.target === 'string' ? link.target : (link.target as BiologicalNode).id;
            return result.nodes.some(node => node.id === sourceId || node.id === targetId);
          })
        };
      }
    }
    
    const filteredNodes = dataToFilter.nodes.filter(node => 
      visibleNodeTypes.has(node.type)
    );
    
    const filteredLinks = dataToFilter.links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : (link.source as BiologicalNode).id;
      const targetId = typeof link.target === 'string' ? link.target : (link.target as BiologicalNode).id;
      return filteredNodes.some(node => node.id === sourceId) && 
             filteredNodes.some(node => node.id === targetId);
    });
    
    return {
      ...dataToFilter,
      nodes: filteredNodes,
      links: filteredLinks
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

  const toggleLayer = (layerName: string) => {
    const newVisibleLayers = new Set(visibleLayers);
    if (newVisibleLayers.has(layerName)) {
      newVisibleLayers.delete(layerName);
    } else {
      newVisibleLayers.add(layerName);
    }
    setVisibleLayers(newVisibleLayers);
  };

  // Dashboard tile click handler with browser history
  const handleTileClick = (tileId: DashboardView) => {
    const tile = VISUALIZATION_TILES.find(t => t.id === tileId);
    if (tile?.status === 'active' || tile?.status === 'preview') {
      // Add to browser history
      const url = new URL(window.location.href);
      url.searchParams.set('view', tileId);
      window.history.pushState({}, '', url.toString());
      setCurrentView(tileId);
    }
  };

  // Dashboard navigation handler
  const handleDashboardClick = () => {
    if (currentView === 'dashboard') {
      // Reset the page by reloading
      window.location.reload();
    } else {
      // Go back to dashboard
      const url = new URL(window.location.href);
      url.searchParams.delete('view');
      window.history.pushState({}, '', url.toString());
      setCurrentView('dashboard');
    }
  };

  const handleNodeClick = (nodeId: string) => {
    // Node click handler - can be extended for future functionality
  };

  // Render dashboard grid
  const renderDashboard = () => (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-subtitle">
          Data exploration, hypothesis generation, and drug discovery
          <svg viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
        <h2>Exploring the How Behind the What</h2>
        <p>An AI Ecosystem for Exploration of Complex Biological Systems to Accelerate Our Understanding of Anesthetic Drugs and their Mechanism</p>
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
                {tile.id === 'network3d' && '◉'}
                {tile.id === 'sankey' && '⟶'}
                {tile.id === 'radar' && '◈'}
                {tile.id === 'drugdesign' && '◯'}
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

  // Render controls (for network, hierarchical network, sankey, and radar views)
  const renderControls = () => {
    if (currentView !== 'network' && currentView !== 'network3d' && currentView !== 'sankey' && currentView !== 'radar') return null;
    
    // Different controls for 3D network vs regular network
    if (currentView === 'network3d') {
      return (
        <div className="controls-container network-explorer-controls">
          <div className="controls-content">
                        {/* Blue Title using the same class as Network Explorer */}
            <div className="section-title" style={{ textTransform: 'none' }}>
              3D Network Explorer
            </div>

            {/* High-level Summary with no bottom margin */}
            <div style={{ 
              fontSize: '14px', 
              color: 'var(--text-secondary)', 
              lineHeight: '1.5',
              textAlign: 'left',
              marginBottom: '0'
            }}>
              Hierarchical Network Visualization
            </div>
              
              {/* Horizontal controls row to center all buttons */}
            <div className="controls-row">
              {/* Network Topology Selection */}
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

              {/* Drug Selection for Different Topologies */}
              {treatmentMode === 'drug' && (
                <div className="control-group">
                  <label className="control-label">Drug:</label>
                  <div className="drug-toggles">
                    {DRUG_TREATMENTS.map(drug => (
                      <button
                        key={drug.id}
                        className={`drug-toggle ${selectedDrugs.has(drug.id) ? 'active' : ''}`}
                        onClick={() => {
                          // For 3D network, only allow one drug at a time for topology generation
                          const newSelectedDrugs = new Set<string>();
                          if (!selectedDrugs.has(drug.id)) {
                            newSelectedDrugs.add(drug.id);
                          }
                          setSelectedDrugs(newSelectedDrugs);
                        }}
                        title={`Generate network topology optimized for ${drug.name} - ${drug.mechanism}`}
                      >
                        {drug.name}
                        {selectedDrugs.has(drug.id) && <span className="drug-check">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Layer Toggle Controls */}
              <div className="control-group">
                <label className="control-label">Network Layers:</label>
                <div className="layer-controls">
                  {[
                    { key: 'systems', label: 'Systems', color: '#E86659' },
                    { key: 'organs', label: 'Organs', color: '#CCCCFF' },
                    { key: 'tissues', label: 'Tissues', color: '#FF7F50' },
                    { key: 'cellular', label: 'Cellular', color: '#9FE2BF' },
                    { key: 'molecular', label: 'Molecular', color: '#DFFF00' }
                  ].map(layer => (
                    <button
                      key={layer.key}
                      onClick={() => toggleLayer(layer.key)}
                      className={`layer-toggle ${visibleLayers.has(layer.key) ? 'active' : ''}`}
                      style={{
                        backgroundColor: visibleLayers.has(layer.key) ? layer.color : 'transparent',
                        borderColor: layer.color,
                        color: visibleLayers.has(layer.key) ? '#000' : layer.color,
                        fontSize: '12px',
                        padding: '6px 12px',
                        margin: '4px',
                        border: `2px solid ${layer.color}`,
                        borderRadius: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontWeight: visibleLayers.has(layer.key) ? 'bold' : 'normal'
                      }}
                    >
                      {layer.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>


          </div>
        </div>
      );
    }
    
    // Controls for sankey view
    if (currentView === 'sankey') {
      return (
        <div className="controls-container network-explorer-controls">
          <div className="controls-content">
            {/* Blue Title */}
            <div className="section-title" style={{ 
              color: '#364FA1', 
              textTransform: 'none',
              fontSize: '20px'
            }}>
              Multi-Scale Flow
            </div>

            {/* High-level Summary */}
            <div style={{ 
              fontSize: '14px', 
              color: 'var(--text-secondary)', 
              lineHeight: '1.5',
              textAlign: 'left',
              marginBottom: '6px'
            }}>
              Sankey diagrams showing molecular → cellular → system cascades. Click nodes to expand/collapse sections.
            </div>

            {/* Horizontal controls row */}
            <div className="controls-row">
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
            </div>
          </div>
        </div>
      );
    }
    
    // Controls for radar view
    if (currentView === 'radar') {
      return (
        <div className="controls-container network-explorer-controls">
          <div className="controls-content">
            {/* Blue Title */}
            <div className="section-title" style={{ textTransform: 'none' }}>
              Drug Profile Radar
            </div>

            {/* High-level Summary */}
            <div style={{ 
              fontSize: '14px', 
              color: 'var(--text-secondary)', 
              lineHeight: '1.5',
              textAlign: 'left',
              marginBottom: '6px',
              maxWidth: '600px'
            }}>
              Compare drug effects across multiple biological pathways. Each drug shows a unique profile pattern.
            </div>
          </div>
        </div>
      );
    }
    
    // Original controls for regular network explorer
    return (
      <div className="controls-container network-explorer-controls">
        <div className="controls-content">
          {/* Blue Title */}
          <div className="section-title" style={{ 
            color: '#364FA1', 
            textTransform: 'none',
            fontSize: '20px'
          }}>
            Network Explorer
          </div>

          {/* High-level Summary */}
          <div style={{ 
            fontSize: '14px', 
            color: 'var(--text-secondary)', 
            lineHeight: '1.5',
            textAlign: 'left',
            marginBottom: '6px',
            maxWidth: '600px'
          }}>
            Explore biological pathways through interactive network visualization.
          </div>

          {/* Horizontal controls row */}
          <div className="controls-row">
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

            {/* Network Layers with Info Button */}
            <div className="control-group">
              <label className="control-label">Network Layers:</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="layer-controls">
                  <button 
                    className={`layer-toggle ${visibleNodeTypes.has(OmicsType.PROTEIN) ? 'active' : ''}`}
                    onClick={() => toggleNodeType(OmicsType.PROTEIN)}
                    style={{
                      backgroundColor: visibleNodeTypes.has(OmicsType.PROTEIN) ? '#CCCCFF' : 'transparent',
                      borderColor: '#CCCCFF',
                      color: visibleNodeTypes.has(OmicsType.PROTEIN) ? '#000' : '#CCCCFF',
                      fontSize: '12px',
                      padding: '6px 12px',
                      margin: '4px',
                      border: '2px solid #CCCCFF',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontWeight: visibleNodeTypes.has(OmicsType.PROTEIN) ? 'bold' : 'normal'
                    }}
                  >
                    Proteins
                  </button>
                  <button 
                    className={`layer-toggle ${visibleNodeTypes.has(OmicsType.METABOLITE) ? 'active' : ''}`}
                    onClick={() => toggleNodeType(OmicsType.METABOLITE)}
                    style={{
                      backgroundColor: visibleNodeTypes.has(OmicsType.METABOLITE) ? '#FF7F50' : 'transparent',
                      borderColor: '#FF7F50',
                      color: visibleNodeTypes.has(OmicsType.METABOLITE) ? '#000' : '#FF7F50',
                      fontSize: '12px',
                      padding: '6px 12px',
                      margin: '4px',
                      border: '2px solid #FF7F50',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontWeight: visibleNodeTypes.has(OmicsType.METABOLITE) ? 'bold' : 'normal'
                    }}
                  >
                    Metabolites
                  </button>
                  <button 
                    className={`layer-toggle ${visibleNodeTypes.has(OmicsType.LIPID) ? 'active' : ''}`}
                    onClick={() => toggleNodeType(OmicsType.LIPID)}
                    style={{
                      backgroundColor: visibleNodeTypes.has(OmicsType.LIPID) ? '#DFFF00' : 'transparent',
                      borderColor: '#DFFF00',
                      color: visibleNodeTypes.has(OmicsType.LIPID) ? '#000' : '#DFFF00',
                      fontSize: '12px',
                      padding: '6px 12px',
                      margin: '4px',
                      border: '2px solid #DFFF00',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontWeight: visibleNodeTypes.has(OmicsType.LIPID) ? 'bold' : 'normal'
                    }}
                  >
                    Lipids
                  </button>
                  <button 
                    className={`layer-toggle ${visibleNodeTypes.has(OmicsType.mRNA) ? 'active' : ''}`}
                    onClick={() => toggleNodeType(OmicsType.mRNA)}
                    style={{
                      backgroundColor: visibleNodeTypes.has(OmicsType.mRNA) ? '#9FE2BF' : 'transparent',
                      borderColor: '#9FE2BF',
                      color: visibleNodeTypes.has(OmicsType.mRNA) ? '#000' : '#9FE2BF',
                      fontSize: '12px',
                      padding: '6px 12px',
                      margin: '4px',
                      border: '2px solid #9FE2BF',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontWeight: visibleNodeTypes.has(OmicsType.mRNA) ? 'bold' : 'normal'
                    }}
                  >
                    Transcripts
                  </button>
                </div>
                <button 
                  className="info-button-small"
                  onClick={() => setShowInfoPopup(!showInfoPopup)}
                  title="Show instructions"
                  style={{
                    width: '32px',
                    height: '32px',
                    fontSize: '14px',
                    marginLeft: '4px'
                  }}
                >
                  ?
                </button>
              </div>
            </div>
          </div>

          {/* Info Popup */}
          {showInfoPopup && (
            <div style={{
              position: 'absolute',
              top: '120px',
              right: '20px',
              zIndex: 1001,
              width: '320px',
              background: isDarkMode ? 'rgba(30, 30, 40, 0.95)' : 'rgba(232, 227, 207, 0.95)',
              mixBlendMode: 'normal',
              isolation: 'isolate',
              borderRadius: '8px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
              border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`,
              overflow: 'hidden',
              padding: '16px',
              boxSizing: 'border-box'
            }}>
              {/* Close button in the corner */}
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px'
              }}>
                <button 
                  onClick={() => setShowInfoPopup(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '18px',
                    cursor: 'pointer',
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                    padding: '4px',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px'
                  }}
                >
                  ×
                </button>
              </div>
              
              {/* Title */}
              <h4 style={{ 
                margin: '0 0 12px 0', 
                color: isDarkMode ? 'var(--accent-primary)' : '#364FA1', 
                fontSize: '16px', 
                fontWeight: '600' 
              }}>
                Instructions
              </h4>
              
              {/* Content */}
              <div style={{ 
                fontSize: '13px', 
                color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)', 
                lineHeight: '1.5',
                width: '100%'
              }}>
                <ul style={{ 
                  margin: '0', 
                  paddingLeft: '20px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  <li style={{ marginBottom: '6px' }}><strong>Click nodes</strong> to highlight pathways</li>
                  <li style={{ marginBottom: '6px' }}><strong>Click empty space</strong> to deselect</li>
                  <li style={{ marginBottom: '6px' }}><strong>Node size</strong> = confidence in causal chain importance</li>
                  <li style={{ marginBottom: '6px' }}><strong>Scroll</strong> horizontally/vertically to explore the full network</li>
                  <li style={{ marginBottom: '6px' }}><strong>Drag popups</strong> anywhere on the panel to move them around</li>
                  {treatmentMode === 'drug' && (
                    <li><strong>Green</strong> = upregulated • <strong>Red</strong> = downregulated • <strong>Larger</strong> = stronger effect</li>
                  )}
                </ul>
              </div>
            </div>
          )}
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
          </div>
        );

      case 'network3d':
        return (
          <div className="visualization-container-fullwidth">
            <HierarchicalNetwork3D 
              data={baselineData}
              drugData={drugPerturbedData}
              selectedDrugs={selectedDrugs}
              isDarkMode={isDarkMode}
              visibleLayers={visibleLayers}
              onNodeClick={handleNodeClick}
              onLayerToggle={toggleLayer}
            />
          </div>
        );

      case 'sankey':
        return (
          <div className="visualization-container-fullwidth">
            <SankeyFlowDiagram 
              data={baselineData}
              drugData={drugPerturbedData}
              isDarkMode={isDarkMode}
              selectedDrugs={selectedDrugs}
              onDrugToggle={toggleDrug}
              treatmentMode={treatmentMode}
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
            {/* Removed separate back button */}
          </div>
          <div className="header-right">
            <div className="header-nav">
              <button 
                className="theme-toggle"
                onClick={toggleTheme}
                title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
              >
              </button>
              <span 
                className={`nav-item ${currentView !== 'dashboard' ? 'dashboard-nav' : ''}`}
                onClick={handleDashboardClick}
                style={{ cursor: 'pointer' }}
              >
                Dashboard
              </span>
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
