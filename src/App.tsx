import React, { useState, useEffect, useMemo } from 'react';
import PathwayVisualization from './components/PathwayVisualization';
import { generateMockData, applyDrugPerturbation, DRUG_TREATMENTS } from './data/mockData';
import { PathwayData, VisualizationMode, OmicsType, BiologicalNode } from './types';
import { NaturalLanguageQueryParser, QueryResult, EXAMPLE_QUERIES } from './utils/naturalLanguageQuery';
import './App.css';

function App() {
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

  return (
    <div className="app">
      <div className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1>GAIA</h1>
          </div>
          <div className="header-center">
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

              
              {selectedDrugs.size > 1 && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                  💡 Each drug shows as a unique colored ring around affected nodes
                </div>
              )}
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
      
      <div className="app-content">
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
      </div>
      
      {/* Static footer at bottom of page */}
      <div className="static-footer">
        <p>Hansjörg Wyss Institute for Biologically Inspired Engineering at Harvard University</p>
      </div>
    </div>
  );
}

export default App;
