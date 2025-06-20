import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { PathwayData, OmicsType } from '../types';
import './SankeyFlowDiagram.css';

interface SankeyFlowDiagramProps {
  data: PathwayData;
  drugData?: { [drugId: string]: PathwayData } | null;
  isDarkMode?: boolean;
}

// Tree node interface for hierarchical structure
interface TreeNode {
  id: string;
  name: string;
  category: 'molecular' | 'cellular' | 'tissue' | 'organ' | 'system' | 'behavior';
  level: number;
  value: number;
  color: string;
  drugEffect?: number;
  children?: TreeNode[];
  _children?: TreeNode[]; // For collapsed state
  depth?: number;
  x?: number;
  y?: number;
  x0?: number;
  y0?: number;
  pathway?: string; // Add pathway for filtering
}

const SankeyFlowDiagram: React.FC<SankeyFlowDiagramProps> = ({
  data,
  drugData,
  isDarkMode = false
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedPathways, setSelectedPathways] = useState<Set<string>>(new Set(['all']));
  const [isMultiSelect, setIsMultiSelect] = useState<boolean>(false);
  const [selectedDrugs, setSelectedDrugs] = useState<Set<string>>(new Set());

  const availableDrugs = useMemo(() => (drugData ? Object.keys(drugData) : []), [drugData]);

  const handleDrugSelection = (drugId: string) => {
    const newSelected = new Set(selectedDrugs);
    if (newSelected.has(drugId)) {
      newSelected.delete(drugId);
    } else {
      newSelected.add(drugId);
    }
    setSelectedDrugs(newSelected);
  };

  // Get unique pathways for filtering
  const availablePathways = useMemo(() => {
    const pathways = new Set<string>();
    data.nodes.forEach(node => {
      pathways.add(node.pathway);
    });
    return ['all', ...Array.from(pathways).sort()];
  }, [data]);

  // Handle pathway selection
  const handlePathwaySelection = (pathway: string) => {
    if (isMultiSelect) {
      const newSelected = new Set(selectedPathways);
      if (pathway === 'all') {
        // If "all" is selected, clear other selections
        newSelected.clear();
        newSelected.add('all');
      } else {
        // Remove "all" if it was selected
        newSelected.delete('all');
        if (newSelected.has(pathway)) {
          newSelected.delete(pathway);
          // If no pathways selected, default to "all"
          if (newSelected.size === 0) {
            newSelected.add('all');
          }
        } else {
          newSelected.add(pathway);
        }
      }
      setSelectedPathways(newSelected);
    } else {
      // Single select mode
      setSelectedPathways(new Set([pathway]));
    }
  };

  // Process data into hierarchical tree structure
  const treeData = useMemo(() => {
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

    function getTissueColor(category: string): string {
      const colors: Record<string, string> = {
        'Epithelial Tissue': '#FFD166',
        'Connective Tissue': '#06D6A0',
        'Muscle Tissue': '#118AB2',
        'Nervous Tissue': '#EF476F',
      };
      return colors[category] || '#888888';
    }

    function getOrganColor(category: string): string {
      const colors: Record<string, string> = {
        'Heart': '#FF9F1C',
        'Lungs': '#FFBF69',
        'Brain': '#FFFFFF',
        'Liver': '#2EC4B6',
        'Kidneys': '#20A4F3',
        'Stomach': '#E71D36',
      };
      return colors[category] || '#888888';
    }

    function getSystemColor(category: string): string {
      const colors: Record<string, string> = {
        'Cardiovascular System': '#FECA57',
        'Respiratory System': '#FF9FF3',
        'Nervous System': '#54A0FF',
        'Digestive System': '#57CC99',
        'Excretory System': '#80ED99',
      };
      return colors[category] || '#888888';
    }

    function getBehaviorColor(category: string): string {
      const colors: Record<string, string> = {
        'Hypertension': '#D9534F',
        'Analgesia': '#5CB85C',
        'Hypothermia': '#5BC0DE',
        'Unconsciousness': '#337AB7',
        'Hypotonia': '#F0AD4E',
      };
      return colors[category] || '#888888';
    }

    // Filter nodes by selected pathways
    const filteredNodes = selectedPathways.has('all') 
      ? data.nodes 
      : data.nodes.filter(node => selectedPathways.has(node.pathway));

    // Group molecular data by omics type first, then by pathway
    const molecularByType = new Map<OmicsType, Map<string, number>>();
    
    filteredNodes.forEach(node => {
      if (!molecularByType.has(node.type)) {
        molecularByType.set(node.type, new Map());
      }
      const pathwayMap = molecularByType.get(node.type)!;
      const currentValue = pathwayMap.get(node.pathway) || 0;
      pathwayMap.set(node.pathway, currentValue + (node.expression || 0.5));
    });

    // Create molecular level nodes (4 main types)
    const molecularNodes: TreeNode[] = [];
    molecularByType.forEach((pathwayMap, omicsType) => {
      const totalValue = Array.from(pathwayMap.values()).reduce((sum, val) => sum + val, 0);
      const avgDrugEffect = Array.from(pathwayMap.entries()).reduce((sum, [pathway, value]) => 
        sum + calculateDrugEffect(pathway, omicsType), 0) / pathwayMap.size;
      
      const molecularNode: TreeNode = {
        id: `mol_${omicsType}`,
        name: omicsType,
        category: 'molecular',
        level: 0,
        value: totalValue,
        color: getOmicsColor(omicsType),
        drugEffect: avgDrugEffect,
        children: Array.from(pathwayMap.entries()).map(([pathway, value]) => ({
          id: `mol_${omicsType}_${pathway}`,
          name: pathway, // Remove the omics type suffix
          category: 'molecular',
          level: 1,
          value: value,
          color: getOmicsColor(omicsType),
          drugEffect: calculateDrugEffect(pathway, omicsType),
          pathway: pathway
        }))
      };
      molecularNodes.push(molecularNode);
    });

    const cellularCategories = ['Energy Production', 'Protein Synthesis', 'Signal Transduction', 'Membrane Function'];
    const tissueCategories = ['Epithelial Tissue', 'Connective Tissue', 'Muscle Tissue', 'Nervous Tissue'];
    const organCategories = ['Heart', 'Lungs', 'Brain', 'Liver', 'Kidneys', 'Stomach'];
    const systemCategories = ['Cardiovascular System', 'Respiratory System', 'Nervous System', 'Digestive System', 'Excretory System'];
    const behaviorCategories = ['Hypertension', 'Analgesia', 'Hypothermia', 'Unconsciousness', 'Hypotonia'];

    molecularNodes.forEach(molNode => {
      if (molNode.children) {
        molNode.children.forEach(pathwayNode => {
          // Find related cellular categories for this pathway
          const relatedCellularCategories = cellularCategories.filter(category =>
            pathwayNode.name.toLowerCase().includes(category.toLowerCase()) ||
            (category === 'Energy Production' && pathwayNode.name.toLowerCase().includes('metabolism')) ||
            (category === 'Protein Synthesis' && pathwayNode.name.toLowerCase().includes('protein')) ||
            (category === 'Signal Transduction' && pathwayNode.name.toLowerCase().includes('signal')) ||
            (category === 'Membrane Function' && pathwayNode.name.toLowerCase().includes('lipid'))
          );

          if (relatedCellularCategories.length > 0) {
            pathwayNode.children = relatedCellularCategories.map(category => {
              const cellularNode: TreeNode = {
                id: `${pathwayNode.id}_cell_${category.replace(/\s/g, '')}`,
                name: category,
                category: 'cellular',
                level: 2,
                value: pathwayNode.value * 0.7,
                color: getCellularColor(category),
                drugEffect: (pathwayNode.drugEffect || 0) * 0.8,
              };

              // Find related tissue categories for this new cellular node
              const relatedTissueCategories = tissueCategories.filter(tissueCategory =>
                (tissueCategory === 'Epithelial Tissue' && (category === 'Protein Synthesis' || category === 'Signal Transduction' || category === 'Membrane Function')) ||
                (tissueCategory === 'Connective Tissue' && (category === 'Protein Synthesis' || category === 'Membrane Function')) ||
                (tissueCategory === 'Muscle Tissue' && category === 'Energy Production') ||
                (tissueCategory === 'Nervous Tissue' && (category === 'Energy Production' || category === 'Signal Transduction'))
              );
              
              if (relatedTissueCategories.length > 0) {
                cellularNode.children = relatedTissueCategories.map(tissueCategory => {
                  const tissueNode: TreeNode = {
                    id: `${cellularNode.id}_tissue_${tissueCategory.replace(/\s/g, '')}`,
                    name: tissueCategory,
                    category: 'tissue',
                    level: 3,
                    value: cellularNode.value * 0.7,
                    color: getTissueColor(tissueCategory),
                    drugEffect: (cellularNode.drugEffect || 0) * 0.8,
                  };

                  // Find related organ categories for this new tissue node
                  const relatedOrganCategories = organCategories.filter(organCategory =>
                    (organCategory === 'Heart' && (tissueCategory === 'Connective Tissue' || tissueCategory === 'Muscle Tissue')) ||
                    (organCategory === 'Lungs' && tissueCategory === 'Epithelial Tissue') ||
                    (organCategory === 'Brain' && tissueCategory === 'Nervous Tissue') ||
                    (organCategory === 'Liver' && (tissueCategory === 'Epithelial Tissue' || tissueCategory === 'Connective Tissue')) ||
                    (organCategory === 'Kidneys' && (tissueCategory === 'Epithelial Tissue' || tissueCategory === 'Connective Tissue')) ||
                    (organCategory === 'Stomach' && (tissueCategory === 'Epithelial Tissue' || tissueCategory === 'Muscle Tissue'))
                  );

                  if (relatedOrganCategories.length > 0) {
                    tissueNode.children = relatedOrganCategories.map(organCategory => {
                      const organNode: TreeNode = {
                        id: `${tissueNode.id}_organ_${organCategory.replace(/\s/g, '')}`,
                        name: organCategory,
                        category: 'organ',
                        level: 4,
                        value: tissueNode.value * 0.5,
                        color: getOrganColor(organCategory),
                        drugEffect: (tissueNode.drugEffect || 0) * 0.6,
                      };

                      // Find related system categories for this new organ node
                      const relatedSystemCategories = systemCategories.filter(sysCategory =>
                        (sysCategory === 'Cardiovascular System' && organCategory === 'Heart') ||
                        (sysCategory === 'Respiratory System' && organCategory === 'Lungs') ||
                        (sysCategory === 'Nervous System' && organCategory === 'Brain') ||
                        (sysCategory === 'Digestive System' && (organCategory === 'Liver' || organCategory === 'Stomach')) ||
                        (sysCategory === 'Excretory System' && organCategory === 'Kidneys')
                      );

                      if (relatedSystemCategories.length > 0) {
                        organNode.children = relatedSystemCategories.map(sysCategory => {
                          const systemNode: TreeNode = {
                            id: `${organNode.id}_sys_${sysCategory.replace(/\s/g, '')}`,
                            name: sysCategory,
                            category: 'system',
                            level: 5,
                            value: organNode.value * 0.5,
                            color: getSystemColor(sysCategory),
                            drugEffect: (organNode.drugEffect || 0) * 0.6,
                          };
                          
                          if (selectedDrugs.size > 0) {
                            const relatedBehaviorCategories = behaviorCategories.filter(behaviorCategory =>
                              (behaviorCategory === 'Hypertension' && sysCategory === 'Cardiovascular System') ||
                              (behaviorCategory === 'Analgesia' && sysCategory === 'Nervous System') ||
                              (behaviorCategory === 'Hypothermia' && sysCategory === 'Nervous System') ||
                              (behaviorCategory === 'Unconsciousness' && sysCategory === 'Nervous System') ||
                              (behaviorCategory === 'Hypotonia' && sysCategory === 'Nervous System')
                            );

                            if (relatedBehaviorCategories.length > 0) {
                              systemNode.children = relatedBehaviorCategories.map(behaviorCategory => {
                                const behaviorNode: TreeNode = {
                                  id: `${systemNode.id}_behav_${behaviorCategory.replace(/\s/g, '')}`,
                                  name: behaviorCategory,
                                  category: 'behavior',
                                  level: 6,
                                  value: systemNode.value * 0.5,
                                  color: getBehaviorColor(behaviorCategory),
                                  drugEffect: (systemNode.drugEffect || 0) * 0.6,
                                };
                                return behaviorNode;
                              });
                            }
                          }
                          return systemNode;
                        });
                      }
                      return organNode;
                    });
                  }
                  return tissueNode;
                });
              }
              return cellularNode;
            });
          }
        });
      }
    });

    // Create root node that connects molecular to cellular to system
    const rootNode: TreeNode = {
      id: 'root',
      name: 'Biological Flow',
      category: 'molecular',
      level: -1,
      value: 0,
      color: '#888888',
      children: molecularNodes
    };

    return rootNode;
  }, [data, drugData, selectedDrugs, selectedPathways]);

  useEffect(() => {
    if (!svgRef.current || !treeData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Chart dimensions
    const width = 2000; // Increased width for more levels
    const marginTop = 20;
    const marginRight = 20;
    const marginBottom = 20;
    const marginLeft = 300; // More space for labels

    // Create hierarchical data structure
    const root = d3.hierarchy<TreeNode>(treeData);
    
    // Tree spacing
    const dx = 22; // Slightly reduced vertical spacing to fit more levels
    const dy = (width - marginRight - marginLeft) / (1 + root.height);

    // Define the tree layout
    const tree = d3.tree<TreeNode>().nodeSize([dx, dy]);
    const diagonal = d3.linkHorizontal().x((d: any) => d.y).y((d: any) => d.x);

    // Create the SVG container
    svg.attr('width', width)
       .attr('height', dx)
       .attr('viewBox', [-marginLeft, -marginTop, width, dx])
       .attr('style', `max-width: 100%; height: auto; font: 12px sans-serif; user-select: none; background: transparent;`);

    const gLink = svg.append('g')
        .attr('fill', 'none')
        .attr('stroke', isDarkMode ? '#ffffff' : '#555')
        .attr('stroke-opacity', 0.4)
        .attr('stroke-width', 1.5);

    const gNode = svg.append('g')
        .attr('cursor', 'pointer')
        .attr('pointer-events', 'all');

    // Update function for tree transitions
    function update(event: any, source: any) {
      const duration = event?.altKey ? 2500 : 250;
      const nodes = root.descendants().reverse();
      const links = root.links();

      // Compute the new tree layout
      tree(root);

      let left = root;
      let right = root;
      root.eachBefore((node: any) => {
        if ((node.x as number) < (left.x as number)) left = node;
        if ((node.x as number) > (right.x as number)) right = node;
      });

      const height = (right.x as number) - (left.x as number) + marginTop + marginBottom;

      const transition = svg.transition()
          .duration(duration)
          .attr('height', height)
          .attr('viewBox', `${-marginLeft} ${(left.x as number) - marginTop} ${width} ${height}`);

      // Update the nodes
      const node = gNode.selectAll('g')
        .data(nodes, (d: any) => d.id);

      // Enter any new nodes at the parent's previous position
      const nodeEnter = node.enter().append('g')
          .attr('transform', (d: any) => `translate(${source.y0},${source.x0})`)
          .attr('fill-opacity', 0)
          .attr('stroke-opacity', 0)
          .on('click', (event: any, d: any) => {
            d.children = d.children ? null : d._children;
            update(event, d);
          });

      // Add circles for nodes
      nodeEnter.append('circle')
          .attr('r', (d: any) => d.data.level === -1 ? 0 : 4)
          .attr('fill', (d: any) => {
            if (d.data.level === -1) return 'transparent';
            if (selectedDrugs.size > 0 && d.data.drugEffect && d.data.drugEffect > 0.05) {
              const intensity = Math.min(d.data.drugEffect * 3, 1);
              return d3.interpolateReds(0.3 + intensity * 0.7);
            }
            return d.data.color;
          })
          .attr('stroke', isDarkMode ? '#ffffff' : '#000000')
          .attr('stroke-width', 2);

      // Add text labels
      nodeEnter.append('text')
          .attr('dy', '0.31em')
          .attr('x', (d: any) => d._children ? -8 : 8)
          .attr('text-anchor', (d: any) => d._children ? 'end' : 'start')
          .text((d: any) => d.data.name)
          .attr('stroke-linejoin', 'round')
          .attr('stroke-width', 3)
          .attr('stroke', isDarkMode ? '#000000' : '#ffffff')
          .attr('fill', isDarkMode ? '#ffffff' : '#000000')
          .attr('paint-order', 'stroke')
          .style('font-size', '12px')
          .style('font-weight', 'bold');

      // Transition nodes to their new position
      ((node as any).merge(nodeEnter as any)).transition(transition as any)
          .attr('transform', (d: any) => `translate(${d.y},${d.x})`)
          .attr('fill-opacity', 1)
          .attr('stroke-opacity', 1);

      // Transition exiting nodes to the parent's new position
      (node.exit() as any).transition(transition as any).remove()
          .attr('transform', (d: any) => `translate(${source.y},${source.x})`)
          .attr('fill-opacity', 0)
          .attr('stroke-opacity', 0);

      // Update the links
      const link = gLink.selectAll('path')
        .data(links, (d: any) => d.target.id);

      // Enter any new links at the parent's previous position
      const linkEnter = link.enter().append('path')
          .attr('d', (d: any) => {
            const o = {x: source.x0, y: source.y0};
            return diagonal({source: o, target: o} as any);
          });

      // Transition links to their new position
      ((link as any).merge(linkEnter as any)).transition(transition as any)
          .attr('d', diagonal);

      // Transition exiting links to the parent's new position
      (link.exit() as any).transition(transition as any).remove()
          .attr('d', (d: any) => {
            const o = {x: source.x, y: source.y};
            return diagonal({source: o, target: o} as any);
          });

      // Stash the old positions for transition
      root.eachBefore((d: any) => {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    }

    // Initialize the tree
    (root as any).x0 = dy / 2;
    (root as any).y0 = 0;
    root.descendants().forEach((d: any, i) => {
      d.id = i;
      d._children = d.children;
      // Start with all levels expanded to show the full hierarchical structure
      // Only collapse very deep levels (level > 6) to keep the view manageable
      if (d.depth > 6) d.children = null;
    });

    update(null, root);

    // Add tooltip interactions
    gNode.selectAll('g').on('mouseover', function(event: any, d: any) {
      if (d.data.level === -1) return;
      
      d3.select(this).select('circle')
        .attr('r', 6)
        .attr('stroke-width', 3);

      if (tooltipRef.current) {
        const tooltip = d3.select(tooltipRef.current);
        tooltip.style('opacity', 1)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
          .html(`
            <strong>${d.data.name}</strong><br/>
            Category: ${d.data.category}<br/>
            Level: ${d.data.level}<br/>
            Value: ${d.data.value.toFixed(2)}
            ${d.data.pathway ? `<br/>Pathway: ${d.data.pathway}` : ''}
            ${selectedDrugs.size > 0 && d.data.drugEffect !== undefined ? 
              `<br/>Drug Effect: ${(d.data.drugEffect * 100).toFixed(1)}%` : ''}
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
      d3.select(this).select('circle')
        .attr('r', 4)
        .attr('stroke-width', 2);

      if (tooltipRef.current) {
        d3.select(tooltipRef.current).style('opacity', 0);
      }
    });

  }, [treeData, isDarkMode, selectedDrugs]);

  return (
    <div className="sankey-flow-container">
      <div className="sankey-controls">
        <div className="control-info">
          <h3>
            {selectedDrugs.size > 0 
              ? `Interactive Hierarchical Drug Effects (${selectedDrugs.size} drugs selected)`
              : 'Interactive Hierarchical Biological Flow'
            }
          </h3>
          <p>
            {selectedDrugs.size > 0 
              ? 'Click nodes to expand/collapse sections. Visualizing hierarchical drug effects from molecular types to cellular functions to system outcomes.'
              : 'Click nodes to expand/collapse sections. Hierarchical flow from molecular types to cellular functions to system-level outcomes.'
            }
          </p>
        </div>
        
        {/* Pathway Filter */}
        <div className="pathway-filter">
          <div className="filter-header">
            <label htmlFor="pathway-select">Filter by Pathway:</label>
            <div className="filter-toggle">
              <button
                type="button"
                className={`toggle-btn ${!isMultiSelect ? 'active' : ''}`}
                onClick={() => {
                  setIsMultiSelect(false);
                  setSelectedPathways(new Set(['all']));
                }}
              >
                Single Select
              </button>
              <button
                type="button"
                className={`toggle-btn ${isMultiSelect ? 'active' : ''}`}
                onClick={() => setIsMultiSelect(true)}
              >
                Multi Select
              </button>
            </div>
          </div>
          
          <div className="pathway-options">
            {isMultiSelect ? (
              // Multi-select checkboxes
              <div className="checkbox-group">
                {availablePathways.map(pathway => (
                  <label key={pathway} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedPathways.has(pathway)}
                      onChange={() => handlePathwaySelection(pathway)}
                      className="pathway-checkbox"
                    />
                    <span className="checkbox-text">
                      {pathway === 'all' ? 'All Pathways' : pathway}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              // Single-select dropdown
              <select 
                id="pathway-select"
                value={Array.from(selectedPathways)[0] || 'all'}
                onChange={(e) => handlePathwaySelection(e.target.value)}
                className="pathway-select"
              >
                {availablePathways.map(pathway => (
                  <option key={pathway} value={pathway}>
                    {pathway === 'all' ? 'All Pathways' : pathway}
                  </option>
                ))}
              </select>
            )}
          </div>
          
          {isMultiSelect && selectedPathways.size > 0 && !selectedPathways.has('all') && (
            <div className="selected-count">
              {selectedPathways.size} pathway{selectedPathways.size !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>
        
        <div className="drug-filter">
          <label>Toggle Drug Effects:</label>
          <div className="checkbox-group">
            {availableDrugs.map(drugId => (
              <label key={drugId} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedDrugs.has(drugId)}
                  onChange={() => handleDrugSelection(drugId)}
                  className="pathway-checkbox"
                />
                <span className="checkbox-text">{drugId}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      
      <div className="sankey-wrapper" ref={containerRef}>
        <svg
          ref={svgRef}
          className="sankey-flow-diagram"
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