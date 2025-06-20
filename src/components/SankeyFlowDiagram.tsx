import React, { useEffect, useRef, useMemo, useState } from 'react';
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

// Enhanced interfaces with collapsible functionality
interface SankeyNodeData {
  id: string;
  name: string;
  category: 'molecular' | 'cellular' | 'system';
  level: number;
  value: number;
  color: string;
  drugEffect?: number;
  // Collapsible tree properties
  children?: string[]; // Store IDs of child nodes
  parent?: string;
  isExpanded?: boolean;
  isVisible?: boolean;
  depth?: number;
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
  // Collapsible properties
  isVisible?: boolean;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  // Process data into Sankey format with collapsible structure
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
        drugEffect: calculateDrugEffect(pathway, omicsType as OmicsType),
        isExpanded: true,
        isVisible: true,
        depth: 0
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
        
        const cellularNode: SankeyNodeData = {
          id: `cell_${nodeIndex}`,
          name: category,
          category: 'cellular',
          level: 1,
          value: totalValue * 0.7, // Some loss in transition
          color: getCellularColor(category),
          drugEffect: avgDrugEffect * 0.8,
          children: relatedMolecular.map(n => n.id),
          isExpanded: true,
          isVisible: true,
          depth: 1
        };
        
        nodes.push(cellularNode);
        
