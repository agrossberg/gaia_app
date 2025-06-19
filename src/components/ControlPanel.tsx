import React from 'react';
import { OmicsType, DrugTreatment, VisualizationMode } from '../types';
import { BROAD_CATEGORIES } from '../data/mockData';
import './ControlPanel.css';

interface ControlPanelProps {
  pathways: string[];
  selectedPathway?: string;
  selectedOmicsType?: OmicsType;
  availableDrugs: DrugTreatment[];
  selectedDrug?: DrugTreatment;
  visualizationMode: VisualizationMode;
  onPathwayChange: (pathway: string | undefined) => void;
  onOmicsTypeChange: (omicsType: OmicsType | undefined) => void;
  onDrugChange: (drug: DrugTreatment | undefined) => void;
  onVisualizationModeChange: (mode: VisualizationMode) => void;
  onReset: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  pathways,
  selectedPathway,
  selectedOmicsType,
  availableDrugs,
  selectedDrug,
  visualizationMode,
  onPathwayChange,
  onOmicsTypeChange,
  onDrugChange,
  onVisualizationModeChange,
  onReset
}) => {
  const omicsTypes = Object.values(OmicsType);
  const visualizationModes = Object.values(VisualizationMode);

  const getModeDisplayName = (mode: VisualizationMode) => {
    switch (mode) {
      case VisualizationMode.BASELINE: return '🌌 Baseline Constellation';
      case VisualizationMode.PERTURBED: return '💊 Drug-Perturbed';
      case VisualizationMode.COMPARISON: return '📊 Before/After';
      default: return mode;
    }
  };

  // Filter out animation mode for static visualization
  const availableModes = visualizationModes.filter(mode => mode !== VisualizationMode.ANIMATION);

  return (
    <div className="control-panel">
      <div className="control-section">
        <h3>Biological Network Explorer</h3>
        <p className="subtitle">Explore cascading omics networks across biological pathway categories</p>
      </div>

      <div className="control-section">
        <label htmlFor="drug-select">💊 Drug Treatment:</label>
        <select
          id="drug-select"
          value={selectedDrug?.id || ''}
          onChange={(e) => {
            const drug = availableDrugs.find(d => d.id === e.target.value);
            onDrugChange(drug);
          }}
          className="control-select drug-select"
        >
          <option value="">No Drug Treatment</option>
          {availableDrugs.map(drug => (
            <option key={drug.id} value={drug.id}>
              {drug.name} ({drug.mechanism})
            </option>
          ))}
        </select>
        {selectedDrug && (
          <div className="drug-info">
            <div className="drug-detail">
              <strong>Mechanism:</strong> {selectedDrug.mechanism}
            </div>
            <div className="drug-detail">
              <strong>Target Pathways:</strong> {selectedDrug.targetPathways.join(', ')}
            </div>
            <div className="drug-detail">
              <strong>Target Omics:</strong> {selectedDrug.targetOmicsTypes.join(', ')}
            </div>
          </div>
        )}
      </div>

      <div className="control-section">
        <label htmlFor="mode-select">👁️ Visualization Mode:</label>
        <select
          id="mode-select"
          value={visualizationMode}
          onChange={(e) => onVisualizationModeChange(e.target.value as VisualizationMode)}
          className="control-select mode-select"
        >
          {availableModes.map(mode => (
            <option key={mode} value={mode}>
              {getModeDisplayName(mode)}
            </option>
          ))}
        </select>
      </div>

      <div className="control-section">
        <label htmlFor="pathway-select">🧭 Filter by Specific Pathway:</label>
        <select
          id="pathway-select"
          value={selectedPathway || ''}
          onChange={(e) => onPathwayChange(e.target.value || undefined)}
          className="control-select"
        >
          <option value="">All Pathways</option>
          {Object.entries(BROAD_CATEGORIES).map(([category, subPathways]) => (
            <optgroup key={category} label={category}>
              {subPathways.map(pathway => (
                <option key={pathway} value={pathway}>
                  {pathway}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="control-section">
        <label htmlFor="omics-select">🔬 Filter by Omics Layer:</label>
        <select
          id="omics-select"
          value={selectedOmicsType || ''}
          onChange={(e) => onOmicsTypeChange(e.target.value as OmicsType || undefined)}
          className="control-select"
        >
          <option value="">All Omics Layers</option>
          {omicsTypes.map(type => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div className="control-section">
        <button onClick={onReset} className="reset-button">
          Reset All Filters
        </button>
      </div>

      <div className="legend">
        <h4>Network Structure</h4>
        
        <div className="legend-section">
          <h5>Time Series (Left Side)</h5>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#FFD700' }}></div>
              <span>10 min - Early response</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#FFD700' }}></div>
              <span>30 min - Protein activity</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#FFD700' }}></div>
              <span>90 min - Transcriptional peak</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#FFD700' }}></div>
              <span>48 hours - Long-term changes</span>
            </div>
          </div>
        </div>
        
        <div className="legend-section">
          <h5>Broad Categories (Top)</h5>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#FFD700' }}></div>
              <span>Energy Metabolism</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#FF6347' }}></div>
              <span>Immune Response</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#9370DB' }}></div>
              <span>Oxidative Stress</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#00CED1' }}></div>
              <span>Circadian Rhythm</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#32CD32' }}></div>
              <span>Blood Pressure</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#FF69B4' }}></div>
              <span>Heart Rate</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#FFA500' }}></div>
              <span>Temperature Regulation</span>
            </div>
          </div>
        </div>
        
        <div className="legend-section">
          <h5>Node Colors & Interactions</h5>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#FFD700' }}></div>
              <span>Default nodes (yellow)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#FF1493' }}></div>
              <span>Selected node (bright pink)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#FF6B35' }}></div>
              <span>Pathway nodes (orange)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#FF6B35', opacity: 0.8 }}></div>
              <span>Pathway connections (orange)</span>
            </div>
          </div>
        </div>
        
        <div className="legend-section">
          <h5>Drug Effects</h5>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-symbol upregulated">↗</div>
              <span>Upregulated (brighter/larger)</span>
            </div>
            <div className="legend-item">
              <div className="legend-symbol downregulated">↘</div>
              <span>Downregulated (dimmer/smaller)</span>
            </div>
            <div className="legend-item">
              <div className="legend-symbol enhanced">—</div>
              <span>Enhanced interactions (thicker)</span>
            </div>
            <div className="legend-item">
              <div className="legend-symbol disrupted">⋯</div>
              <span>Disrupted interactions (thinner)</span>
            </div>
          </div>
        </div>

        <div className="legend-info">
          <p><strong>Layout:</strong> Time series flows top-to-bottom, categories spread left-to-right</p>
          <p><strong>Node interaction:</strong> Click any node to highlight its entire pathway across categories and omics layers</p>
          <p><strong>Node size:</strong> Confidence in causal chain importance (larger = higher confidence)</p>
          <p><strong>Line thickness:</strong> Connection strength (thicker when highlighted)</p>
          <p><strong>Distribution:</strong> Proteins/metabolites heavier in early timepoints</p>
          <p><strong>Deselect:</strong> Click empty space or same node again</p>
        </div>
      </div>

      <div className="instructions">
        <h4>How to Use</h4>
        <ul>
          <li>🎯 <strong>Click any node</strong> to highlight its entire pathway across timepoints and categories</li>
          <li>💊 <strong>Select a drug</strong> to see perturbation effects</li>
          <li>👁️ <strong>Choose visualization mode</strong> to compare states</li>
          <li>🔍 <strong>Filter by pathway or omics</strong> to focus your view</li>
          <li>🖱️ <strong>Drag nodes</strong> to rearrange the network</li>
          <li>🔄 <strong>Click empty space</strong> to deselect all highlights</li>
        </ul>
      </div>
    </div>
  );
};

export default ControlPanel; 