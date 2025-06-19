import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { PathwayData, OmicsType } from '../types';
import './SankeyFlowDiagram.css';

// Import d3-sankey using require to avoid TypeScript module resolution issues
const d3Sankey = require('d3-sankey');

interface SankeyFlowDiagramProps {
  data: PathwayData;
  drugData?: { [drugId: string]: PathwayData } | null;
  selectedDrugs?: Set<string>;
  isDarkMode?: boolean;
}

// Simplified interfaces without circular references
interface SankeyNodeData {
  id: string;
  name: string;
  category: 'molecular' | 'cellular' | 'system';
  level: number;
  value: number;
  color: string;
  drugEffect?: number;
  // Sankey layout properties (added by D3)
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  index?: number;
}

interface SankeyLinkData {
  source: string | number;
  target: string | number;
  value: number;
  drugEffect?: number;
  // Sankey layout properties (added by D3)
  width?: number;
  index?: number;
  y0?: number;
  y1?: number;
}

const SankeyFlowDiagram: React.FC<SankeyFlowDiagramProps> = ({
  data,
  drugData,
  selectedDrugs = new Set(),
  isDarkMode = false
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Process data into Sankey format
  const sankeyData = useMemo(() => {
    // Helper functions
    function calculateDrugEffect(pathway: string, omicsType: OmicsType): number {
      if (!drugData || selectedDrugs.size === 0) return 0;
      
      let totalEffect = 0;
      let count = 0;
      
      selectedDrugs.forEach(drugId => {
        const drugNodes = drugData[drugId]?.nodes.filter(n => 
          n.pathway === pathway && n.type === omicsType
        );
        if (drugNodes && drugNodes.length > 0) {
          const avgFoldChange = drugNodes.reduce((sum, n) => sum + Math.abs((n.foldChange || 1) - 1), 0) / drugNodes.length;
          totalEffect += avgFoldChange;
          count++;
        }
      });
      
      return count > 0 ? totalEffect / count : 0;
    }

    function getOmicsColor(omicsType: OmicsType): string {
      const colors: Record<OmicsType, string> = {
        [OmicsType.PROTEIN]: '#CCCCFF',
        [OmicsType.METABOLITE]: '#FF7F50',
        [OmicsType.LIPID]: '#DFFF00',
        [OmicsType.mRNA]: '#9FE2BF'
      };
      return colors[omicsType] || '#888888';
    }

    function getCellularColor(category: string): string {
      const colors: Record<string, string> = {
        'Energy Production': '#FF6B6B',
        'Protein Synthesis': '#4ECDC4',
        'Signal Transduction': '#45B7D1',
        'Membrane Function': '#96CEB4'
      };
      return colors[category] || '#888888';
    }

    function getSystemColor(category: string): string {
      const colors: Record<string, string> = {
        'Cellular Metabolism': '#FECA57',
        'Physiological Response': '#FF9FF3',
        'Behavioral Output': '#54A0FF'
      };
      return colors[category] || '#888888';
    }

    function isRelatedToCategory(molecularName: string, category: string): boolean {
      const relationships: Record<string, string[]> = {
        'Energy Production': ['Glucose Metabolism', 'Lipid Metabolism', 'metabolites'],
        'Protein Synthesis': ['Protein Synthesis', 'proteins', 'mRNA'],
        'Signal Transduction': ['Signal Transduction', 'Cell Cycle', 'proteins'],
        'Membrane Function': ['lipids', 'Transport']
      };
      
      const keywords = relationships[category] || [];
      return keywords.some((keyword: string) => molecularName.toLowerCase().includes(keyword.toLowerCase()));
    }

    function isRelatedToSystemCategory(cellularName: string, systemCategory: string): boolean {
      const relationships: Record<string, string[]> = {
        'Cellular Metabolism': ['Energy Production', 'Protein Synthesis'],
        'Physiological Response': ['Signal Transduction', 'Membrane Function'],
        'Behavioral Output': ['Signal Transduction', 'Energy Production']
      };
      
      const keywords = relationships[systemCategory] || [];
      return keywords.some((keyword: string) => cellularName.includes(keyword));
    }

    const nodes: SankeyNodeData[] = [];
    const links: SankeyLinkData[] = [];

    // Define the multi-scale hierarchy
    const molecularNodes = new Map<string, number>();

    // Group molecular data by pathway and omics type
    data.nodes.forEach(node => {
      const molecularKey = `${node.pathway}_${node.type}`;
      const currentValue = molecularNodes.get(molecularKey) || 0;
      molecularNodes.set(molecularKey, currentValue + (node.expression || 0.5));
    });

    // Create molecular level nodes
    let nodeIndex = 0;
    molecularNodes.forEach((value, key) => {
      const [pathway, omicsType] = key.split('_');
      nodes.push({
        id: `mol_${nodeIndex}`,
        name: `${pathway} (${omicsType})`,
        category: 'molecular',
        level: 0,
        value: value,
        color: getOmicsColor(omicsType as OmicsType),
        drugEffect: calculateDrugEffect(pathway, omicsType as OmicsType)
      });
      nodeIndex++;
    });

    // Create cellular level nodes (group by broad categories)
    const cellularCategories = ['Energy Production', 'Protein Synthesis', 'Signal Transduction', 'Membrane Function'];
    cellularCategories.forEach(category => {
      const relatedMolecular = nodes.filter(n => 
        n.category === 'molecular' && isRelatedToCategory(n.name, category)
      );
      
      if (relatedMolecular.length > 0) {
        const totalValue = relatedMolecular.reduce((sum, n) => sum + n.value, 0);
        const avgDrugEffect = relatedMolecular.reduce((sum, n) => sum + (n.drugEffect || 0), 0) / relatedMolecular.length;
        
        nodes.push({
          id: `cell_${nodeIndex}`,
          name: category,
          category: 'cellular',
          level: 1,
          value: totalValue * 0.7, // Some loss in transition
          color: getCellularColor(category),
          drugEffect: avgDrugEffect * 0.8
        });
        
        // Create links from molecular to cellular
        relatedMolecular.forEach(molNode => {
          links.push({
            source: molNode.id,
            target: `cell_${nodeIndex}`,
            value: molNode.value * 0.3,
            drugEffect: molNode.drugEffect
          });
        });
        
        nodeIndex++;
      }
    });

    // Create system level nodes
    const systemCategories = ['Cellular Metabolism', 'Physiological Response', 'Behavioral Output'];
    systemCategories.forEach(category => {
      const relatedCellular = nodes.filter(n => 
        n.category === 'cellular' && isRelatedToSystemCategory(n.name, category)
      );
      
      if (relatedCellular.length > 0) {
        const totalValue = relatedCellular.reduce((sum, n) => sum + n.value, 0);
        const avgDrugEffect = relatedCellular.reduce((sum, n) => sum + (n.drugEffect || 0), 0) / relatedCellular.length;
        
        nodes.push({
          id: `sys_${nodeIndex}`,
          name: category,
          category: 'system',
          level: 2,
          value: totalValue * 0.5, // Further reduction
          color: getSystemColor(category),
          drugEffect: avgDrugEffect * 0.6
        });
        
        // Create links from cellular to system
        relatedCellular.forEach(cellNode => {
          links.push({
            source: cellNode.id,
            target: `sys_${nodeIndex}`,
            value: cellNode.value * 0.4,
            drugEffect: cellNode.drugEffect
          });
        });
        
        nodeIndex++;
      }
    });

    return { nodes, links };
  }, [data, drugData, selectedDrugs]);

  useEffect(() => {
    if (!svgRef.current || sankeyData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Dimensions and margins
    const containerWidth = svgRef.current.clientWidth;
    const containerHeight = svgRef.current.clientHeight;
    const margin = { top: 50, right: 50, bottom: 50, left: 50 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    // Create main group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Create Sankey layout
    const sankeyLayout = d3Sankey.sankey()
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[1, 1], [width - 1, height - 5]]);

    // Create a mapping from node IDs to indices
    const nodeIdToIndex = new Map<string, number>();
    sankeyData.nodes.forEach((node, index) => {
      nodeIdToIndex.set(node.id, index);
    });

    // Convert string IDs to numeric indices for D3 Sankey
    const processedLinks = sankeyData.links.map(link => ({
      ...link,
      source: typeof link.source === 'string' ? nodeIdToIndex.get(link.source) ?? 0 : link.source,
      target: typeof link.target === 'string' ? nodeIdToIndex.get(link.target) ?? 0 : link.target
    }));

    // Process the data through the Sankey layout
    const sankeyGraph = sankeyLayout({
      nodes: sankeyData.nodes.map(d => ({ ...d })),
      links: processedLinks
    });

    // Create links
    const links = g.append('g')
      .attr('class', 'sankey-links')
      .selectAll('path')
      .data(sankeyGraph.links)
      .enter()
      .append('path')
      .attr('d', d3Sankey.sankeyLinkHorizontal())
      .attr('stroke', (d: any) => {
        const linkData = d as SankeyLinkData;
        if (selectedDrugs.size > 0 && linkData.drugEffect && linkData.drugEffect > 0.1) {
          return d3.interpolateRdYlBu(1 - Math.min(linkData.drugEffect * 2, 1));
        }
        return isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)';
      })
      .attr('stroke-width', (d: any) => {
        const linkData = d as SankeyLinkData;
        return Math.max(1, linkData.width || 0);
      })
      .attr('fill', 'none')
      .attr('opacity', 0.7)
      .style('cursor', 'pointer');

    // Create nodes
    const nodes = g.append('g')
      .attr('class', 'sankey-nodes')
      .selectAll('rect')
      .data(sankeyGraph.nodes)
      .enter()
      .append('rect')
      .attr('x', (d: any) => {
        const nodeData = d as SankeyNodeData;
        return nodeData.x0 || 0;
      })
      .attr('y', (d: any) => {
        const nodeData = d as SankeyNodeData;
        return nodeData.y0 || 0;
      })
      .attr('height', (d: any) => {
        const nodeData = d as SankeyNodeData;
        return (nodeData.y1 || 0) - (nodeData.y0 || 0);
      })
      .attr('width', (d: any) => {
        const nodeData = d as SankeyNodeData;
        return (nodeData.x1 || 0) - (nodeData.x0 || 0);
      })
      .attr('fill', (d: any) => {
        const nodeData = d as SankeyNodeData;
        if (selectedDrugs.size > 0 && nodeData.drugEffect && nodeData.drugEffect > 0.05) {
          const intensity = Math.min(nodeData.drugEffect * 3, 1);
          return d3.interpolateReds(0.3 + intensity * 0.7);
        }
        return nodeData.color;
      })
      .attr('stroke', isDarkMode ? '#ffffff' : '#000000')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer');

    // Add node labels
    g.append('g')
      .attr('class', 'sankey-labels')
      .selectAll('text')
      .data(sankeyGraph.nodes)
      .enter()
      .append('text')
      .attr('x', (d: any) => {
        const nodeData = d as SankeyNodeData;
        return ((nodeData.x0 || 0) + (nodeData.x1 || 0)) / 2;
      })
      .attr('y', (d: any) => {
        const nodeData = d as SankeyNodeData;
        return ((nodeData.y0 || 0) + (nodeData.y1 || 0)) / 2;
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', isDarkMode ? '#ffffff' : '#000000')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text((d: any) => {
        const nodeData = d as SankeyNodeData;
        const maxLength = 15;
        return nodeData.name.length > maxLength ? nodeData.name.substring(0, maxLength) + '...' : nodeData.name;
      });

    // Add level labels
    const levelLabels = ['Molecular Level', 'Cellular Level', 'System Level'];
    levelLabels.forEach((label, i) => {
      g.append('text')
        .attr('x', (width / 3) * i + (width / 6))
        .attr('y', -20)
        .attr('text-anchor', 'middle')
        .attr('fill', isDarkMode ? '#ffffff' : '#000000')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .text(label);
    });

    // Add title
    svg.append('text')
      .attr('class', 'sankey-title')
      .attr('x', containerWidth / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .attr('fill', isDarkMode ? '#ffffff' : '#000000')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .text(selectedDrugs.size > 0 ? 'Multi-Scale Drug Effect Flow' : 'Multi-Scale Biological Flow');

    // Add tooltip interactions
    nodes
      .on('mouseover', function(event: any, d: any) {
        const nodeData = d as SankeyNodeData;
        d3.select(this)
          .attr('opacity', 1)
          .attr('stroke-width', 2);

        if (tooltipRef.current) {
          const tooltip = d3.select(tooltipRef.current);
          tooltip.style('opacity', 1)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .html(`
              <strong>${nodeData.name}</strong><br/>
              Category: ${nodeData.category}<br/>
              Value: ${nodeData.value.toFixed(2)}<br/>
              Level: ${nodeData.level}
              ${selectedDrugs.size > 0 && nodeData.drugEffect !== undefined ? 
                `<br/>Drug Effect: ${(nodeData.drugEffect * 100).toFixed(1)}%` : ''}
            `);
        }
      })
      .on('mousemove', function(event: any) {
        if (tooltipRef.current) {
          d3.select(tooltipRef.current)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        }
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('opacity', 1)
          .attr('stroke-width', 1);

        if (tooltipRef.current) {
          d3.select(tooltipRef.current).style('opacity', 0);
        }
      });

    links
      .on('mouseover', function(event: any, d: any) {
        const linkData = d as SankeyLinkData;
        d3.select(this)
          .attr('opacity', 1)
          .attr('stroke-width', (linkData.width || 0) + 2);

        if (tooltipRef.current) {
          const tooltip = d3.select(tooltipRef.current);
          
          // Get source and target node data
          const sourceNode = sankeyGraph.nodes.find((n: any) => (n as SankeyNodeData).id === linkData.source) as SankeyNodeData;
          const targetNode = sankeyGraph.nodes.find((n: any) => (n as SankeyNodeData).id === linkData.target) as SankeyNodeData;
          
          tooltip.style('opacity', 1)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .html(`
              <strong>Flow Connection</strong><br/>
              From: ${sourceNode?.name || 'Unknown'}<br/>
              To: ${targetNode?.name || 'Unknown'}<br/>
              Flow Value: ${linkData.value.toFixed(2)}
              ${selectedDrugs.size > 0 && linkData.drugEffect !== undefined ? 
                `<br/>Drug Effect: ${(linkData.drugEffect * 100).toFixed(1)}%` : ''}
            `);
        }
      })
      .on('mousemove', function(event: any) {
        if (tooltipRef.current) {
          d3.select(tooltipRef.current)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        }
      })
      .on('mouseout', function(event: any, d: any) {
        const linkData = d as SankeyLinkData;
        d3.select(this)
          .attr('opacity', 0.7)
          .attr('stroke-width', Math.max(1, linkData.width || 0));

        if (tooltipRef.current) {
          d3.select(tooltipRef.current).style('opacity', 0);
        }
      });

  }, [sankeyData, isDarkMode, selectedDrugs]);

  return (
    <div className="sankey-flow-container">
      <div className="sankey-controls">
        <div className="control-info">
          <h3>
            {selectedDrugs.size > 0 
              ? `Multi-Scale Drug Effects (${selectedDrugs.size} drugs selected)`
              : 'Multi-Scale Biological Flow'
            }
          </h3>
          <p>
            {selectedDrugs.size > 0 
              ? 'Visualizing how drug effects propagate from molecular to cellular to system levels'
              : 'Flow of biological information from molecular pathways to cellular functions to system-level outcomes'
            }
          </p>
        </div>
      </div>
      
      <div className="sankey-wrapper">
        <svg
          ref={svgRef}
          className="sankey-flow-diagram"
          width="100%"
          height="600"
        />
        
        <div
          ref={tooltipRef}
          className="sankey-tooltip"
          style={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: 'none',
            background: isDarkMode ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            color: isDarkMode ? '#ffffff' : '#000000',
            border: `1px solid ${isDarkMode ? '#ffffff' : '#000000'}`,
            borderRadius: '4px',
            padding: '8px',
            fontSize: '12px',
            zIndex: 1000
          }}
        />
      </div>
    </div>
  );
};

export default SankeyFlowDiagram; 