        // Create links from molecular to cellular
        relatedMolecular.forEach(molNode => {
          links.push({
            source: molNode.id,
            target: `cell_${nodeIndex}`,
            value: molNode.value * 0.3,
            drugEffect: molNode.drugEffect,
            isVisible: true
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
        
        const systemNode: SankeyNodeData = {
          id: `sys_${nodeIndex}`,
          name: category,
          category: 'system',
          level: 2,
          value: totalValue * 0.5, // Further reduction
          color: getSystemColor(category),
          drugEffect: avgDrugEffect * 0.6,
          children: relatedCellular.map(n => n.id),
          isExpanded: true,
          isVisible: true,
          depth: 2
        };
        
        nodes.push(systemNode);
        
        // Create links from cellular to system
        relatedCellular.forEach(cellNode => {
          links.push({
            source: cellNode.id,
            target: `sys_${nodeIndex}`,
            value: cellNode.value * 0.4,
            drugEffect: cellNode.drugEffect,
            isVisible: true
          });
        });
        
        nodeIndex++;
      }
    });

    return { nodes, links };
  }, [data, drugData, selectedDrugs]);

  // Function to handle node collapse/expand
  const handleNodeClick = (nodeId: string) => {
    const newCollapsedNodes = new Set(collapsedNodes);
    if (newCollapsedNodes.has(nodeId)) {
      newCollapsedNodes.delete(nodeId);
    } else {
      newCollapsedNodes.add(nodeId);
    }
    setCollapsedNodes(newCollapsedNodes);
  };

  // Filter visible nodes and links based on collapsed state
  const visibleData = useMemo(() => {
    const visibleNodes = sankeyData.nodes.filter(node => {
      if (node.level === 0) return true; // Always show molecular nodes
      
      // Check if parent is collapsed
      const parentNode = sankeyData.nodes.find(n => n.children?.includes(node.id));
      if (parentNode && collapsedNodes.has(parentNode.id)) {
        return false;
      }
      
      return true;
    });

    const visibleLinks = sankeyData.links.filter(link => {
      const sourceNode = visibleNodes.find(n => n.id === link.source);
      const targetNode = visibleNodes.find(n => n.id === link.target);
      return sourceNode && targetNode;
    });

    return { nodes: visibleNodes, links: visibleLinks };
  }, [sankeyData, collapsedNodes]);

  useEffect(() => {
    if (!svgRef.current || visibleData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Much larger dimensions for better readability
    const containerWidth = 1800; // Increased width further
    const containerHeight = 1400; // Keep height
    const margin = { 
      top: 120,
      right: 120,
      bottom: 120,
      left: 250 // Much larger left margin for labels and brackets
    };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    // Set SVG dimensions
    svg.attr('width', containerWidth).attr('height', containerHeight);

    // Create main group (no zoom behavior - just static positioning)
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Create Sankey layout with larger node spacing
    const sankeyLayout = d3Sankey.sankey()
      .nodeWidth(25) // Wider nodes
      .nodePadding(25) // More padding between nodes
      .extent([[1, 1], [width - 1, height - 5]]);

    // Create a mapping from node IDs to indices
    const nodeIdToIndex = new Map<string, number>();
    visibleData.nodes.forEach((node, index) => {
      nodeIdToIndex.set(node.id, index);
    });

    // Convert string IDs to numeric indices for D3 Sankey
    const processedLinks = visibleData.links.map(link => ({
      ...link,
      source: typeof link.source === 'string' ? nodeIdToIndex.get(link.source) ?? 0 : link.source,
      target: typeof link.target === 'string' ? nodeIdToIndex.get(link.target) ?? 0 : link.target
    }));

    // Process the data through the Sankey layout
    const sankeyGraph = sankeyLayout({
      nodes: visibleData.nodes.map(d => ({ ...d })),
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
        return Math.max(2, linkData.width || 0); // Thicker lines
      })
      .attr('fill', 'none')
      .attr('opacity', 0.7)
      .style('cursor', 'pointer');

    // Create nodes with collapsible functionality
    const nodes = g.append('g')
      .attr('class', 'sankey-nodes')
      .selectAll('g')
      .data(sankeyGraph.nodes)
      .enter()
      .append('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer')
      .on('click', function(event: any, d: any) {
        const nodeData = d as SankeyNodeData;
        if (nodeData.children && nodeData.children.length > 0) {
          handleNodeClick(nodeData.id);
        }
      });

    // Add node rectangles
    nodes.append('rect')
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
      .attr('stroke-width', 2) // Thicker borders
      .attr('class', 'node-rect');

    // Add collapse/expand indicators for nodes with children
    nodes.filter((d: any) => {
      const nodeData = d as SankeyNodeData;
      return !!(nodeData.children && nodeData.children.length > 0);
    })
    .append('circle')
      .attr('cx', (d: any) => {
        const nodeData = d as SankeyNodeData;
        return (nodeData.x1 || 0) + 20; // Further out
      })
      .attr('cy', (d: any) => {
        const nodeData = d as SankeyNodeData;
        return ((nodeData.y0 || 0) + (nodeData.y1 || 0)) / 2;
      })
      .attr('r', 12) // Larger circles
      .attr('fill', isDarkMode ? '#ffffff' : '#000000')
      .attr('stroke', isDarkMode ? '#ffffff' : '#000000')
      .attr('stroke-width', 2)
      .attr('class', 'collapse-indicator')
      .on('click', function(event: any, d: any) {
        event.stopPropagation();
        const nodeData = d as SankeyNodeData;
        handleNodeClick(nodeData.id);
      });

    // Add +/- symbols to collapse indicators
    nodes.filter((d: any) => {
      const nodeData = d as SankeyNodeData;
      return !!(nodeData.children && nodeData.children.length > 0);
    })
    .append('text')
      .attr('x', (d: any) => {
        const nodeData = d as SankeyNodeData;
        return (nodeData.x1 || 0) + 20;
      })
      .attr('y', (d: any) => {
        const nodeData = d as SankeyNodeData;
        return ((nodeData.y0 || 0) + (nodeData.y1 || 0)) / 2;
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', isDarkMode ? '#000000' : '#ffffff')
      .attr('font-size', '16px') // Larger font
      .attr('font-weight', 'bold')
      .attr('class', 'collapse-symbol')
      .text((d: any) => {
        const nodeData = d as SankeyNodeData;
        return collapsedNodes.has(nodeData.id) ? '+' : '-';
      })
      .on('click', function(event: any, d: any) {
        event.stopPropagation();
        const nodeData = d as SankeyNodeData;
        handleNodeClick(nodeData.id);
      });

    // Add molecular category labels (sideways, facing toward plot)
    const molecularCategories = [
      { name: 'Transcript', color: '#9FE2BF', filter: (n: SankeyNodeData) => n.name.toLowerCase().includes('mrna') || n.name.toLowerCase().includes('transcript') },
      { name: 'Protein', color: '#CCCCFF', filter: (n: SankeyNodeData) => n.name.toLowerCase().includes('protein') },
      { name: 'Lipid', color: '#DFFF00', filter: (n: SankeyNodeData) => n.name.toLowerCase().includes('lipid') },
      { name: 'Metabolite', color: '#FF7F50', filter: (n: SankeyNodeData) => n.name.toLowerCase().includes('metabolite') }
    ];

    // Group molecular nodes by type and add category labels
    const molecularNodes = sankeyGraph.nodes.filter((n: any) => (n as SankeyNodeData).level === 0);
    const molecularGroups = molecularCategories.map(category => {
      const nodesInCategory = molecularNodes.filter((n: any) => category.filter(n as SankeyNodeData));
      
      if (nodesInCategory.length > 0) {
        const minY = d3.min(nodesInCategory, (n: any) => n.y0) || 0;
        const maxY = d3.max(nodesInCategory, (n: any) => n.y1) || 0;
        const avgY = (minY + maxY) / 2;
        return { ...category, avgY, minY, maxY, nodes: nodesInCategory };
      }
      return null;
    }).filter(Boolean);

    // Add sideways category labels with brackets
    molecularGroups.forEach((category) => {
      if (category && category.nodes.length > 0) {
        // --- BRACKET ---
        const bracketX = -80; // X position for the bracket, further left
        const bracketExtension = 15; // How far the bracket extends horizontally
        const bracketPath = `
          M ${bracketX + bracketExtension},${category.minY} 
          L ${bracketX},${category.minY} 
          L ${bracketX},${category.maxY} 
          L ${bracketX + bracketExtension},${category.maxY}
        `;

        g.append('path')
          .attr('d', bracketPath)
          .attr('stroke', isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)')
          .attr('stroke-width', 2)
          .attr('fill', 'none');

        // --- LABEL ---
        const labelX = -120; // X position for the label, further left from bracket
        g.append('text')
          .attr('transform', `translate(${labelX}, ${category.avgY}) rotate(-90)`)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('fill', category.color)
          .attr('font-size', '18px') // Larger font
          .attr('font-weight', 'bold')
          .attr('font-family', 'Arial, sans-serif')
          .style('text-shadow', '1px 1px 2px rgba(0, 0, 0, 0.5)')
          .style('pointer-events', 'none')
          .text(category.name);
      }
    });

    // Update node labels to remove category info from molecular level
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
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'Arial, sans-serif')
      .style('pointer-events', 'none')
      .style('text-shadow', '1px 1px 2px rgba(0, 0, 0, 0.5)')
      .text((d: any) => {
        const nodeData = d as SankeyNodeData;
        if (nodeData.level === 0) {
          // For molecular level, extract just the pathway name without the type
          const match = nodeData.name.match(/^(.*?)\s*\([^)]+\)/);
          return match ? match[1] : nodeData.name;
        }
        return nodeData.name;
      });

    // Add level labels with larger text
    const levelLabels = ['Molecular Level', 'Cellular Level', 'System Level'];
    levelLabels.forEach((label, i) => {
      g.append('text')
        .attr('x', (width / 3) * i + (width / 6))
        .attr('y', -40) // Further up
        .attr('text-anchor', 'middle')
        .attr('fill', isDarkMode ? '#ffffff' : '#000000')
        .attr('font-size', '20px') // Larger font
        .attr('font-weight', 'bold')
        .attr('font-family', 'Arial, sans-serif')
        .style('text-shadow', '1px 1px 2px rgba(0, 0, 0, 0.5)')
        .text(label);
    });

    // Add title with larger text
    svg.append('text')
      .attr('class', 'sankey-title')
      .attr('x', containerWidth / 2)
      .attr('y', 40)
      .attr('text-anchor', 'middle')
      .attr('fill', isDarkMode ? '#ffffff' : '#000000')
      .style('font-size', '24px') // Larger title
      .style('font-weight', 'bold')
      .style('font-family', 'Arial, sans-serif')
      .style('text-shadow', '1px 1px 2px rgba(0, 0, 0, 0.5)')
      .text(selectedDrugs.size > 0 ? 'Interactive Multi-Scale Drug Effect Flow' : 'Interactive Multi-Scale Biological Flow');

    // Add instructions with larger text
    svg.append('text')
      .attr('x', containerWidth / 2)
      .attr('y', containerHeight - 30)
      .attr('text-anchor', 'middle')
      .attr('fill', isDarkMode ? '#ffffff' : '#000000')
      .style('font-size', '14px') // Larger instructions
      .style('opacity', 0.8)
      .style('font-family', 'Arial, sans-serif')
      .text('Click nodes with children to expand/collapse • Use scroll to navigate');

    // Add tooltip interactions
    nodes
      .on('mouseover', function(event: any, d: any) {
        const nodeData = d as SankeyNodeData;
        d3.select(this).select('.node-rect')
          .attr('opacity', 1)
          .attr('stroke-width', 3);

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
              ${nodeData.children && nodeData.children.length > 0 ? 
                `<br/>Children: ${nodeData.children.length} • Click to ${collapsedNodes.has(nodeData.id) ? 'expand' : 'collapse'}` : ''}
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
        d3.select(this).select('.node-rect')
          .attr('opacity', 1)
          .attr('stroke-width', 2);

        if (tooltipRef.current) {
          d3.select(tooltipRef.current).style('opacity', 0);
        }
      });

    links
      .on('mouseover', function(event: any, d: any) {
        const linkData = d as SankeyLinkData;
        d3.select(this)
          .attr('opacity', 1)
          .attr('stroke-width', (linkData.width || 0) + 3);

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
          .attr('stroke-width', Math.max(2, linkData.width || 0));

        if (tooltipRef.current) {
          d3.select(tooltipRef.current).style('opacity', 0);
        }
      });

  }, [visibleData, isDarkMode, selectedDrugs, collapsedNodes]);

  return (
    <div className="sankey-flow-container">
      <div className="sankey-controls">
        <div className="control-info">
          <h3>
            {selectedDrugs.size > 0 
              ? `Interactive Multi-Scale Drug Effects (${selectedDrugs.size} drugs selected)`
              : 'Interactive Multi-Scale Biological Flow'
            }
          </h3>
          <p>
            {selectedDrugs.size > 0 
              ? 'Click nodes with children to expand/collapse sections. Visualizing how drug effects propagate from molecular to cellular to system levels.'
              : 'Click nodes with children to expand/collapse sections. Flow of biological information from molecular pathways to cellular functions to system-level outcomes.'
            }
          </p>
        </div>
      </div>
      
      <div className="sankey-wrapper" ref={containerRef}>
        <svg
          ref={svgRef}
          className="sankey-flow-diagram"
          width="1800"
          height="1400"
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