import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { PathwayData, OmicsType } from '../types';
import { DRUG_TREATMENTS } from '../data/mockData';
import './SankeyFlowDiagram.css';

interface SankeyFlowDiagramProps {
  data: PathwayData;
  drugData?: { [drugId: string]: PathwayData } | null;
  isDarkMode?: boolean;
  selectedDrugs: Set<string>;
  onDrugToggle: (drugId: string) => void;
  treatmentMode: 'control' | 'drug';
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
  drugEffects?: { [drugId: string]: number }; // Individual drug effects
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
  isDarkMode = false,
  selectedDrugs,
  onDrugToggle,
  treatmentMode,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedPathways, setSelectedPathways] = useState<Set<string>>(new Set(['all']));
  const [isMultiSelect, setIsMultiSelect] = useState<boolean>(false);
  
  // Add state for all biological level filters
  const [selectedMolecularPathways, setSelectedMolecularPathways] = useState<Set<string>>(new Set(['all']));
  const [selectedCellularFunctions, setSelectedCellularFunctions] = useState<Set<string>>(new Set(['all']));
  const [selectedTissueTypes, setSelectedTissueTypes] = useState<Set<string>>(new Set(['all']));
  const [selectedOrgans, setSelectedOrgans] = useState<Set<string>>(new Set(['all']));
  const [selectedSystems, setSelectedSystems] = useState<Set<string>>(new Set(['all']));
  const [selectedOutcomes, setSelectedOutcomes] = useState<Set<string>>(new Set(['all']));

  // Add state for filter visibility
  const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(true);

  const availableDrugs = useMemo(() => (DRUG_TREATMENTS.map(d => d.id)), []);

  // Drug color functions - moved outside useMemo for accessibility
  const getDrugColor = (drugId: string): string => {
    const drugColors: { [key: string]: string } = {
      'ketamine': '#FF6B6B',      // Red
      'etomidate': '#4ECDC4',     // Teal
      'propofol': '#45B7D1',      // Blue
      'novel1': '#96CEB4',        // Green
      'novel2': '#FFEAA7',        // Yellow
    };
    return drugColors[drugId] || '#888888';
  };

  const getMultiDrugColor = (drugEffects: { [drugId: string]: number }): string => {
    const drugIds = Object.keys(drugEffects);
    if (drugIds.length === 0) return '#888888';
    if (drugIds.length === 1) return getDrugColor(drugIds[0]);
    
    // For multiple drugs, create a gradient or use a special color
    return '#FF8C42'; // Orange for multiple drugs
  };

  // New function to create multi-drug color patterns
  const getMultiDrugPattern = (drugEffects: { [drugId: string]: number }): string => {
    const drugIds = Object.keys(drugEffects);
    if (drugIds.length <= 1) return '';
    
    // Create a pattern that represents multiple drugs
    // For now, we'll use a striped pattern approach
    const colors = drugIds.map(drugId => getDrugColor(drugId));
    return `repeating-linear-gradient(45deg, ${colors.join(', ')})`;
  };

  // Function to blend multiple drug colors
  const blendDrugColors = (drugEffects: { [drugId: string]: number }): string => {
    const drugIds = Object.keys(drugEffects);
    if (drugIds.length === 0) return '#888888';
    if (drugIds.length === 1) return getDrugColor(drugIds[0]);
    
    // For multiple drugs, blend the colors
    const colors = drugIds.map(drugId => getDrugColor(drugId));
    const effects = drugIds.map(drugId => drugEffects[drugId]);
    const totalEffect = effects.reduce((sum, effect) => sum + effect, 0);
    
    // Create a weighted blend of the drug colors
    let blendedR = 0, blendedG = 0, blendedB = 0;
    colors.forEach((color, index) => {
      const weight = effects[index] / totalEffect;
      const rgb = d3.rgb(color);
      blendedR += rgb.r * weight;
      blendedG += rgb.g * weight;
      blendedB += rgb.b * weight;
    });
    
    return d3.rgb(Math.round(blendedR), Math.round(blendedG), Math.round(blendedB)).toString();
  };

  // Get unique pathways for filtering
  const availablePathways = useMemo(() => {
    const pathways = new Set<string>();
    data.nodes.forEach(node => {
      pathways.add(node.pathway);
    });
    return ['all', ...Array.from(pathways).sort()];
  }, [data]);

  // Get unique options for each biological level
  const availableMolecularPathways = useMemo(() => {
    const pathways = new Set<string>();
    data.nodes.forEach(node => {
      if (node.type === OmicsType.PROTEIN || node.type === OmicsType.mRNA || 
          node.type === OmicsType.METABOLITE || node.type === OmicsType.LIPID) {
        pathways.add(node.pathway);
      }
    });
    return ['all', ...Array.from(pathways).sort()];
  }, [data]);

  const availableCellularFunctions = useMemo(() => {
    const functions = new Set<string>();
    data.nodes.forEach(node => {
      if (node.broadCategory && (Array.isArray(node.broadCategory) ? 
          node.broadCategory.includes('cellular') : node.broadCategory === 'cellular')) {
        functions.add(node.name);
      }
    });
    return ['all', ...Array.from(functions).sort()];
  }, [data]);

  const availableTissueTypes = useMemo(() => {
    const tissues = new Set<string>();
    data.nodes.forEach(node => {
      if (node.broadCategory && (Array.isArray(node.broadCategory) ? 
          node.broadCategory.includes('tissue') : node.broadCategory === 'tissue')) {
        tissues.add(node.name);
      }
    });
    return ['all', ...Array.from(tissues).sort()];
  }, [data]);

  const availableOrgans = useMemo(() => {
    const organs = new Set<string>();
    data.nodes.forEach(node => {
      if (node.broadCategory && (Array.isArray(node.broadCategory) ? 
          node.broadCategory.includes('organ') : node.broadCategory === 'organ')) {
        organs.add(node.name);
      }
    });
    return ['all', ...Array.from(organs).sort()];
  }, [data]);

  const availableSystems = useMemo(() => {
    const systems = new Set<string>();
    data.nodes.forEach(node => {
      if (node.broadCategory && (Array.isArray(node.broadCategory) ? 
          node.broadCategory.includes('system') : node.broadCategory === 'system')) {
        systems.add(node.name);
      }
    });
    return ['all', ...Array.from(systems).sort()];
  }, [data]);

  const availableOutcomes = useMemo(() => {
    const outcomes = new Set<string>();
    data.nodes.forEach(node => {
      if (node.broadCategory && (Array.isArray(node.broadCategory) ? 
          node.broadCategory.includes('behavior') : node.broadCategory === 'behavior')) {
        outcomes.add(node.name);
      }
    });
    return ['all', ...Array.from(outcomes).sort()];
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

  // Generic filter handler function
  const createFilterHandler = (
    selectedSet: Set<string>,
    setSelectedSet: React.Dispatch<React.SetStateAction<Set<string>>>,
    isMultiSelectMode: boolean
  ) => {
    return (value: string) => {
      if (isMultiSelectMode) {
        const newSelected = new Set(selectedSet);
        if (value === 'all') {
          newSelected.clear();
          newSelected.add('all');
        } else {
          newSelected.delete('all');
          if (newSelected.has(value)) {
            newSelected.delete(value);
            if (newSelected.size === 0) {
              newSelected.add('all');
            }
          } else {
            newSelected.add(value);
          }
        }
        setSelectedSet(newSelected);
      } else {
        setSelectedSet(new Set([value]));
      }
    };
  };

  // Create specific filter handlers
  const handleMolecularPathwaySelection = createFilterHandler(selectedMolecularPathways, setSelectedMolecularPathways, isMultiSelect);
  const handleCellularFunctionSelection = createFilterHandler(selectedCellularFunctions, setSelectedCellularFunctions, isMultiSelect);
  const handleTissueTypeSelection = createFilterHandler(selectedTissueTypes, setSelectedTissueTypes, isMultiSelect);
  const handleOrganSelection = createFilterHandler(selectedOrgans, setSelectedOrgans, isMultiSelect);
  const handleSystemSelection = createFilterHandler(selectedSystems, setSelectedSystems, isMultiSelect);
  const handleOutcomeSelection = createFilterHandler(selectedOutcomes, setSelectedOutcomes, isMultiSelect);

  // Process data into hierarchical tree structure
  const treeData = useMemo(() => {
    // Helper functions
    function calculateDrugEffects(pathway: string, omicsType: OmicsType): { [drugId: string]: number } {
      if (!drugData || selectedDrugs.size === 0 || treatmentMode !== 'drug') return {};
      
      const effects: { [drugId: string]: number } = {};
      
      selectedDrugs.forEach(drugId => {
        const drugNodes = drugData[drugId]?.nodes.filter(n => 
          n.pathway === pathway && n.type === omicsType
        );
        if (drugNodes && drugNodes.length > 0) {
          const avgFoldChange = drugNodes.reduce((sum, n) => sum + Math.abs((n.foldChange || 1) - 1), 0) / drugNodes.length;
          effects[drugId] = avgFoldChange;
        }
      });
      
      return effects;
    }

    // Filter function to check if a node should be included based on all filters
    function shouldIncludeNode(nodeName: string, nodeCategory: string, nodePathway?: string): boolean {
      // Check molecular pathway filter
      if (nodePathway && !selectedMolecularPathways.has('all') && !selectedMolecularPathways.has(nodePathway)) {
        return false;
      }
      
      // Check cellular function filter
      if (nodeCategory === 'cellular' && !selectedCellularFunctions.has('all') && !selectedCellularFunctions.has(nodeName)) {
        return false;
      }
      
      // Check tissue type filter
      if (nodeCategory === 'tissue' && !selectedTissueTypes.has('all') && !selectedTissueTypes.has(nodeName)) {
        return false;
      }
      
      // Check organ filter
      if (nodeCategory === 'organ' && !selectedOrgans.has('all') && !selectedOrgans.has(nodeName)) {
        return false;
      }
      
      // Check system filter
      if (nodeCategory === 'system' && !selectedSystems.has('all') && !selectedSystems.has(nodeName)) {
        return false;
      }
      
      // Check outcome filter
      if (nodeCategory === 'behavior' && !selectedOutcomes.has('all') && !selectedOutcomes.has(nodeName)) {
        return false;
      }
      
      return true;
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
      
      molecularNodes.push({
        id: `mol_${omicsType}`,
        name: omicsType,
        category: 'molecular',
        level: 0,
        value: totalValue,
        color: getOmicsColor(omicsType),
        drugEffects: {},
        children: Array.from(pathwayMap.entries()).map(([pathway, value]) => {
          const drugEffects = calculateDrugEffects(pathway, omicsType);
          const avgDrugEffect = Object.values(drugEffects).reduce((sum, effect) => sum + effect, 0) / Object.keys(drugEffects).length || 0;
          
          return {
            id: `mol_${omicsType}_${pathway}`,
            name: pathway,
            category: 'molecular',
            level: 1,
        value: value,
            color: getOmicsColor(omicsType),
            drugEffect: avgDrugEffect,
            drugEffects: drugEffects,
            pathway: pathway
          };
        })
      });
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
            (pathwayNode.name.toLowerCase().includes(category.toLowerCase()) ||
            (category === 'Energy Production' && pathwayNode.name.toLowerCase().includes('metabolism')) ||
            (category === 'Protein Synthesis' && pathwayNode.name.toLowerCase().includes('protein')) ||
            (category === 'Signal Transduction' && pathwayNode.name.toLowerCase().includes('signal')) ||
            (category === 'Membrane Function' && pathwayNode.name.toLowerCase().includes('lipid'))) &&
            shouldIncludeNode(category, 'cellular')
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
                drugEffects: pathwayNode.drugEffects ? 
                  Object.fromEntries(Object.entries(pathwayNode.drugEffects).map(([drugId, effect]) => [drugId, effect * 0.8])) : {},
              };

              // Find related tissue categories for this new cellular node
              const relatedTissueCategories = tissueCategories.filter(tissueCategory =>
                ((tissueCategory === 'Epithelial Tissue' && (category === 'Protein Synthesis' || category === 'Signal Transduction' || category === 'Membrane Function')) ||
                (tissueCategory === 'Connective Tissue' && (category === 'Protein Synthesis' || category === 'Membrane Function')) ||
                (tissueCategory === 'Muscle Tissue' && category === 'Energy Production') ||
                (tissueCategory === 'Nervous Tissue' && (category === 'Energy Production' || category === 'Signal Transduction'))) &&
                shouldIncludeNode(tissueCategory, 'tissue')
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
                    drugEffects: cellularNode.drugEffects ? 
                      Object.fromEntries(Object.entries(cellularNode.drugEffects).map(([drugId, effect]) => [drugId, effect * 0.8])) : {},
                  };

                  // Find related organ categories for this new tissue node
                  const relatedOrganCategories = organCategories.filter(organCategory =>
                    ((organCategory === 'Heart' && (tissueCategory === 'Connective Tissue' || tissueCategory === 'Muscle Tissue')) ||
                    (organCategory === 'Lungs' && tissueCategory === 'Epithelial Tissue') ||
                    (organCategory === 'Brain' && tissueCategory === 'Nervous Tissue') ||
                    (organCategory === 'Liver' && (tissueCategory === 'Epithelial Tissue' || tissueCategory === 'Connective Tissue')) ||
                    (organCategory === 'Kidneys' && (tissueCategory === 'Epithelial Tissue' || tissueCategory === 'Connective Tissue')) ||
                    (organCategory === 'Stomach' && tissueCategory === 'Epithelial Tissue')) &&
                    shouldIncludeNode(organCategory, 'organ')
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
                        drugEffects: tissueNode.drugEffects ? 
                          Object.fromEntries(Object.entries(tissueNode.drugEffects).map(([drugId, effect]) => [drugId, effect * 0.6])) : {},
                      };

                      // Find related system categories for this new organ node
                      const relatedSystemCategories = systemCategories.filter(sysCategory =>
                        ((sysCategory === 'Cardiovascular System' && organCategory === 'Heart') ||
                        (sysCategory === 'Respiratory System' && organCategory === 'Lungs') ||
                        (sysCategory === 'Nervous System' && organCategory === 'Brain') ||
                        (sysCategory === 'Digestive System' && (organCategory === 'Liver' || organCategory === 'Stomach')) ||
                        (sysCategory === 'Excretory System' && organCategory === 'Kidneys')) &&
                        shouldIncludeNode(sysCategory, 'system')
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
                            drugEffects: organNode.drugEffects ? 
                              Object.fromEntries(Object.entries(organNode.drugEffects).map(([drugId, effect]) => [drugId, effect * 0.6])) : {},
                          };
                          
                          if (selectedDrugs && selectedDrugs.size > 0) {
                            const relatedBehaviorCategories = behaviorCategories.filter(behaviorCategory =>
                              ((behaviorCategory === 'Hypertension' && sysCategory === 'Cardiovascular System') ||
                              (behaviorCategory === 'Analgesia' && sysCategory === 'Nervous System') ||
                              (behaviorCategory === 'Hypothermia' && sysCategory === 'Nervous System') ||
                              (behaviorCategory === 'Unconsciousness' && sysCategory === 'Nervous System') ||
                              (behaviorCategory === 'Hypotonia' && sysCategory === 'Nervous System')) &&
                              shouldIncludeNode(behaviorCategory, 'behavior')
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
                                  drugEffects: systemNode.drugEffects ? 
                                    Object.fromEntries(Object.entries(systemNode.drugEffects).map(([drugId, effect]) => [drugId, effect * 0.6])) : {},
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
  }, [data, drugData, selectedDrugs, selectedPathways, selectedMolecularPathways, selectedCellularFunctions, selectedTissueTypes, selectedOrgans, selectedSystems, selectedOutcomes]);

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
            
            // Always use the original node color as base
            let baseColor = d.data.color;
            
            // Apply drug effects as overlays only if drugs are selected, treatment mode is 'drug', and node has effects
            if (selectedDrugs && selectedDrugs.size > 0 && treatmentMode === 'drug' && d.data.drugEffects) {
              const drugIds = Object.keys(d.data.drugEffects);
              if (drugIds.length === 1) {
                // Single drug effect - blend with original color
                const drugId = drugIds[0];
                const effect = d.data.drugEffects[drugId];
                if (effect > 0.01) {
                  const drugColor = getDrugColor(drugId);
                  const intensity = Math.min(effect * 3, 0.7); // Limit overlay intensity
                  // Blend drug color with base color
                  return d3.interpolateRgb(baseColor, drugColor)(intensity);
                }
              } else if (drugIds.length > 1) {
                // Multiple drug effects - blend multiple drug colors
                const maxEffect = Math.max(...Object.values(d.data.drugEffects).map(v => v as number));
                if (maxEffect > 0.01) {
                  const intensity = Math.min(maxEffect * 3, 0.7);
                  // Blend multiple drug colors together
                  const blendedDrugColor = blendDrugColors(d.data.drugEffects);
                  return d3.interpolateRgb(baseColor, blendedDrugColor)(intensity);
                }
              }
            }
            
            return baseColor;
          })
      .attr('stroke', (d: any) => {
            if (d.data.level === -1) return 'transparent';
            
            // Apply drug-specific stroke colors only for affected nodes when in drug mode
            if (selectedDrugs && selectedDrugs.size > 0 && treatmentMode === 'drug' && d.data.drugEffects) {
              const drugIds = Object.keys(d.data.drugEffects);
              const maxEffect = Math.max(...Object.values(d.data.drugEffects).map(v => v as number));
              
              if (maxEffect > 0.01) {
                if (drugIds.length === 1) {
                  return getDrugColor(drugIds[0]);
                } else if (drugIds.length > 1) {
                  return blendDrugColors(d.data.drugEffects);
                }
              }
            }
            
            return isDarkMode ? '#ffffff' : '#000000';
      })
      .attr('stroke-width', (d: any) => {
            if (d.data.level === -1) return 0;
            
            // Increase stroke width for nodes with drug effects when in drug mode
            if (selectedDrugs && selectedDrugs.size > 0 && treatmentMode === 'drug' && d.data.drugEffects) {
              const maxEffect = Math.max(...Object.values(d.data.drugEffects).map(v => v as number));
              if (maxEffect > 0.01) {
                const drugIds = Object.keys(d.data.drugEffects);
                return drugIds.length > 1 ? 4 : 3; // Thicker for multi-drug effects
              }
            }
            
            return 2;
          });

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
          .attr('stroke-opacity', 1)
      .attr('fill', (d: any) => {
            if (d.data.level === -1) return 'transparent';
            
            // Always use the original node color as base
            let baseColor = d.data.color;
            
            // Apply drug effects as overlays only if drugs are selected, treatment mode is 'drug', and node has effects
            if (selectedDrugs && selectedDrugs.size > 0 && treatmentMode === 'drug' && d.data.drugEffects) {
              const drugIds = Object.keys(d.data.drugEffects);
              if (drugIds.length === 1) {
                // Single drug effect - blend with original color
                const drugId = drugIds[0];
                const effect = d.data.drugEffects[drugId];
                if (effect > 0.01) {
                  const drugColor = getDrugColor(drugId);
                  const intensity = Math.min(effect * 3, 0.7); // Limit overlay intensity
                  // Blend drug color with base color
                  return d3.interpolateRgb(baseColor, drugColor)(intensity);
                }
              } else if (drugIds.length > 1) {
                // Multiple drug effects - blend multiple drug colors
                const maxEffect = Math.max(...Object.values(d.data.drugEffects).map(v => v as number));
                if (maxEffect > 0.01) {
                  const intensity = Math.min(maxEffect * 3, 0.7);
                  // Blend multiple drug colors together
                  const blendedDrugColor = blendDrugColors(d.data.drugEffects);
                  return d3.interpolateRgb(baseColor, blendedDrugColor)(intensity);
                }
              }
            }
            
            return baseColor;
          })
          .attr('stroke', (d: any) => {
            if (d.data.level === -1) return 'transparent';
            
            // Apply drug-specific stroke colors only for affected nodes when in drug mode
            if (selectedDrugs && selectedDrugs.size > 0 && treatmentMode === 'drug' && d.data.drugEffects) {
              const drugIds = Object.keys(d.data.drugEffects);
              const maxEffect = Math.max(...Object.values(d.data.drugEffects).map(v => v as number));
              
              if (maxEffect > 0.01) {
                if (drugIds.length === 1) {
                  return getDrugColor(drugIds[0]);
                } else if (drugIds.length > 1) {
                  return blendDrugColors(d.data.drugEffects);
                }
              }
            }
            
            return isDarkMode ? '#ffffff' : '#000000';
          })
          .attr('stroke-width', (d: any) => {
            if (d.data.level === -1) return 0;
            
            // Increase stroke width for nodes with drug effects when in drug mode
            if (selectedDrugs && selectedDrugs.size > 0 && treatmentMode === 'drug' && d.data.drugEffects) {
              const maxEffect = Math.max(...Object.values(d.data.drugEffects).map(v => v as number));
              if (maxEffect > 0.01) {
                const drugIds = Object.keys(d.data.drugEffects);
                return drugIds.length > 1 ? 4 : 3; // Thicker for multi-drug effects
              }
            }
            
            return 2;
          });

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
          
        // Build drug effects information
        let drugEffectsHtml = '';
        if (selectedDrugs && selectedDrugs.size > 0 && d.data.drugEffects) {
          const drugIds = Object.keys(d.data.drugEffects);
          if (drugIds.length === 1) {
            const drugId = drugIds[0];
            const effect = d.data.drugEffects[drugId];
            drugEffectsHtml = `<br/><span style="color: ${getDrugColor(drugId)}">● ${drugId}: ${(effect * 100).toFixed(1)}%</span>`;
          } else if (drugIds.length > 1) {
            drugEffectsHtml = '<br/><strong>Drug Effects:</strong>';
            drugIds.forEach(drugId => {
              const effect = d.data.drugEffects![drugId];
              drugEffectsHtml += `<br/><span style="color: ${getDrugColor(drugId)}">● ${drugId}: ${(effect * 100).toFixed(1)}%</span>`;
            });
          }
        }
          
          tooltip.style('opacity', 1)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .html(`
            <strong>${d.data.name}</strong><br/>
            Category: ${d.data.category}<br/>
            Level: ${d.data.level}<br/>
            Value: ${d.data.value.toFixed(2)}
            ${d.data.pathway ? `<br/>Pathway: ${d.data.pathway}` : ''}
            ${drugEffectsHtml}
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

  }, [treeData, isDarkMode, selectedDrugs, treatmentMode, getMultiDrugColor, blendDrugColors]);

  return (
    <div className="sankey-flow-container">
      <div className="sankey-controls" style={{ position: 'relative', marginTop: '-20px' }}>
        {/* X button positioned absolutely on top right of sankey-controls container */}
        <button
          type="button"
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          style={{
            position: 'absolute',
            top: '2px',
            right: '8px',
            zIndex: 10,
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
            borderRadius: '4px',
            transition: 'all 0.2s ease'
          }}
          title={isFiltersOpen ? 'Hide filters' : 'Show filters'}
        >
          {isFiltersOpen ? '×' : '+'}
        </button>

        {/* Drug Legend */}
        {selectedDrugs.size > 0 && treatmentMode === 'drug' && (
          <div className="drug-legend">
            <label>Drug Effect Legend:</label>
            <div className="legend-items">
              {Array.from(selectedDrugs).map(drugId => (
                <div key={drugId} className="legend-item">
                  <span 
                    className="legend-color" 
                    style={{ backgroundColor: getDrugColor(drugId) }}
                  ></span>
                  <span className="legend-text">{drugId} (overlay)</span>
      </div>
              ))}
              {selectedDrugs.size > 1 && (
                <div className="legend-item">
                  <span 
                    className="legend-color" 
                    style={{ 
                      backgroundColor: blendDrugColors(
                        Array.from(selectedDrugs).reduce((acc, drugId) => {
                          acc[drugId] = 1; // Equal weight for legend display
                          return acc;
                        }, {} as { [drugId: string]: number })
                      )
                    }}
                  ></span>
                  <span className="legend-text">Multiple Drugs (blended)</span>
                </div>
              )}
              <div className="legend-note">
                <small>Drug colors appear as overlays on affected nodes. Multiple drugs create blended colors.</small>
              </div>
            </div>
          </div>
        )}
        
        {/* Biological Level Filters */}
        <div className="biological-filters" style={{ marginTop: '8px' }}>
          {isFiltersOpen && (
            <>
              <div className="filter-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <h4>Filter by Biological Level:</h4>
                  <div className="toggle-group">
                    <button
                      type="button"
                      className={`toggle-button ${!isMultiSelect ? 'active' : ''}`}
                      onClick={() => {
                        setIsMultiSelect(false);
                        setSelectedPathways(new Set(['all']));
                        setSelectedMolecularPathways(new Set(['all']));
                        setSelectedCellularFunctions(new Set(['all']));
                        setSelectedTissueTypes(new Set(['all']));
                        setSelectedOrgans(new Set(['all']));
                        setSelectedSystems(new Set(['all']));
                        setSelectedOutcomes(new Set(['all']));
                      }}
                    >
                      Single Select
                    </button>
                    <button
                      type="button"
                      className={`toggle-button ${isMultiSelect ? 'active' : ''}`}
                      onClick={() => setIsMultiSelect(true)}
                    >
                      Multi Select
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="filter-grid">
                {/* Molecular Pathway Filter */}
                <div className="filter-section">
                  <label>Molecular Pathways:</label>
                  <div className="filter-options">
                    {isMultiSelect ? (
                      <div className="checkbox-group">
                        {availableMolecularPathways.map(pathway => (
                          <label key={pathway} className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={selectedMolecularPathways.has(pathway)}
                              onChange={() => handleMolecularPathwaySelection(pathway)}
                              className="filter-checkbox"
                            />
                            <span className="checkbox-text">
                              {pathway === 'all' ? 'All Pathways' : pathway}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <select 
                        value={Array.from(selectedMolecularPathways)[0] || 'all'}
                        onChange={(e) => handleMolecularPathwaySelection(e.target.value)}
                        className="filter-select"
                      >
                        {availableMolecularPathways.map(pathway => (
                          <option key={pathway} value={pathway}>
                            {pathway === 'all' ? 'All Pathways' : pathway}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Cellular Function Filter */}
                <div className="filter-section">
                  <label>Cellular Functions:</label>
                  <div className="filter-options">
                    {isMultiSelect ? (
                      <div className="checkbox-group">
                        {['Energy Production', 'Protein Synthesis', 'Signal Transduction', 'Membrane Function'].map(func => (
                          <label key={func} className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={selectedCellularFunctions.has(func)}
                              onChange={() => handleCellularFunctionSelection(func)}
                              className="filter-checkbox"
                            />
                            <span className="checkbox-text">
                              {func === 'all' ? 'All Functions' : func}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <select 
                        value={Array.from(selectedCellularFunctions)[0] || 'all'}
                        onChange={(e) => handleCellularFunctionSelection(e.target.value)}
                        className="filter-select"
                      >
                        <option value="all">All Functions</option>
                        <option value="Energy Production">Energy Production</option>
                        <option value="Protein Synthesis">Protein Synthesis</option>
                        <option value="Signal Transduction">Signal Transduction</option>
                        <option value="Membrane Function">Membrane Function</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* Tissue Type Filter */}
                <div className="filter-section">
                  <label>Tissue Types:</label>
                  <div className="filter-options">
                    {isMultiSelect ? (
                      <div className="checkbox-group">
                        {['Epithelial Tissue', 'Connective Tissue', 'Muscle Tissue', 'Nervous Tissue'].map(tissue => (
                          <label key={tissue} className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={selectedTissueTypes.has(tissue)}
                              onChange={() => handleTissueTypeSelection(tissue)}
                              className="filter-checkbox"
                            />
                            <span className="checkbox-text">
                              {tissue === 'all' ? 'All Tissues' : tissue}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <select 
                        value={Array.from(selectedTissueTypes)[0] || 'all'}
                        onChange={(e) => handleTissueTypeSelection(e.target.value)}
                        className="filter-select"
                      >
                        <option value="all">All Tissues</option>
                        <option value="Epithelial Tissue">Epithelial Tissue</option>
                        <option value="Connective Tissue">Connective Tissue</option>
                        <option value="Muscle Tissue">Muscle Tissue</option>
                        <option value="Nervous Tissue">Nervous Tissue</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* Organ Filter */}
                <div className="filter-section">
                  <label>Organs:</label>
                  <div className="filter-options">
                    {isMultiSelect ? (
                      <div className="checkbox-group">
                        {['Heart', 'Lungs', 'Brain', 'Liver', 'Kidneys', 'Stomach'].map(organ => (
                          <label key={organ} className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={selectedOrgans.has(organ)}
                              onChange={() => handleOrganSelection(organ)}
                              className="filter-checkbox"
                            />
                            <span className="checkbox-text">
                              {organ === 'all' ? 'All Organs' : organ}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <select 
                        value={Array.from(selectedOrgans)[0] || 'all'}
                        onChange={(e) => handleOrganSelection(e.target.value)}
                        className="filter-select"
                      >
                        <option value="all">All Organs</option>
                        <option value="Heart">Heart</option>
                        <option value="Lungs">Lungs</option>
                        <option value="Brain">Brain</option>
                        <option value="Liver">Liver</option>
                        <option value="Kidneys">Kidneys</option>
                        <option value="Stomach">Stomach</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* System Filter */}
                <div className="filter-section">
                  <label>Systems:</label>
                  <div className="filter-options">
                    {isMultiSelect ? (
                      <div className="checkbox-group">
                        {['Cardiovascular System', 'Respiratory System', 'Nervous System', 'Digestive System', 'Excretory System'].map(system => (
                          <label key={system} className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={selectedSystems.has(system)}
                              onChange={() => handleSystemSelection(system)}
                              className="filter-checkbox"
                            />
                            <span className="checkbox-text">
                              {system === 'all' ? 'All Systems' : system}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <select 
                        value={Array.from(selectedSystems)[0] || 'all'}
                        onChange={(e) => handleSystemSelection(e.target.value)}
                        className="filter-select"
                      >
                        <option value="all">All Systems</option>
                        <option value="Cardiovascular System">Cardiovascular System</option>
                        <option value="Respiratory System">Respiratory System</option>
                        <option value="Nervous System">Nervous System</option>
                        <option value="Digestive System">Digestive System</option>
                        <option value="Excretory System">Excretory System</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* Outcome Filter */}
                <div className="filter-section">
                  <label>Outcomes:</label>
                  <div className="filter-options">
                    {isMultiSelect ? (
                      <div className="checkbox-group">
                        {['Hypertension', 'Analgesia', 'Hypothermia', 'Unconsciousness', 'Hypotonia'].map(outcome => (
                          <label key={outcome} className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={selectedOutcomes.has(outcome)}
                              onChange={() => handleOutcomeSelection(outcome)}
                              className="filter-checkbox"
                            />
                            <span className="checkbox-text">
                              {outcome === 'all' ? 'All Outcomes' : outcome}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <select 
                        value={Array.from(selectedOutcomes)[0] || 'all'}
                        onChange={(e) => handleOutcomeSelection(e.target.value)}
                        className="filter-select"
                      >
                        <option value="all">All Outcomes</option>
                        <option value="Hypertension">Hypertension</option>
                        <option value="Analgesia">Analgesia</option>
                        <option value="Hypothermia">Hypothermia</option>
                        <option value="Unconsciousness">Unconsciousness</option>
                        <option value="Hypotonia">Hypotonia</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
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