import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { BiologicalNode, BiologicalLink, OmicsType, PathwayData, DrugTreatment, VisualizationMode } from '../types';
import { DRUG_TREATMENTS } from '../data/mockData';
import './PathwayVisualization.css';

interface PathwayVisualizationProps {
  baselineData: PathwayData;
  individualDrugData?: { [drugId: string]: PathwayData } | null;
  width: number;
  height: number;
  selectedPathway?: string;
  selectedOmicsType?: OmicsType;
  selectedDrug?: DrugTreatment;
  visualizationMode: VisualizationMode;
  visibleNodeTypes?: Set<OmicsType>;
  selectedDrugs?: Set<string>;
  isDarkMode?: boolean;
}

const PathwayVisualization: React.FC<PathwayVisualizationProps> = ({
  baselineData,
  individualDrugData,
  width,
  height,
  selectedPathway,
  selectedOmicsType,
  selectedDrug,
  visualizationMode,
  visibleNodeTypes,
  selectedDrugs,
  isDarkMode = true
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);

  // New color palette
  const colorPalette = useMemo(() => [
    '#78A8D4', // Light blue
    '#364FA1', // Dark blue
    '#B8A6DE', // Light purple
    '#FFC9CC', // Light pink
    '#E86659', // Coral red
    '#788F4F', // Olive green
    '#004F36', // Dark green
    '#002B32', // Dark teal
    '#EDEFA0'  // Light yellow
  ], []);

  // Broad category colors for highlighting - using new palette
  const categoryColors = useMemo(() => ({
    'Energy Metabolism': colorPalette[0], // Light blue
    'Immune Response': colorPalette[4],   // Coral red
    'Oxidative Stress': colorPalette[2],  // Light purple
    'Circadian Rhythm': colorPalette[7],  // Dark teal
    'Blood Pressure': colorPalette[5],    // Olive green
    'Heart Rate': colorPalette[3],        // Light pink
    'Temperature Regulation': colorPalette[8] // Light yellow
  }), [colorPalette]);

  // Drug-specific colors using user's specified colors
  const drugColors = useMemo(() => ({
    'ketamine': '#FFBF00',    // User specified
    'etomidate': '#40E0D0',   // User specified
    'propofol': '#DE3163',    // User specified
    'novel1': '#6495ED',      // User specified
    'novel2': '#77B254'       // User specified - updated color
  }), []);

  // Always use baseline data as the foundation - drug effects are overlays only
  const getCurrentData = useCallback(() => {
    // Always return baseline data - drug effects are added as visual overlays
    return baselineData;
  }, [baselineData]);

  const getNodeRadius = useCallback((node: BiologicalNode) => {
    const baseRadius = 3; // Slightly larger base radius for better visibility
    
    // Primary size factor: confidence (0.1 to 0.95 range)
    const confidence = node.confidence || 0.5;
    const confidenceMultiplier = 0.6 + (confidence * 2.0);
    
    // Secondary factor: significance (smaller p-value = larger node)
    const significance = node.significance || 0.05;
    const significanceMultiplier = significance < 0.01 ? 1.3 : significance < 0.05 ? 1.1 : 1.0;
    
    // Keep node sizes consistent - drug effects are shown as overlays (rings, symbols)
    const finalRadius = baseRadius * confidenceMultiplier * significanceMultiplier;
    return Math.max(3, Math.min(12, finalRadius)); // Consistent size range
  }, []);

  // Get node color based on omics type - using user's specified colors
  const getNodeColor = useCallback((node: BiologicalNode) => {
    // Map omics types to user's specified colors
    const omicsColors = {
      'proteins': '#CCCCFF',        // User specified
      'metabolites': '#FF7F50',     // User specified
      'mRNA transcripts': '#9FE2BF', // User specified
      'lipids': '#DFFF00'           // User specified
    };
    
    return omicsColors[node.type as keyof typeof omicsColors] || colorPalette[0];
  }, [colorPalette]);

  // Get node opacity - always standard opacity for clean look
  const getNodeOpacity = useCallback((node: BiologicalNode) => {
    return 0.8; // Standard opacity for all nodes
  }, []);

  // Get node stroke properties - consistent for baseline network
  const getNodeStroke = useCallback((node: BiologicalNode) => {
    // Always use theme-aware default stroke - drug effects shown as overlay rings
    return { color: 'var(--edge-color)', width: 1 };
  }, []);

  // Simplified visual effects - consistent for baseline network
  const getNodeVisualEffects = useCallback((node: BiologicalNode) => {
    // Consistent visual effects for baseline network - drug effects shown as overlays
    return {
      filter: 'drop-shadow(0 0 3px rgba(255, 255, 255, 0.3))',
      animation: 'none'
    };
  }, []);

  // Drug effect indicators are now handled by the getNodeDrugEffects system
  const getDrugEffectIndicator = useCallback((node: BiologicalNode) => {
    // This function is no longer used - drug effects handled by overlay system
    return null;
  }, []);

  // Get drug effects for a specific node from all selected drugs
  const getNodeDrugEffects = useCallback((node: BiologicalNode) => {
    console.log(`=== getNodeDrugEffects DEBUG for ${node.name} ===`);
    console.log('individualDrugData exists:', !!individualDrugData);
    console.log('selectedDrugs exists:', !!selectedDrugs);
    console.log('selectedDrugs size:', selectedDrugs?.size || 0);
    console.log('selectedDrugs contents:', selectedDrugs ? Array.from(selectedDrugs) : []);
    
    if (!individualDrugData || !selectedDrugs || selectedDrugs.size === 0) {
      console.log('Returning empty array - missing data or no selected drugs');
      return [];
    }

    console.log('individualDrugData keys:', Object.keys(individualDrugData));

    const effects: Array<{
      drugId: string;
      drugName: string;
      color: string;
      foldChange: number;
      isTarget: boolean;
    }> = [];

    selectedDrugs.forEach(drugId => {
      console.log(`Processing drug ${drugId}...`);
      const drugData = individualDrugData[drugId];
      console.log(`Drug data exists for ${drugId}:`, !!drugData);
      
      if (drugData) {
        console.log(`Drug ${drugId} has ${drugData.nodes.length} nodes`);
        const drugNode = drugData.nodes.find(n => n.id === node.id);
        console.log(`Found matching node for ${node.name} in ${drugId}:`, !!drugNode);
        
        if (drugNode) {
          console.log(`Drug node details:`, {
            id: drugNode.id,
            name: drugNode.name,
            isPerturbationTarget: drugNode.isPerturbationTarget,
            foldChange: drugNode.foldChange,
            expression: drugNode.expression,
            baselineExpression: drugNode.baselineExpression
          });
        }
        
        if (drugNode && drugNode.foldChange && drugNode.foldChange !== 1.0) {
          const drugInfo = DRUG_TREATMENTS.find(d => d.id === drugId);
          const effect = {
            drugId,
            drugName: drugInfo?.name || drugId,
            color: drugColors[drugId as keyof typeof drugColors] || '#FFFFFF',
            foldChange: drugNode.foldChange || 1,
            isTarget: drugNode.isPerturbationTarget || false
          };
          effects.push(effect);
          console.log(`Added effect for ${node.name}:`, effect);
        }
      }
    });

    console.log(`Final effects for ${node.name}: ${effects.length} effects`);
    console.log('=== END getNodeDrugEffects DEBUG ===');
    return effects;
  }, [individualDrugData, selectedDrugs, drugColors]);

  // Get link drug effects from all selected drugs
  const getLinkDrugEffects = useCallback((link: BiologicalLink) => {
    if (!individualDrugData || !selectedDrugs || selectedDrugs.size === 0) {
      return [];
    }

    const effects: Array<{
      drugId: string;
      color: string;
      strengthChange: number;
    }> = [];

    selectedDrugs.forEach(drugId => {
      const drugData = individualDrugData[drugId];
      if (drugData) {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        
        const drugLink = drugData.links.find(l => {
          const drugSourceId = typeof l.source === 'string' ? l.source : l.source.id;
          const drugTargetId = typeof l.target === 'string' ? l.target : l.target.id;
          return (drugSourceId === sourceId && drugTargetId === targetId) ||
                 (drugSourceId === targetId && drugTargetId === sourceId);
        });

        if (drugLink && drugLink.strengthChange && Math.abs(drugLink.strengthChange - 1) > 0.2) {
          effects.push({
            drugId,
            color: drugColors[drugId as keyof typeof drugColors] || '#FFFFFF',
            strengthChange: drugLink.strengthChange
          });
        }
      }
    });

    return effects;
  }, [individualDrugData, selectedDrugs, drugColors]);

  const filterData = useCallback(() => {
    const data = getCurrentData();
    let filteredNodes = data.nodes;
    let filteredLinks = data.links;

    if (selectedPathway) {
      filteredNodes = filteredNodes.filter(node => node.pathway === selectedPathway);
      filteredLinks = filteredLinks.filter(link => {
        const sourceNode = data.nodes.find(n => n.id === (typeof link.source === 'string' ? link.source : link.source.id));
        const targetNode = data.nodes.find(n => n.id === (typeof link.target === 'string' ? link.target : link.target.id));
        return sourceNode?.pathway === selectedPathway && targetNode?.pathway === selectedPathway;
      });
    }

    if (selectedOmicsType) {
      filteredNodes = filteredNodes.filter(node => node.type === selectedOmicsType);
      filteredLinks = filteredLinks.filter(link => {
        const sourceNode = filteredNodes.find(n => n.id === (typeof link.source === 'string' ? link.source : link.source.id));
        const targetNode = filteredNodes.find(n => n.id === (typeof link.target === 'string' ? link.target : link.target.id));
        return sourceNode && targetNode;
      });
    }

    // Filter by visible node types
    if (visibleNodeTypes && visibleNodeTypes.size > 0) {
      filteredNodes = filteredNodes.filter(node => visibleNodeTypes.has(node.type));
      filteredLinks = filteredLinks.filter(link => {
        const sourceNode = filteredNodes.find(n => n.id === (typeof link.source === 'string' ? link.source : link.source.id));
        const targetNode = filteredNodes.find(n => n.id === (typeof link.target === 'string' ? link.target : link.target.id));
        return sourceNode && targetNode;
      });
    }

    return { nodes: filteredNodes, links: filteredLinks };
  }, [getCurrentData, selectedPathway, selectedOmicsType, visibleNodeTypes]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { nodes, links } = filterData();
    
    if (nodes.length === 0) return;

    // Create copies of nodes and links for the simulation
    const simulationLinks = links.map(d => ({...d}));
    const simulationNodes = nodes.map(d => ({...d}));

    // Time series positions (vertical hierarchy) - spread across full height
    const timeSeriesPositions: { [key: string]: {x: number, y: number} } = {
      '10 min': { x: 0.08, y: 0.2 },     // Top section
      '30 min': { x: 0.08, y: 0.4 },     // Upper middle
      '90 min': { x: 0.08, y: 0.6 },     // Lower middle  
      '48 hours': { x: 0.08, y: 0.8 }    // Bottom section
    };

    // Broad category positions (horizontal spread) - more compact horizontal spacing
    const categoryPositions: { [key: string]: {x: number, y: number} } = {
      'Energy Metabolism': { x: 0.18, y: 0.05 },       // Start a bit more inward
      'Immune Response': { x: 0.3, y: 0.05 },          // Closer spacing
      'Oxidative Stress': { x: 0.42, y: 0.05 },        // Closer spacing
      'Circadian Rhythm': { x: 0.54, y: 0.05 },        // Closer spacing
      'Blood Pressure': { x: 0.66, y: 0.05 },          // Closer spacing
      'Heart Rate': { x: 0.78, y: 0.05 },              // Closer spacing
      'Temperature Regulation': { x: 0.9, y: 0.05 }    // End a bit more inward
    };

    // Pre-position nodes with much more organic, natural distribution
    simulationNodes.forEach(node => {
      const timepoint = (node as any).timepoint || '10 min';
      // Use first category for positioning if multiple categories exist
      const category = Array.isArray(node.broadCategory) ? node.broadCategory[0] : (node.broadCategory || 'Energy Metabolism');
      
      // Base positions from time and category
      const baseY = timeSeriesPositions[timepoint]?.y * height || height * 0.5;
      const baseX = categoryPositions[category]?.x * width || width * 0.5;
      
      // Organic spread within the larger scrollable canvas - reduced horizontal spread
      const organicXSpread = (Math.random() - 0.5) * 0.32 * width; // ±16% width spread (reduced from 20%)
      const organicYSpread = (Math.random() - 0.5) * 0.25 * height; // ±12.5% height spread
      
      // Add some curved flow patterns for more organic feel
      const flowAngle = Math.random() * Math.PI * 2; // Random angle for organic flow
      const flowDistance = Math.random() * 0.08 * Math.min(width, height); // Random flow distance
      const flowX = Math.cos(flowAngle) * flowDistance;
      const flowY = Math.sin(flowAngle) * flowDistance;
      
      // Combine base position + organic spread + flow pattern
      node.x = baseX + organicXSpread + flowX;
      node.y = baseY + organicYSpread + flowY;
      
      // Ensure nodes stay within bounds with proper margins for scrollable layout
      node.x = Math.max(120, Math.min(width - 120, node.x));  // Larger margins for scrollable
      node.y = Math.max(80, Math.min(height - 80, node.y));   // Larger margins for scrollable
      
      // Set as fixed positions (no movement)
      node.fx = node.x;
      node.fy = node.y;
    });

    // No force simulation - nodes are static at their assigned positions
    console.log(`Positioned ${simulationNodes.length} nodes in static organic layout`);

    // Add click handler to SVG background to deselect nodes
    svg.on('click', () => {
      setSelectedNode(null);
      setHighlightedCategory(null);
    });

    // Create container for all elements
    const container = svg.append('g');

    // Theme-aware text color - properly resolved for D3
    const textColor = isDarkMode ? '#ffffff' : '#002B32';
    
    // Add time series labels on the left - positioned for scrollable layout
    const timeSeriesLabels = ['10 min', '30 min', '90 min', '48 hours'];
    const timeLabelsSelection = container.selectAll('.time-label')
      .data(timeSeriesLabels)
      .enter().append('text')
      .attr('class', 'pathway-label time-label')
      .attr('x', 30) // Further from edge for scrollable layout
      .attr('y', (d, i) => height * (0.2 + i * 0.2)) // Match the updated timepoint positions
      .attr('text-anchor', 'start')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .style('fill', textColor)
      .text(d => d);

    // Add category labels at the top - positioned much closer to the left edge for better alignment
    const categoryLabels = Object.keys(categoryPositions);
    const categoryLabelsSelection = container.selectAll('.category-label')
      .data(categoryLabels)
      .enter().append('text')
      .attr('class', 'pathway-label category-label')
      .attr('x', d => (categoryPositions[d].x * width) - 140) // Move 140px to the left (increased from 80px)
      .attr('y', 30) // Higher up for scrollable layout
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .style('fill', textColor)
      .text(d => d);

    // Theme-aware link color using CSS variable
    const baseLinkColor = 'var(--edge-color)';
    
    // Create base links (theme-aware color for control network)
    const linkSelection = container.append('g')
      .selectAll('path')
      .data(simulationLinks)
      .enter().append('path')
      .attr('class', 'pathway-link')
      .attr('stroke', baseLinkColor) // Theme-aware base color
      .attr('stroke-width', (d: BiologicalLink) => Math.max(1, d.strength * 2))
      .attr('fill', 'none')
      .attr('opacity', 0.6)
      .attr('d', function(d: any) {
        // Static curved paths since nodes don't move
        const sourceNode = simulationNodes.find(n => n.id === (typeof d.source === 'string' ? d.source : d.source.id));
        const targetNode = simulationNodes.find(n => n.id === (typeof d.target === 'string' ? d.target : d.target.id));
        
        if (!sourceNode || !targetNode) return '';
        
        const sx = sourceNode.x || 0;
        const sy = sourceNode.y || 0;
        const tx = targetNode.x || 0;
        const ty = targetNode.y || 0;
        
        // Create gentle curved paths
        const dx = tx - sx;
        const dy = ty - sy;
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.5; // Curve factor
        
        return `M${sx},${sy}A${dr},${dr} 0 0,1 ${tx},${ty}`;
      });

    // Create drug effect overlays for links (multiple colored overlays)
    console.log('=== DRUG EFFECT LINKS CREATION ===');
    if (visualizationMode === VisualizationMode.PERTURBED && selectedDrugs && selectedDrugs.size > 0) {
      console.log('Creating drug effect links...');
      let totalLinksCreated = 0;
      
      simulationLinks.forEach((link: BiologicalLink) => {
        const drugEffects = getLinkDrugEffects(link);
        console.log(`Link has ${drugEffects.length} drug effects`);
        
        drugEffects.forEach((effect, index) => {
          const sourceNode = simulationNodes.find(n => n.id === (typeof link.source === 'string' ? link.source : link.source.id));
          const targetNode = simulationNodes.find(n => n.id === (typeof link.target === 'string' ? link.target : link.target.id));
          
          if (!sourceNode || !targetNode) return;
          
          const sx = sourceNode.x || 0;
          const sy = sourceNode.y || 0;
          const tx = targetNode.x || 0;
          const ty = targetNode.y || 0;
          
          const dx = tx - sx;
          const dy = ty - sy;
          const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
          
          // Offset each drug effect slightly for visibility - smaller offsets
          const offset = (index - drugEffects.length / 2) * 1.5;
          const drOffset = dr + offset;
          
          console.log(`Creating drug link - color: ${effect.color}, strengthChange: ${effect.strengthChange}`);
          
          container.append('path')
            .attr('class', `drug-link-effect drug-${effect.drugId}`)
            .attr('stroke', effect.color)
            .attr('stroke-width', effect.strengthChange > 1.2 ? 2.5 : effect.strengthChange < 0.8 ? 2 : 1.5) // Thinner lines
            .attr('fill', 'none')
            .attr('opacity', 0.7) // More transparent to show overlaps
            .attr('d', `M${sx},${sy}A${drOffset},${drOffset} 0 0,1 ${tx},${ty}`)
            .style('filter', `drop-shadow(0 0 3px ${effect.color})`); // Softer glow
          
          totalLinksCreated++;
        });
      });
      
      console.log(`Total drug effect links created: ${totalLinksCreated}`);
    } else {
      console.log('Not creating drug links - conditions not met');
    }
    console.log('=== END DRUG EFFECT LINKS CREATION ===');

    // Create base nodes (always same colors for control network)
    const nodeSelection = container.append('g')
      .selectAll('circle')
      .data(simulationNodes)
      .enter().append('circle')
      .attr('class', 'pathway-node')
      .attr('r', (d: BiologicalNode) => getNodeRadius(d))
      .attr('cx', (d: any) => d.x || 0)
      .attr('cy', (d: any) => d.y || 0)
      .style('fill', (d: BiologicalNode) => getNodeColor(d))
      .style('stroke', 'var(--edge-color)')
      .style('stroke-width', 1)
      .style('opacity', 0.8)
      .style('cursor', 'pointer')
      .on('click', (event: any, d: BiologicalNode) => {
        event.stopPropagation();
        console.log('=== NODE CLICK DEBUG ===');
        console.log('Node clicked:', d.name, 'ID:', d.id, 'Pathway:', d.pathway);
        console.log('Current selectedNode state:', selectedNode);
        console.log('Node data:', d);
        
        if (selectedNode === d.id) {
          console.log('Deselecting node - same node clicked');
          setSelectedNode(null);
          setHighlightedCategory(null);
        } else {
          console.log('Selecting new node:', d.id);
          setSelectedNode(d.id);
          setHighlightedCategory(null);
        }
        console.log('Updated selectedNode state to:', selectedNode === d.id ? null : d.id);
        console.log('=== END NODE CLICK DEBUG ===');
      });

    // Create drug effect rings around nodes (multiple colored rings for multiple drugs)
    console.log('=== DRUG EFFECT RINGS CREATION ===');
    console.log('visualizationMode:', visualizationMode);
    console.log('VisualizationMode.PERTURBED:', VisualizationMode.PERTURBED);
    console.log('selectedDrugs size:', selectedDrugs?.size || 0);
    
    if (visualizationMode === VisualizationMode.PERTURBED && selectedDrugs && selectedDrugs.size > 0) {
      console.log('Creating drug effect rings for nodes...');
      let totalRingsCreated = 0;
      
      // Create drug effect rings for affected nodes
      simulationNodes.forEach((node: BiologicalNode, nodeIndex) => {
        // Drug effects logic
        const drugEffects = getNodeDrugEffects(node);
        console.log(`Node ${node.name}: ${drugEffects.length} drug effects`);
        
        drugEffects.forEach((effect, index) => {
          const baseRadius = getNodeRadius(node);
          const ringRadius = baseRadius + 3 + (index * 2); // Smaller, more compact rings
          
          console.log(`Creating ring for ${node.name} - drug: ${effect.drugId}, color: ${effect.color}, radius: ${ringRadius}`);
          
          // Create colored ring for this drug effect - smaller but still visible
          container.append('circle')
            .attr('class', `drug-node-effect drug-${effect.drugId}`)
            .attr('cx', node.x || 0)
            .attr('cy', node.y || 0)
            .attr('r', ringRadius)
            .style('fill', 'none')
            .style('stroke', effect.color)
            .style('stroke-width', 3) // Thinner to accommodate multiple rings
            .style('opacity', 0.9) // Slightly transparent to show overlaps
            .style('filter', `drop-shadow(0 0 6px ${effect.color})`) // Moderate glow
            .style('pointer-events', 'none');
          
          // Add drug effect symbol - smaller and positioned around the node
          const symbol = effect.foldChange > 1.5 ? '▲' : effect.foldChange < 0.5 ? '▼' : '●';
          const symbolOffset = ringRadius + 8; // Closer to the node
          const angle = (index * 72) * Math.PI / 180; // Spread symbols in 72-degree increments (5 positions)
          
          console.log(`Creating symbol for ${node.name} - symbol: ${symbol}, color: ${effect.color}`);
          
          container.append('text')
            .attr('class', `drug-symbol drug-${effect.drugId}`)
            .attr('x', (node.x || 0) + symbolOffset * Math.cos(angle))
            .attr('y', (node.y || 0) + symbolOffset * Math.sin(angle))
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .style('fill', effect.color)
            .style('font-size', '12px') // Smaller font to fit multiple symbols
            .style('font-weight', 'bold')
            .style('text-shadow', '1px 1px 3px rgba(0,0,0,1)') // Moderate shadow
            .style('pointer-events', 'none')
            .text(symbol);
          
          totalRingsCreated++;
        });
      });
      
      console.log(`Total drug effect rings created: ${totalRingsCreated}`);
    } else {
      console.log('Not creating drug rings - conditions not met');
    }
    console.log('=== END DRUG EFFECT RINGS CREATION ===');

    // No old drug indicators needed - using new ring system

    console.log('Static network layout complete - nodes are fixed in position');

    // No simulation cleanup needed since we're not using force simulation
    return () => {
      console.log('Static layout cleanup');
    };
  }, [baselineData, individualDrugData, selectedPathway, selectedOmicsType, selectedDrug, visualizationMode, width, height, filterData, getNodeRadius, getNodeColor, getNodeOpacity, getNodeStroke, getNodeVisualEffects, getDrugEffectIndicator]);

  // Separate useEffect to handle color updates when selectedNode changes
  useEffect(() => {
    console.log('=== COLOR UPDATE EFFECT TRIGGERED ===');
    console.log('selectedNode changed to:', selectedNode);
    console.log('svgRef.current exists:', !!svgRef.current);
    
    if (!svgRef.current) {
      console.log('No SVG ref, exiting color update');
      return;
    }
    
    const svg = d3.select(svgRef.current);
    const nodeSelection = svg.selectAll('.pathway-node');
    const linkSelection = svg.selectAll('.pathway-link');
    
    console.log('Node selection size:', nodeSelection.size());
    console.log('Link selection size:', linkSelection.size());
    
    if (nodeSelection.empty() || linkSelection.empty()) {
      console.log('Node or link selection is empty, exiting color update');
      return;
    }
    
    console.log('Updating colors for selectedNode:', selectedNode);
    
    if (selectedNode) {
      // Get the filtered data (what's currently displayed) to find causal chain nodes
      const { nodes: filteredNodes, links: filteredLinks } = filterData();
      console.log('Filtered data nodes count:', filteredNodes.length);
      const clickedNode = filteredNodes.find(n => n.id === selectedNode);
      console.log('Found clicked node in filtered data:', clickedNode);
      if (!clickedNode) {
        console.log('Clicked node not found in filtered data, exiting');
        return;
      }
      
      // Find all nodes that share the same specific pathway as the clicked node
      const samePathwayNodes = filteredNodes.filter(node => 
        node.pathway === clickedNode.pathway
      );
      const causalChainNodes = new Set(samePathwayNodes.map(n => n.id));
      
      console.log('Same pathway nodes count:', samePathwayNodes.length);
      console.log('Causal chain nodes:', Array.from(causalChainNodes));
      
      // Update node colors and opacity
      nodeSelection.style('fill', (d: any) => {
        if (selectedNode === d.id) {
          console.log('Coloring selected node bright white:', d.name);
          return '#FFFBE6'; // Selected node gets bright white glow
        } else if (causalChainNodes.has(d.id)) {
          console.log('Coloring pathway node by omics type:', d.name, d.type);
          // Connected nodes get colors based on drug effects or omics type
          return getNodeColor(d);
        } else {
          return '#FFFBE6'; // Unrelated nodes stay white but dimmed
        }
      })
      .style('opacity', (d: any) => {
        if (selectedNode === d.id) {
          return 1; // Selected node fully opaque
        } else if (causalChainNodes.has(d.id)) {
          return getNodeOpacity(d); // Pathway nodes use drug-aware opacity
        } else {
          return 0.2; // Other nodes heavily dimmed
        }
      });
      
      // Update link colors and visibility for curved paths
      linkSelection.attr('stroke', function(d: any) {
        const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
        const targetId = typeof d.target === 'string' ? d.target : d.target.id;
        
        if (causalChainNodes.has(sourceId) && causalChainNodes.has(targetId)) {
          // Use drug-aware link coloring for pathway connections
          if (visualizationMode === VisualizationMode.PERTURBED && d.strengthChange && d.strengthChange !== 1) {
            if (d.strengthChange > 1.5) {
              return '#00FF00'; // Green for enhanced interactions
            } else if (d.strengthChange < 0.5) {
              return '#FF0000'; // Red for disrupted interactions
            }
          }
          return '#888888'; // Grey for normal pathway connections
        }
        return 'var(--edge-color)'; // Theme-aware dim color for other connections
      })
      .attr('stroke-width', function(d: any) {
        const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
        const targetId = typeof d.target === 'string' ? d.target : d.target.id;
        
        if (causalChainNodes.has(sourceId) && causalChainNodes.has(targetId)) {
          let width = Math.max(2, d.strength * 3);
          // Make drug-affected links more prominent
          if (visualizationMode === VisualizationMode.PERTURBED && d.strengthChange && d.strengthChange !== 1) {
            width *= Math.abs(d.strengthChange - 1) + 1;
          }
          return Math.min(width, 8);
        }
        return Math.max(1, d.strength * 1.5); // Thinner for other connections
      })
      .attr('opacity', function(d: any) {
        const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
        const targetId = typeof d.target === 'string' ? d.target : d.target.id;
        
        if (causalChainNodes.has(sourceId) && causalChainNodes.has(targetId)) {
          if (visualizationMode === VisualizationMode.PERTURBED && d.strengthChange && d.strengthChange !== 1) {
            return 0.9; // More opaque for drug-affected links
          }
          return 0.7; // Moderate opacity for pathway connections
        }
        return 0.1; // Almost invisible for unrelated connections
      });
      
      // Find which categories are involved in the causal chain - handle multiple categories
      const involvedCategories = new Set();
      samePathwayNodes.forEach(node => {
        if (node.broadCategory) {
          if (Array.isArray(node.broadCategory)) {
            node.broadCategory.forEach(cat => involvedCategories.add(cat));
          } else {
            involvedCategories.add(node.broadCategory);
          }
        }
      });
      
      // Update category labels - dim those not involved in the causal chain
      const categoryLabelsSelection = svg.selectAll('.category-label');
      categoryLabelsSelection.style('opacity', function(d: any) {
        if (involvedCategories.has(d)) {
          return 1; // Full opacity for involved categories
        } else {
          return 0.3; // Dimmed for uninvolved categories
        }
      });
      
      console.log('Applied highlighting styles to nodes, links, and labels');
    } else {
      console.log('Resetting to default colors');
      // Reset to default colors when no node is selected
      nodeSelection.style('fill', (d: any) => getNodeColor(d))
        .style('opacity', (d: any) => getNodeOpacity(d));
      
      linkSelection.attr('stroke', (d: any) => {
        // Enhanced links for drug-perturbed connections
        if (visualizationMode === VisualizationMode.PERTURBED && d.strengthChange && d.strengthChange !== 1) {
          if (d.strengthChange > 1.5) {
            return '#00FF00'; // Green for enhanced interactions
          } else if (d.strengthChange < 0.5) {
            return '#FF0000'; // Red for disrupted interactions
          }
        }
        return 'var(--edge-color)'; // Theme-aware default
      })
        .attr('stroke-width', function(d: any) { 
          let width = Math.max(1, d.strength * 2);
          // Make drug-affected links more prominent
          if (visualizationMode === VisualizationMode.PERTURBED && d.strengthChange && d.strengthChange !== 1) {
            width *= Math.abs(d.strengthChange - 1) + 1;
          }
          return Math.min(width, 8);
        })
        .attr('opacity', (d: any) => {
          if (visualizationMode === VisualizationMode.PERTURBED && d.strengthChange && d.strengthChange !== 1) {
            return 0.9; // More opaque for drug-affected links
          }
          return 0.6;
        });
      
      // Reset category labels to full opacity
      const categoryLabelsSelection = svg.selectAll('.category-label');
      categoryLabelsSelection.style('opacity', 1);
      
      console.log('Applied default styles to nodes, links, and labels');
    }
    console.log('=== END COLOR UPDATE EFFECT ===');
  }, [selectedNode, baselineData, individualDrugData, visualizationMode, filterData, getNodeColor, getNodeOpacity, getNodeStroke, getNodeVisualEffects, getDrugEffectIndicator]);

  const currentNode = selectedNode ? getCurrentData().nodes.find(n => n.id === selectedNode) : null;
  const baselineNode = selectedNode && visualizationMode === VisualizationMode.COMPARISON ? 
    baselineData.nodes.find(n => n.id === selectedNode) : null;

  return (
    <div className="pathway-visualization">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="pathway-svg"
        style={{ 
          cursor: 'default',
          width: `${width}px`,
          height: `${height}px`
        }}
      />
      
      {/* Enhanced Drug Effects Panel */}
      {visualizationMode === VisualizationMode.PERTURBED && selectedDrugs && selectedDrugs.size > 0 && (
        <div style={{ position: 'absolute', top: '20px', left: '20px' }}>
          <div className="mode-indicator" style={{ marginBottom: '12px' }}>
            Individual Drug Effects: {Array.from(selectedDrugs).length} drugs active
          </div>
          
          {/* Drug-Specific Color Legend */}
          <div style={{ 
            background: isDarkMode ? 'rgba(0, 0, 0, 0.95)' : 'rgba(232, 227, 207, 0.95)', 
            color: isDarkMode ? '#ffffff' : '#002B32',
            padding: '16px', 
            borderRadius: '12px', 
            border: isDarkMode ? '2px solid rgba(255, 255, 255, 0.3)' : '2px solid rgba(0, 43, 50, 0.3)',
            fontSize: '13px',
            maxWidth: '320px',
            marginBottom: '12px'
          }}>
            <div style={{ color: isDarkMode ? '#FFD700' : '#364FA1', fontWeight: 'bold', marginBottom: '12px', fontSize: '14px' }}>
              Drug-Specific Colors:
            </div>
            
            {Array.from(selectedDrugs).map(drugId => {
              const drug = DRUG_TREATMENTS.find(d => d.id === drugId);
              const color = drugColors[drugId as keyof typeof drugColors];
              return (
                <div key={drugId} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '8px',
                  padding: '6px',
                  background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,43,50,0.05)',
                  borderRadius: '6px'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: `3px solid ${color}`,
                    marginRight: '10px',
                    background: 'transparent',
                    boxShadow: `0 0 8px ${color}`
                  }}></div>
                  <div>
                    <div style={{ color: isDarkMode ? 'white' : '#002B32', fontWeight: 'bold', fontSize: '12px' }}>
                      {drug?.name || drugId}
                    </div>
                    <div style={{ color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,43,50,0.7)', fontSize: '10px' }}>
                      {drug?.mechanism || 'Unknown mechanism'}
                    </div>
                  </div>
                </div>
              );
            })}
            
            <div style={{ marginTop: '12px', padding: '8px', background: isDarkMode ? 'rgba(255, 215, 0, 0.1)' : 'rgba(54, 79, 161, 0.1)', borderRadius: '6px' }}>
              <div style={{ color: isDarkMode ? '#FFD700' : '#364FA1', fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>
                How to Read:
              </div>
              <div style={{ fontSize: '11px', color: isDarkMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,43,50,0.9)' }}>
                • <strong>Control network</strong> = Always same base colors<br/>
                • <strong>Colored rings</strong> = Each drug's effects<br/>
                • <strong>Up/Down/Minimal effects</strong> = Triangle up/down, circle<br/>
                • <strong>Multiple rings</strong> = Multiple drug effects<br/>
                • <strong>Colored links</strong> = Drug-affected interactions
              </div>
            </div>
          </div>
          
          {/* Drug Effects Summary by Category */}
          <div style={{ 
            background: isDarkMode ? 'rgba(0, 0, 0, 0.95)' : 'rgba(232, 227, 207, 0.95)', 
            color: isDarkMode ? '#ffffff' : '#002B32',
            padding: '16px', 
            borderRadius: '12px', 
            border: isDarkMode ? '2px solid rgba(255, 255, 255, 0.3)' : '2px solid rgba(0, 43, 50, 0.3)',
            fontSize: '12px',
            maxWidth: '280px'
          }}>
            <div style={{ color: isDarkMode ? '#FFD700' : '#364FA1', fontWeight: 'bold', marginBottom: '12px', fontSize: '14px' }}>
              Drug Impact Summary:
            </div>
            {(() => {
              const drugTargets = getCurrentData().nodes.filter(n => n.isPerturbationTarget);
              const categoryEffects: { [key: string]: { 
                up: number, 
                down: number, 
                minimal: number,
                total: number 
              } } = {};
              
              drugTargets.forEach(node => {
                // Handle both single and multiple categories
                const categories = Array.isArray(node.broadCategory) ? node.broadCategory : [node.broadCategory || 'Unknown'];
                categories.forEach(category => {
                  if (!categoryEffects[category]) {
                    categoryEffects[category] = { up: 0, down: 0, minimal: 0, total: 0 };
                  }
                  categoryEffects[category].total++;
                  const foldChange = node.foldChange || 1;
                  
                  if (foldChange > 1.5) categoryEffects[category].up++;
                  else if (foldChange < 0.5) categoryEffects[category].down++;
                  else categoryEffects[category].minimal++;
                });
              });
              
              return Object.entries(categoryEffects)
                .filter(([,effects]) => effects.total > 0)
                .sort(([,a], [,b]) => (b.up + b.down) - (a.up + a.down))
                .slice(0, 5)
                .map(([category, effects]) => (
                  <div key={category} style={{ 
                    marginBottom: '10px', 
                    padding: '8px', 
                    background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,43,50,0.05)', 
                    borderRadius: '6px',
                    border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,43,50,0.1)'
                  }}>
                    <div style={{ color: isDarkMode ? 'white' : '#002B32', fontWeight: '600', marginBottom: '6px' }}>{category}</div>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '11px', flexWrap: 'wrap' }}>
                      {effects.up > 0 && (
                        <span style={{ color: '#00FF00', fontWeight: 'bold' }}>Up {effects.up}</span>
                      )}
                      {effects.down > 0 && (
                        <span style={{ color: '#FF0000', fontWeight: 'bold' }}>Down {effects.down}</span>
                      )}
                      {effects.minimal > 0 && (
                        <span style={{ color: '#FFD700' }}>Minimal {effects.minimal}</span>
                      )}
                      <span style={{ color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,43,50,0.6)', marginLeft: 'auto' }}>
                        {effects.total} nodes
                      </span>
                    </div>
                  </div>
                ));
            })()}
            <div style={{ marginTop: '12px', fontSize: '10px', color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,43,50,0.7)', textAlign: 'center' }}>
              Up = Upregulated • Down = Downregulated • Minimal = Minimal Change
            </div>
          </div>
        </div>
      )}

      {/* Node information panel */}
      {currentNode && (
        <div className="node-info">
          <h3>{currentNode.name}</h3>
          <p><strong>Type:</strong> {currentNode.type}</p>
          <p><strong>Pathway:</strong> {currentNode.pathway}</p>
          <p><strong>Category:</strong> {Array.isArray(currentNode.broadCategory) ? currentNode.broadCategory.join(', ') : currentNode.broadCategory}</p>
          
          {visualizationMode === VisualizationMode.COMPARISON && baselineNode ? (
            <>
              <p><strong>Baseline Expression:</strong> {baselineNode.expression?.toFixed(2)}</p>
              <p><strong>Perturbed Expression:</strong> {currentNode.expression?.toFixed(2)}</p>
              <p><strong>Fold Change:</strong> 
                <span className={`fold-change ${(currentNode.foldChange || 1) > 1.2 ? 'upregulated' : (currentNode.foldChange || 1) < 0.8 ? 'downregulated' : 'unchanged'}`}>
                  {currentNode.foldChange?.toFixed(2)}x
                </span>
              </p>
            </>
          ) : (
            <>
              <p><strong>Expression:</strong> {currentNode.expression?.toFixed(2)}</p>
              {currentNode.foldChange && currentNode.foldChange !== 1 && (
                <p><strong>Fold Change:</strong> 
                  <span className={`fold-change ${currentNode.foldChange > 1.2 ? 'upregulated' : currentNode.foldChange < 0.8 ? 'downregulated' : 'unchanged'}`}>
                    {currentNode.foldChange.toFixed(2)}x
                  </span>
                </p>
              )}
            </>
          )}
          
          <p><strong>Significance:</strong> {currentNode.significance?.toFixed(4)}</p>
          <p><strong>Confidence:</strong> {((currentNode.confidence || 0.5) * 100).toFixed(1)}%</p>
          {currentNode.isPerturbationTarget && (
            <p className="perturbation-target">🎯 Drug Target</p>
          )}
          
          <div style={{ marginTop: '12px', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
            🖱️ Click nodes to highlight pathways • ⭐ Click empty space to deselect<br/>
            📏 Node size = confidence in causal chain importance<br/>
            {visualizationMode === VisualizationMode.PERTURBED && (
              <>💊 Green = upregulated • Red = downregulated • Larger = stronger effect<br/></>
            )}
            ↔️ Scroll horizontally/vertically to explore the full network
          </div>
        </div>
      )}
    </div>
  );
};

export default PathwayVisualization; 