import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { PathwayData } from '../types';
import { DRUG_TREATMENTS } from '../data/mockData';
import './HierarchicalNetwork.css';

interface Node3D {
  id: string;
  name: string;
  val: number;
  color: string;
  level: number;
  levelName: string;
  module: number;
  drugAffinity?: string; // Which drug this node is most affected by
  importance: number; // Score from 0-1 indicating node importance
  x?: number;
  y?: number;
  z?: number;
}

interface Link3D {
  source: string;
  target: string;
  color?: string;
  width?: number;
  bundled?: boolean;
  bundleStrength?: number;
  controlPoints?: { x: number; y: number; z: number }[];
}

interface HierarchicalNetwork3DProps {
  data?: PathwayData;
  drugData?: { [drugId: string]: PathwayData } | null;
  selectedDrugs?: Set<string>;
  isDarkMode?: boolean;
  selectedPathway?: string;
  animationSpeed?: number;
  particleCount?: number;
  visibleLayers?: Set<string>;
  onNodeClick?: (nodeId: string) => void;
  onLayerToggle?: (layerName: string) => void;
}

const HierarchicalNetwork3D: React.FC<HierarchicalNetwork3DProps> = ({
  data,
  drugData,
  selectedDrugs = new Set(),
  isDarkMode = false,
  selectedPathway = 'immune_response',
  animationSpeed = 1,
  particleCount = 6000, // Reduced from 10000
  visibleLayers: externalVisibleLayers,
  onNodeClick,
  onLayerToggle
}) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const [highlightLinks, setHighlightLinks] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'organic' | 'grid'>('organic');
  // System labels always visible - no toggle needed
  
  // Layer visibility controls with biological hierarchy
  const [internalVisibleLayers] = useState<Set<string>>(new Set([
    'systems', 'organs', 'tissues', 'cellular', 'molecular'
  ]));
  
  // Use external visible layers if provided, otherwise use internal state
  const visibleLayers = externalVisibleLayers || internalVisibleLayers;
  
  const graphRef = useRef<any>(null);
  const startPanPosition = useRef<{x: number, y: number} | null>(null);
  const isPanning = useRef<boolean>(false);
  const [isPanModeActive, setIsPanModeActive] = useState(false);

  // Set initial camera position and zoom restrictions
  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.cameraPosition({ x: 0, y: 0, z: 1500 });
      
      const restrictZoom = () => {
        const camera = graphRef.current?.camera();
        if (camera) {
          const distance = camera.position.distanceTo({ x: 0, y: 0, z: 0 });
          if (distance < 200) {
            camera.position.setLength(200);
          } else if (distance > 4000) {
            camera.position.setLength(4000);
          }
        }
      };

      const zoomCheckInterval = setInterval(restrictZoom, 100);
      return () => clearInterval(zoomCheckInterval);
    }
  }, []);

  // Generate hierarchical network data with drug-specific topology
  const networkData = useMemo(() => {
    const nodes: Node3D[] = [];
    const links: Link3D[] = [];
    
    // Get selected drug for topology generation
    const selectedDrug = selectedDrugs.size > 0 ? 
      DRUG_TREATMENTS.find(d => selectedDrugs.has(d.id)) : null;
    
    // Define biological hierarchy levels with drug-specific variations
    const getHierarchyLevels = () => {
      // Get drug-specific configuration
      const drugConfig = selectedDrug ? {
        ketamine: {
          systemLabels: ['Hypertension', 'Hypothermia', 'Unconsciousness', 'Analgesia'],
          organCount: 10,
          tissueCount: 4,
          cellularCount: 120,
          molecularCount: 150, // Much fewer, more connected
          connectionDensity: 0.8,
          organLabels: ['Heart', 'Brain', 'Spinal Cord', 'Liver', 'Kidney', 'Lung', 'Adrenals', 'Thyroid', 'Blood Vessels', 'Nervous System']
        },
        aspirin: {
          systemLabels: ['Hypertension', 'Hypothermia', 'Unconsciousness', 'Analgesia'],
          organCount: 8,
          tissueCount: 3,
          cellularCount: 80,
          molecularCount: 100,
          connectionDensity: 0.6,
          organLabels: ['Heart', 'Brain', 'Liver', 'Kidney', 'Stomach', 'Blood', 'Platelets', 'Vessels']
        },
        morphine: {
          systemLabels: ['Hypertension', 'Hypothermia', 'Unconsciousness', 'Analgesia'],
          organCount: 12,
          tissueCount: 2,
          cellularCount: 150,
          molecularCount: 200,
          connectionDensity: 0.9,
          organLabels: ['Brain', 'Spinal Cord', 'Heart', 'Lung', 'Liver', 'Kidney', 'GI Tract', 'CNS', 'PNS', 'Receptors', 'Synapses', 'Neurons']
        }
      }[selectedDrug.id] || {
        systemLabels: ['Hypertension', 'Hypothermia', 'Unconsciousness', 'Analgesia'],
        organCount: 8,
        tissueCount: 1,
        cellularCount: 100,
        molecularCount: 120,
        connectionDensity: 0.7,
        organLabels: ['Heart', 'Brain', 'Liver', 'Kidney', 'Lung', 'Spleen', 'Thyroid', 'Blood']
      } : null;

      if (selectedDrug && drugConfig) {
        // Drug-specific topology with unique characteristics per drug
        return [
          { 
            name: 'systems', 
            count: 4, // Always 4 medical conditions
            modules: 1,
            y: 400, 
            size: 22, // Smaller, more readable size
            color: '#E86659', // Network explorer coral red
            opacity: 0.95,
            spread: 800, // Much more spread out for better label visibility
            showLabels: true,
            labels: drugConfig.systemLabels
          },
          { 
            name: 'organs', 
            count: drugConfig.organCount,
            modules: Math.ceil(drugConfig.organCount / 4),
            y: 280, 
            size: 12,
            color: '#CCCCFF', // 2D network explorer protein color
            opacity: 0.9,
            spread: 300,
            showLabels: true,
            labels: drugConfig.organLabels
          },
          { 
            name: 'tissues', 
            count: drugConfig.tissueCount,
            modules: Math.ceil(drugConfig.tissueCount / 8),
            y: 160, 
            size: 12,
            color: '#FF7F50', // 2D network explorer metabolite color
            opacity: 0.85,
            spread: 250,
            showLabels: false,
            labels: []
          },
          { 
            name: 'cellular', 
            count: drugConfig.cellularCount,
            modules: Math.ceil(drugConfig.cellularCount / 12),
            y: 40, 
            size: 6,
            color: '#9FE2BF', // 2D network explorer mRNA color
            opacity: 0.8,
            spread: 200,
            showLabels: false,
            labels: []
          },
          { 
            name: 'molecular', 
            count: drugConfig.molecularCount, // Much fewer, but highly connected
            modules: Math.ceil(drugConfig.molecularCount / 15),
            y: -80, 
            size: 4,
            color: '#DFFF00', // 2D network explorer lipid color
            opacity: 0.8,
            spread: 150,
            showLabels: false,
            labels: []
          }
        ];
      } else {
        // Standard topology (no drug selected)
        return [
          { 
            name: 'systems', 
            count: 4,
            modules: 1,
            y: 350, 
            size: 22, // Smaller, more readable size
            color: '#E86659', // Network explorer coral red
            opacity: 0.95,
            spread: 800, // Much more spread out for better label visibility
            showLabels: true,
            labels: ['Hypertension', 'Hypothermia', 'Unconsciousness', 'Analgesia'] // Always these labels
          },
          { 
            name: 'organs', 
            count: 75,
            modules: 2,
            y: 250, 
            size: 12,
            color: '#CCCCFF', // 2D network explorer protein color
            opacity: 0.9,
            spread: 280,
            showLabels: false,
            labels: ['Heart', 'Brain', 'Liver', 'Kidney', 'Lung', 'Blood']
          },
          { 
            name: 'tissues', 
            count: 4,
            modules: 4,
            y: 150, 
            size: 12,
            color: '#FF7F50', // 2D network explorer metabolite color
            opacity: 0.85,
            spread: 220,
            showLabels: false,
            labels: []
          },
          { 
            name: 'cellular', 
            count: 150,
            modules: 8,
            y: 50, 
            size: 6,
            color: '#9FE2BF', // 2D network explorer mRNA color
            opacity: 0.8,
            spread: 180,
            showLabels: false,
            labels: []
          },
          { 
            name: 'molecular', 
            count: 4080, // Much fewer floating particles
            modules: 10,
            y: -50, 
            size: 4,
            color: '#DFFF00', // 2D network explorer lipid color
            opacity: 0.7,
            spread: 140,
            showLabels: false,
            labels: []
          }
        ];
      }
    };

    const hierarchyLevels = getHierarchyLevels();
    
    // Get drug configuration for connection density
    const drugConfig = selectedDrug ? {
      ketamine: { connectionDensity: 0.8 },
      aspirin: { connectionDensity: 0.6 },
      morphine: { connectionDensity: 0.9 }
    }[selectedDrug.id] || { connectionDensity: 0.7 } : null;
    
    const levelNodes: { [key: string]: string[] } = {};
    const moduleNodes: { [key: string]: { [module: number]: string[] } } = {};

    // Create nodes with drug-specific affinities
    hierarchyLevels.forEach((level, levelIndex) => {
      if (!visibleLayers.has(level.name)) return;
      
      levelNodes[level.name] = [];
      moduleNodes[level.name] = {};
      
      for (let m = 0; m < level.modules; m++) {
        moduleNodes[level.name][m] = [];
      }
      
      for (let i = 0; i < level.count; i++) {
        const moduleId = i % level.modules;
        
        let x, y, z;
        
        if (viewMode === 'grid') {
          // Grid layout - Create distinct 3D rectangular grids for each layer
          const gridSize = Math.ceil(Math.sqrt(level.count));
          const row = Math.floor(i / gridSize);
          const col = i % gridSize;
          
          // Calculate optimal spacing based on layer size and screen space
          const maxGridWidth = 800; // Maximum grid width
          const spacing = Math.min(maxGridWidth / gridSize, 60); // Limit spacing for readability
          
          // Center the grid around origin
          const gridOffsetX = (gridSize - 1) * spacing / 2;
          const gridOffsetZ = (gridSize - 1) * spacing / 2;
          
          x = col * spacing - gridOffsetX;
          z = row * spacing - gridOffsetZ;
          y = level.y;
          
          // Add minimal randomization to make it more organic while keeping grid structure
          x += (Math.random() - 0.5) * 5;
          z += (Math.random() - 0.5) * 5;
        } else {
          // Organic layout (original positioning)
          if (level.name === 'systems' || level.name === 'organs') {
            // Position major nodes in a wide circle above the cloud
            const angle = (i / level.count) * 2 * Math.PI;
            const radius = level.spread * 0.4;
            x = Math.cos(angle) * radius;
            z = Math.sin(angle) * radius;
            
            // For systems, vary the height more for better label separation
            if (level.name === 'systems') {
              const heightVariation = [-60, -20, 20, 60]; // Specific heights for each system
              y = level.y + (heightVariation[i] || 0);
            } else {
              y = level.y + (Math.random() - 0.5) * 20;
            }
          } else if (level.name === 'tissues') {
            // Tissue nodes in loose clusters
            const moduleAngle = (moduleId / level.modules) * 2 * Math.PI;
            const moduleRadius = level.spread * 0.5;
            const moduleCenterX = Math.cos(moduleAngle) * moduleRadius;
            const moduleCenterZ = Math.sin(moduleAngle) * moduleRadius;
            
            const intraAngle = Math.random() * 2 * Math.PI;
            const intraRadius = 30 * Math.sqrt(Math.random());
            
            x = moduleCenterX + Math.cos(intraAngle) * intraRadius;
            z = moduleCenterZ + Math.sin(intraAngle) * intraRadius;
            y = level.y + (Math.random() - 0.5) * 30;
          } else {
            // Dense particle cloud - spherical distribution
            const phi = Math.acos(1 - 2 * Math.random());
            const theta = 2 * Math.PI * Math.random();
            
            const baseRadius = level.spread * (0.3 + Math.random() * 0.7);
            const radius = baseRadius * Math.pow(Math.random(), 0.3);
            
            x = radius * Math.sin(phi) * Math.cos(theta);
            z = radius * Math.sin(phi) * Math.sin(theta);
            y = level.y + radius * Math.cos(phi) * 0.3 + (Math.random() - 0.5) * 20;
          }
        }

        // Get appropriate label
        let name = '';
        if (level.showLabels && level.labels.length > 0) {
          if (level.name === 'systems' || level.name === 'organs') {
            name = level.labels[i % level.labels.length];
          } else if (level.name === 'tissues') {
            name = level.labels[i % level.labels.length] + ` ${Math.floor(i / level.labels.length) + 1}`;
          }
        } else if (level.showLabels) {
          name = `${level.name.charAt(0).toUpperCase() + level.name.slice(1)} ${i + 1}`;
        } else {
          name = '';
        }

        // Assign drug affinity for drug-specific topology
        let drugAffinity = undefined;
        if (selectedDrug && level.name === 'molecular') {
          // Assign molecular nodes to drug pathways
          const pathwayIndex = i % selectedDrug.targetPathways.length;
          drugAffinity = selectedDrug.targetPathways[pathwayIndex];
        }

        // Calculate importance score based on level and position
        let importance = 0.5; // Base importance
        
        // Systems have highest importance
        if (level.name === 'systems') {
          importance = 0.8 + Math.random() * 0.2; // 0.8-1.0
        } else if (level.name === 'organs') {
          importance = 0.6 + Math.random() * 0.2; // 0.6-0.8
        } else if (level.name === 'tissues') {
          importance = 0.4 + Math.random() * 0.2; // 0.4-0.6
        } else if (level.name === 'cellular') {
          importance = 0.2 + Math.random() * 0.2; // 0.2-0.4
        } else if (level.name === 'molecular') {
          importance = 0.1 + Math.random() * 0.1; // 0.1-0.2
        }
        
        // Adjust size based on importance with more modest scaling
        const baseSize = level.size;
        const importanceMultiplier = 0.7 + (importance * 0.8); // 0.7x to 1.5x size (more modest)
        const adjustedSize = baseSize * importanceMultiplier;

        const nodeId = `${level.name}_${i}`;
        const node: Node3D = {
          id: nodeId,
          name: name,
          val: adjustedSize,
          color: level.color,
          level: levelIndex,
          levelName: level.name,
          module: moduleId,
          drugAffinity: drugAffinity,
          importance: importance,
          x: x,
          y: y,
          z: z,
          // Fix positions in grid mode to prevent physics movement
          ...(viewMode === 'grid' && { fx: x, fy: y, fz: z })
        };

        nodes.push(node);
        levelNodes[level.name].push(nodeId);
        moduleNodes[level.name][moduleId].push(nodeId);
      }
    });

    // Create connections - different logic for grid vs organic modes
    const connectionDensity = selectedDrug && drugConfig ? drugConfig.connectionDensity : 0.5;
    
    // --- Create Inter-Layer Connections ---
    hierarchyLevels.forEach((level, levelIndex) => {
      if (!visibleLayers.has(level.name)) return;

      // Find the next visible level to connect to
      let nextVisibleLevel = null;
      for (let i = levelIndex + 1; i < hierarchyLevels.length; i++) {
        if (visibleLayers.has(hierarchyLevels[i].name)) {
          nextVisibleLevel = hierarchyLevels[i];
          break;
        }
      }
      
      if (!nextVisibleLevel) return; // No lower layer to connect to
      
      const nextLevel = nextVisibleLevel;
      const currentNodes = levelNodes[level.name];
      const nextNodes = levelNodes[nextLevel.name];

      if (!currentNodes || !nextNodes || currentNodes.length === 0 || nextNodes.length === 0) return;

      if (viewMode === 'grid') {
        // In Grid Mode, connect each node to a few below it
        currentNodes.forEach(sourceId => {
          const connectionsPerNode = Math.min(4, Math.max(2, Math.floor(nextNodes.length / currentNodes.length)));
          for (let i = 0; i < connectionsPerNode; i++) {
            const targetId = nextNodes[Math.floor(Math.random() * nextNodes.length)];
            links.push({
              source: sourceId,
              target: targetId,
              color: isDarkMode ? `rgba(100, 150, 255, 0.6)` : `rgba(25, 118, 210, 0.8)`,
              width: 1.5
            });
          }
        });
      } else {
        // In Organic Mode, use the more complex connection logic
        if (level.name === 'systems') {
          // Systems connect to organs and tissues
          currentNodes.forEach(systemNodeId => {
            (levelNodes['organs'] || []).forEach(organId => {
              if (Math.random() < connectionDensity) links.push({ source: systemNodeId, target: organId, color: isDarkMode ? `rgba(255, 107, 53, 0.7)` : `rgba(229, 81, 0, 0.9)`, width: 3.0 });
            });
            const tissueNodes = levelNodes['tissues'] || [];
            const connectionsCount = selectedDrug ? Math.floor(tissueNodes.length * 0.4) : Math.floor(tissueNodes.length * 0.2);
            for (let i = 0; i < connectionsCount; i++) {
              const targetId = tissueNodes[Math.floor(Math.random() * tissueNodes.length)];
              if (targetId) links.push({ source: systemNodeId, target: targetId, color: isDarkMode ? `rgba(247, 147, 30, 0.5)` : `rgba(245, 124, 0, 0.7)`, width: 2.0 });
            }
          });
        } else if (level.name === 'organs') {
           // Organs connect to tissues and cellular
          currentNodes.forEach(organNodeId => {
            const tissueNodes = levelNodes['tissues'] || [];
            let connectionsCount = Math.floor(tissueNodes.length * connectionDensity * 0.3);
            for (let i = 0; i < connectionsCount; i++) {
              const targetId = tissueNodes[Math.floor(Math.random() * tissueNodes.length)];
              if (targetId) links.push({ source: organNodeId, target: targetId, color: isDarkMode ? `rgba(79, 179, 217, 0.6)` : `rgba(25, 118, 210, 0.8)`, width: 1.5 });
            }
            const cellularNodes = levelNodes['cellular'] || [];
            connectionsCount = Math.floor(cellularNodes.length * connectionDensity * 0.2);
             for (let i = 0; i < connectionsCount; i++) {
              const targetId = cellularNodes[Math.floor(Math.random() * cellularNodes.length)];
              if (targetId) links.push({ source: organNodeId, target: targetId, color: isDarkMode ? `rgba(146, 208, 80, 0.5)` : `rgba(56, 142, 60, 0.7)`, width: 1.0, bundled: true, bundleStrength: 0.6 });
            }
          });
        } else {
          // Regular hierarchical connections for all other layers
          for (let currentModule = 0; currentModule < level.modules; currentModule++) {
            const currentModuleNodes = moduleNodes[level.name][currentModule];
            const targetModules = Math.min(3, nextLevel.modules);
            for (let t = 0; t < targetModules; t++) {
              const targetModule = (currentModule * targetModules + t) % nextLevel.modules;
              const targetModuleNodes = moduleNodes[nextLevel.name][targetModule];
              if (currentModuleNodes && targetModuleNodes) {
                currentModuleNodes.forEach(higherNodeId => {
                  const isMolecularTarget = nextLevel.name === 'molecular';
                  const baseConnections = isMolecularTarget ? Math.max(2, Math.floor(targetModuleNodes.length / currentModuleNodes.length)) : Math.max(1, Math.floor(targetModuleNodes.length / currentModuleNodes.length / 2));
                  const connectionsCount = Math.floor(baseConnections * connectionDensity);
                  for (let i = 0; i < connectionsCount; i++) {
                    const lowerNodeId = targetModuleNodes[Math.floor(Math.random() * targetModuleNodes.length)];
                    if (lowerNodeId) {
                      const isMolecularConnection = level.name === 'cellular' || nextLevel.name === 'molecular';
                      links.push({
                        source: higherNodeId,
                        target: lowerNodeId,
                        color: isMolecularConnection ? (isDarkMode ? `rgba(255, 192, 0, 0.4)` : `rgba(249, 168, 37, 0.6)`) : (isDarkMode ? `rgba(255, 192, 0, 0.3)` : `rgba(249, 168, 37, 0.5)`),
                        width: isMolecularConnection ? 0.4 : 0.5,
                        bundled: isMolecularConnection,
                        bundleStrength: isMolecularConnection ? 0.8 : 0.0
                      });
                    }
                  }
                });
              }
            }
          }
        }
      }
    });

    // --- Create Intra-Layer Connections ---
    if (viewMode === 'grid') {
      // Horizontal connections for grid neighbors
      hierarchyLevels.forEach((level) => {
        if (!visibleLayers.has(level.name)) return;
        const layerNodes = levelNodes[level.name];
        if (!layerNodes || layerNodes.length === 0) return;
        const gridSize = Math.ceil(Math.sqrt(level.count));
        layerNodes.forEach((nodeId, index) => {
          const row = Math.floor(index / gridSize);
          const col = index % gridSize;
          if (col < gridSize - 1) {
            const rightIndex = row * gridSize + (col + 1);
            if (rightIndex < layerNodes.length) links.push({ source: nodeId, target: layerNodes[rightIndex], color: isDarkMode ? `rgba(120, 120, 150, 0.3)` : `rgba(100, 100, 100, 0.4)`, width: 0.8 });
          }
          if (row < gridSize - 1) {
            const bottomIndex = (row + 1) * gridSize + col;
            if (bottomIndex < layerNodes.length) links.push({ source: nodeId, target: layerNodes[bottomIndex], color: isDarkMode ? `rgba(120, 120, 150, 0.3)` : `rgba(100, 100, 100, 0.4)`, width: 0.8 });
          }
        });
      });
    } else {
      // Intra-module and bundled stream connections for organic mode
      hierarchyLevels.forEach((level) => {
        if (!visibleLayers.has(level.name)) return;
        // Reduced intra-module connections
        for (let moduleId = 0; moduleId < level.modules; moduleId++) {
          const moduleNodeIds = moduleNodes[level.name][moduleId];
          if (!moduleNodeIds || moduleNodeIds.length < 2) continue;
          const intraConnections = Math.min(moduleNodeIds.length * (selectedDrug ? 0.25 : 0.2), 15);
          for (let i = 0; i < intraConnections; i++) {
            const node1Id = moduleNodeIds[Math.floor(Math.random() * moduleNodeIds.length)];
            const node2Id = moduleNodeIds[Math.floor(Math.random() * moduleNodeIds.length)];
            if (node1Id !== node2Id) links.push({ source: node1Id, target: node2Id, color: isDarkMode ? `rgba(120, 120, 150, 0.2)` : `rgba(100, 100, 100, 0.3)`, width: 0.4 });
          }
        }
      });
       // Fewer bundled molecular streams with drug emphasis
      const streamCount = selectedDrug ? 100 : 60;
      for (let i = 0; i < streamCount; i++) {
        const level1 = Math.floor(Math.random() * hierarchyLevels.length);
        const level2 = Math.floor(Math.random() * hierarchyLevels.length);
        if (Math.abs(level1 - level2) >= 2 && Math.abs(level1 - level2) <= 4) {
          const nodes1 = levelNodes[hierarchyLevels[level1].name];
          const nodes2 = levelNodes[hierarchyLevels[level2].name];
          if (nodes1 && nodes2 && nodes1.length > 0 && nodes2.length > 0) {
            const node1Id = nodes1[Math.floor(Math.random() * nodes1.length)];
            const node2Id = nodes2[Math.floor(Math.random() * nodes2.length)];
            const isMolecularStream = (hierarchyLevels[level1].name === 'molecular' || hierarchyLevels[level2].name === 'molecular');
            links.push({
              source: node1Id,
              target: node2Id,
              color: isMolecularStream ? (isDarkMode ? `rgba(120, 180, 255, 0.15)` : `rgba(63, 81, 181, 0.25)`) : (isDarkMode ? `rgba(80, 80, 110, 0.08)` : `rgba(117, 117, 117, 0.15)`),
              width: isMolecularStream ? 0.2 : 0.3,
              bundled: isMolecularStream,
              bundleStrength: isMolecularStream ? 0.9 : 0.0
            });
          }
        }
      }
    }

    // Connect systems to each other in all modes
    const systemNodes = levelNodes['systems'] || [];
    if (systemNodes.length > 1) {
      systemNodes.forEach((systemNodeId, index) => {
        const connectionsPerSystem = Math.min(2, systemNodes.length - 1);
        for (let i = 0; i < connectionsPerSystem; i++) {
          const targetIndex = (index + i + 1) % systemNodes.length;
          const targetSystemId = systemNodes[targetIndex];
          links.push({
            source: systemNodeId,
            target: targetSystemId,
            color: isDarkMode ? `rgba(255, 107, 53, 0.8)` : `rgba(229, 81, 0, 0.9)`,
            width: 2.5
          });
        }
      });
    }

    // Safety check: Ensure no nodes are left unconnected
    const connectedNodes = new Set<string>();
    links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : (link.source as any)?.id || link.source;
      const targetId = typeof link.target === 'string' ? link.target : (link.target as any)?.id || link.target;
      connectedNodes.add(sourceId);
      connectedNodes.add(targetId);
    });

    // Connect any isolated nodes
    nodes.forEach(node => {
      if (!connectedNodes.has(node.id)) {
        // Find the nearest node from the same or adjacent level to connect to
        const sameLevel = nodes.filter(n => n.levelName === node.levelName && n.id !== node.id);
        const adjacentLevel = nodes.filter(n => 
          Math.abs(n.level - node.level) === 1 && 
          visibleLayers.has(n.levelName)
        );
        
        const potentialTargets = sameLevel.length > 0 ? sameLevel : adjacentLevel;
        
        if (potentialTargets.length > 0) {
          // Connect to closest node by distance
          let closestNode = potentialTargets[0];
          let minDistance = Math.sqrt(
            Math.pow((node.x || 0) - (closestNode.x || 0), 2) +
            Math.pow((node.y || 0) - (closestNode.y || 0), 2) +
            Math.pow((node.z || 0) - (closestNode.z || 0), 2)
          );
          
          potentialTargets.forEach(target => {
            const distance = Math.sqrt(
              Math.pow((node.x || 0) - (target.x || 0), 2) +
              Math.pow((node.y || 0) - (target.y || 0), 2) +
              Math.pow((node.z || 0) - (target.z || 0), 2)
            );
            if (distance < minDistance) {
              minDistance = distance;
              closestNode = target;
            }
          });
          
          // Add connection to prevent isolation
          links.push({
            source: node.id,
            target: closestNode.id,
            color: isDarkMode ? `rgba(150, 150, 150, 0.3)` : `rgba(100, 100, 100, 0.4)`,
            width: 0.5
          });
        }
      }
    });

    return { nodes, links };
  }, [visibleLayers, selectedDrugs, isDarkMode, viewMode]);

  // Toggle layer visibility (handled by parent component now)
  // const toggleLayer = useCallback((layerName: string) => {
  //   if (onLayerToggle) {
  //     onLayerToggle(layerName);
  //   } else {
  //     const newVisibleLayers = new Set(visibleLayers);
  //     if (newVisibleLayers.has(layerName)) {
  //       newVisibleLayers.delete(layerName);
  //     } else {
  //       newVisibleLayers.add(layerName);
  //     }
  //     setInternalVisibleLayers(newVisibleLayers);
  //   }
  // }, [visibleLayers, onLayerToggle]);



  // Highlight connected nodes and links
  const highlightNodeConnections = useCallback((node: any) => {
    const connectedNodes = new Set<string>();
    const connectedLinks = new Set<string>();
    
    connectedNodes.add(node.id);
    
    networkData.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
      const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
      
      if (sourceId === node.id || targetId === node.id) {
        connectedNodes.add(sourceId);
        connectedNodes.add(targetId);
        connectedLinks.add(`${sourceId}-${targetId}`);
      }
    });
    
    setHighlightNodes(connectedNodes);
    setHighlightLinks(connectedLinks);
  }, [networkData.links]);

  // Clear all highlights
  const clearHighlights = useCallback(() => {
    setHighlightNodes(new Set());
    setHighlightLinks(new Set());
  }, []);

  // Handle node click
  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node.id);
    if (onNodeClick) {
      onNodeClick(node.id);
    }
  }, [onNodeClick]);

  // Handle node hover
  const handleNodeHover = useCallback((node: any) => {
    if (node) {
      setHoveredNode(node.id);
      highlightNodeConnections(node);
    } else {
      setHoveredNode(null);
      clearHighlights();
    }
  }, [highlightNodeConnections, clearHighlights]);

  // Node color function with module-aware highlighting
  const nodeColor = useCallback((node: any) => {
    if (highlightNodes.has(node.id)) {
      return '#ffffff';
    }
    if (selectedNode && selectedNode === node.id) {
      return '#ffff00'; // Yellow for selected
    }
    return node.color;
  }, [highlightNodes, selectedNode]);

  // Link color function with bundling enhancement
  const linkColor = useCallback((link: any) => {
    const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
    const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
    const linkId = `${sourceId}-${targetId}`;
    if (highlightLinks.has(linkId)) {
      return link.bundled ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.8)';
    }
    // Enhance bundled link colors
    if (link.bundled && link.bundleStrength > 0.7) {
      const baseColor = link.color || 'rgba(100, 100, 100, 0.3)';
      return baseColor.replace(/[\d.]+\)$/, `${0.4 + link.bundleStrength * 0.3})`);
    }
    return link.color;
  }, [highlightLinks]);

  // Link width function with bundling
  const linkWidth = useCallback((link: any) => {
    const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
    const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
    const linkId = `${sourceId}-${targetId}`;
    if (highlightLinks.has(linkId)) {
      return link.bundled ? 3 : 2;
    }
    // Bundled links are slightly thicker for better visibility
    if (link.bundled) {
      return (link.width || 0.3) * 1.2;
    }
    return link.width || 0.3;
  }, [highlightLinks]);

  // Link curvature function for bundling effect
  const linkCurvature = useCallback((link: any) => {
    if (!link.bundled) return 0;
    
    // Higher bundle strength = more curvature
    const baseCurvature = link.bundleStrength || 0.5;
    
    // Add some randomness for organic bundling
    const randomFactor = (Math.sin(link.source.id.length + link.target.id.length) + 1) / 2;
    
    return baseCurvature * 0.3 + randomFactor * 0.2;
  }, []);

  // Create a single grid plane for a specific level
  const createSingleGridPlane = useCallback((levelName: string) => {
    if (viewMode !== 'grid') return null;

    // Use the same hierarchy levels as the network data generation
    const hierarchyLevels = [
      { name: 'systems', count: 4, modules: 1, y: 400, spread: 800, size: 35, color: '#E86659', showLabels: true, labels: ['Hypertension', 'Hypothermia', 'Unconsciousness', 'Analgesia'] },
      { name: 'organs', count: 8, modules: 2, y: 280, spread: 400, size: 18, color: '#CCCCFF', showLabels: true, labels: ['Heart', 'Brain', 'Liver', 'Kidney', 'Lung', 'Skin', 'Muscle', 'Bone'] },
      { name: 'tissues', count: 20, modules: 4, y: 160, spread: 500, size: 12, color: '#FF7F50', showLabels: false, labels: [] },
      { name: 'cellular', count: 50, modules: 8, y: 40, spread: 600, size: 12, color: '#9FE2BF', showLabels: false, labels: [] },
      { name: 'molecular', count: particleCount, modules: 30, y: -80, spread: 800, size: 6, color: '#DFFF00', showLabels: false, labels: [] }
    ];

    const level = hierarchyLevels.find(l => l.name === levelName);
    if (!level) return null;

    const levelGroup = new THREE.Group();
    levelGroup.name = `grid-${levelName}`;

    // Create grid plane for this level
    const gridSize = Math.ceil(Math.sqrt(level.count));
    const maxGridWidth = 800;
    const spacing = Math.min(maxGridWidth / gridSize, 60);
    const planeSize = (gridSize - 1) * spacing + 100; // Add padding

    // Create wireframe plane
    const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize, gridSize, gridSize);
    const planeMaterial = new THREE.MeshBasicMaterial({ 
      color: isDarkMode ? 0x333366 : 0x666699,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });
    
    const gridPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    gridPlane.position.set(0, level.y, 0);
    gridPlane.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    
    // Add level label
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
      const fontSize = 40; // Increased from 32 for better visibility
      const padding = 20; // Increased padding
      const text = level.name.toUpperCase();
      
      context.font = `bold ${fontSize}px Arial`;
      const textWidth = context.measureText(text).width;
      
      canvas.width = textWidth + padding * 2;
      canvas.height = fontSize + padding * 2;
      
      context.font = `bold ${fontSize}px Arial`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)'; // Increased opacity
      context.fillText(text, canvas.width / 2, canvas.height / 2);
      
      const texture = new THREE.CanvasTexture(canvas);
      const labelMaterial = new THREE.SpriteMaterial({ 
        map: texture,
        transparent: true,
        alphaTest: 0.1
      });
      
      const label = new THREE.Sprite(labelMaterial);
      const scale = 0.4; // Increased from 0.3 for better visibility
      label.scale.set(canvas.width * scale, canvas.height * scale, 1);
      label.position.set(planeSize / 2 + 80, level.y + 30, 0); // Adjusted position for better visibility
      
      levelGroup.add(label);
    }
    
    levelGroup.add(gridPlane);
    return levelGroup;
  }, [viewMode, isDarkMode, particleCount]);

  // Update individual grid planes when layers change
  const updateGridPlanes = useCallback(() => {
    if (!graphRef.current || viewMode !== 'grid') return;

    const scene = graphRef.current.scene();
    // Use the same layer names as the network data generation
    const hierarchyLevels = ['systems', 'organs', 'tissues', 'cellular', 'molecular'];

    hierarchyLevels.forEach(levelName => {
      const existingGrid = scene.getObjectByName(`grid-${levelName}`);
      const shouldShow = visibleLayers.has(levelName);

      if (shouldShow && !existingGrid) {
        // Add grid plane for this layer
        const gridPlane = createSingleGridPlane(levelName);
        if (gridPlane) {
          scene.add(gridPlane);
        }
      } else if (!shouldShow && existingGrid) {
        // Remove grid plane for this layer
        scene.remove(existingGrid);
      }
    });
  }, [visibleLayers, createSingleGridPlane, viewMode]);

  // Node three object function - creates persistent 3D labels for systems
  const nodeThreeObject = useCallback((node: any) => {
    // Show labels for systems nodes and any node with a name
    const shouldShowLabel = (node.levelName === 'systems' || node.levelName === 'organs') && 
                           node.name && node.name.length > 0;
    
    if (!shouldShowLabel) {
      // Return default sphere for non-system nodes with importance-based sizing
      const radius = node.val || 2;
      const sphereGeometry = new THREE.SphereGeometry(radius, 16, 16);
      const sphereMaterial = new THREE.MeshBasicMaterial({ 
        color: node.color,
        transparent: true,
        opacity: 0.9 
      });
      return new THREE.Mesh(sphereGeometry, sphereMaterial);
    }
    
    // Create a group to hold both the sphere and the label
    const group = new THREE.Group();
    
    // Create the main sphere with importance-based sizing
    const radius = node.val || 10;
    const sphereGeometry = new THREE.SphereGeometry(radius, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({ 
      color: node.color,
      transparent: true,
      opacity: 0.9 
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    group.add(sphere);
    
    // Create text label
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
      const fontSize = 48;
      const padding = 20;
      
      // Set font and measure text
      context.font = `bold ${fontSize}px Arial`;
      const textWidth = context.measureText(node.name).width;
      
      // Set canvas size
      canvas.width = textWidth + padding * 2;
      canvas.height = fontSize + padding * 2;
      
      // Clear and set font again (canvas resize clears it)
      context.font = `bold ${fontSize}px Arial`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      
      // Draw text (no background or border)
      context.fillStyle = isDarkMode ? 'white' : 'black';
      context.fillText(node.name, canvas.width / 2, canvas.height / 2);
      
      // Create texture and material
      const texture = new THREE.CanvasTexture(canvas);
      const labelMaterial = new THREE.SpriteMaterial({ 
        map: texture,
        transparent: true,
        alphaTest: 0.1
      });
      
      // Create sprite and position it above the sphere
      const label = new THREE.Sprite(labelMaterial);
      const scale = 0.5; // Adjust scale as needed
      label.scale.set(canvas.width * scale, canvas.height * scale, 1);
      const radius = node.val || 10;
      label.position.set(0, radius + 30, 0); // Position above sphere based on actual radius
      
      group.add(label);
    }
    
    return group;
  }, [isDarkMode]);

  // Node visibility function to properly hide/show layers
  const nodeVisibility = useCallback((node: any) => {
    return visibleLayers.has(node.levelName);
  }, [visibleLayers]);

  // Link visibility function to hide links when nodes are hidden
  const linkVisibility = useCallback((link: any) => {
    const sourceNode = networkData.nodes.find(n => n.id === (typeof link.source === 'object' ? link.source.id : link.source));
    const targetNode = networkData.nodes.find(n => n.id === (typeof link.target === 'object' ? link.target.id : link.target));
    
    if (!sourceNode || !targetNode) return false;
    
    return visibleLayers.has(sourceNode.levelName) && 
           visibleLayers.has(targetNode.levelName);
  }, [visibleLayers, networkData.nodes]);

  // Calculate detailed statistics for each layer
  const layerStats = useMemo(() => {
    const stats = new Map();
    
    // Initialize stats for each layer
    const layers = [
      { key: 'systems', label: 'Systems', color: '#E86659' },
      { key: 'organs', label: 'Organs', color: '#CCCCFF' },
      { key: 'tissues', label: 'Tissues', color: '#FF7F50' },
      { key: 'cellular', label: 'Cellular', color: '#9FE2BF' },
      { key: 'molecular', label: 'Molecular', color: '#DFFF00' }
    ];
    
    layers.forEach(layer => {
      stats.set(layer.key, {
        label: layer.label,
        color: layer.color,
        nodeCount: 0,
        edgeCount: 0,
        visible: visibleLayers.has(layer.key)
      });
    });
    
    // Count nodes by layer
    networkData.nodes.forEach(node => {
      const layerKey = node.levelName;
      if (stats.has(layerKey)) {
        const layerStat = stats.get(layerKey);
        layerStat.nodeCount++;
      }
    });
    
    // Count edges by layer (edges connecting to/from each layer)
    networkData.links.forEach(link => {
      const sourceNode = networkData.nodes.find(n => n.id === (typeof link.source === 'string' ? link.source : (link.source as any)?.id || link.source));
      const targetNode = networkData.nodes.find(n => n.id === (typeof link.target === 'string' ? link.target : (link.target as any)?.id || link.target));
      
      if (sourceNode && targetNode) {
        // Count edge for source layer
        if (stats.has(sourceNode.levelName)) {
          stats.get(sourceNode.levelName).edgeCount++;
        }
        // Count edge for target layer (if different)
        if (targetNode.levelName !== sourceNode.levelName && stats.has(targetNode.levelName)) {
          stats.get(targetNode.levelName).edgeCount++;
        }
      }
    });
    
    return Array.from(stats.values());
  }, [networkData.nodes, networkData.links, visibleLayers]);

  // State for panel position and visibility
  const [panelPosition, setPanelPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(true);

  // Handle panel dragging (using the pattern from Medium article)
  const startPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - startPos.current.x;
    const newY = e.clientY - startPos.current.y;
    
    // Keep panel within viewport bounds
    const maxX = window.innerWidth - 320; // panel width
    const maxY = window.innerHeight - 400; // approximate panel height
    
    setPanelPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  }, [isDragging]);

  const onMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handlePanelMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    startPos.current = { 
      x: e.clientX - panelPosition.x, 
      y: e.clientY - panelPosition.y 
    };
  }, [panelPosition]);

  // Add event listeners for dragging and keyboard shortcuts
  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  // Update grid planes when view mode or layer visibility changes
  useEffect(() => {
    if (graphRef.current) {
      const scene = graphRef.current.scene();
      
      if (viewMode === 'grid') {
        // Update individual grid planes
        updateGridPlanes();
      } else {
        // Remove all grid planes in organic mode
        const hierarchyLevels = ['systems', 'organs', 'tissues', 'cellular', 'molecular'];
        hierarchyLevels.forEach(levelName => {
          const existingGrid = scene.getObjectByName(`grid-${levelName}`);
          if (existingGrid) {
            scene.remove(existingGrid);
          }
        });
      }
    }
  }, [viewMode, updateGridPlanes, visibleLayers]);

  // Reset physics simulation when layers are toggled to prevent nodes flying off
  useEffect(() => {
    if (graphRef.current && viewMode !== 'grid') {
      // Reset the force simulation to prevent nodes from flying off
      const simulation = graphRef.current.d3Force();
      if (simulation) {
        // Stop current simulation
        simulation.stop();
        
        // Reset velocities to prevent flying off
        simulation.nodes().forEach((node: any) => {
          if (node.vx !== undefined) node.vx = 0;
          if (node.vy !== undefined) node.vy = 0;
          if (node.vz !== undefined) node.vz = 0;
          
          // Also reset any accumulated forces
          if (node.fx !== undefined && !node.fx) node.fx = undefined;
          if (node.fy !== undefined && !node.fy) node.fy = undefined;
          if (node.fz !== undefined && !node.fz) node.fz = undefined;
        });
        
        // Restart simulation with proper alpha and cooling
        simulation.alpha(0.3).alphaDecay(0.01).velocityDecay(0.3).restart();
      }
    }
  }, [visibleLayers, viewMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle panel with 'S' key (for Statistics)
      if (e.key.toLowerCase() === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setIsPanelVisible(prev => !prev);
      }
      // Close panel with Escape key
      if (e.key === 'Escape' && isPanelVisible) {
        setIsPanelVisible(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPanelVisible]);

  const handleResetPosition = useCallback(() => {
    if (graphRef.current) {
      // Position camera so systems level nodes (y=400) are at the top of the screen
      // Systems nodes are at y=400, so position camera above them
      graphRef.current.cameraPosition({ x: 0, y: 600, z: 1200 }, undefined, 1000);
    }
  }, []);

  // Toggle pan mode
  const togglePanMode = useCallback(() => {
    const newPanMode = !isPanModeActive;
    setIsPanModeActive(newPanMode);
    
    // Update cursor style
    if (graphRef.current) {
      const canvas = graphRef.current.renderer().domElement;
      canvas.style.cursor = newPanMode ? 'grab' : 'default';
      
      // Temporarily disable other controls when in pan mode
      const controls = graphRef.current.controls();
      if (controls) {
        controls.enabled = !newPanMode;
      }
    }
  }, [isPanModeActive]);

  // Handle mouse events for panning
  const handleGraphMouseDown = useCallback((event: React.MouseEvent) => {
    if (isPanModeActive && graphRef.current) {
      event.preventDefault();
      isPanning.current = true;
      startPanPosition.current = { x: event.clientX, y: event.clientY };
      
      // Change cursor to indicate active panning
      const canvas = graphRef.current.renderer().domElement;
      canvas.style.cursor = 'grabbing';
      
      // Disable controls during panning
      const controls = graphRef.current.controls();
      if (controls) {
        controls.enabled = false;
      }
    }
  }, [isPanModeActive]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (isPanning.current && startPanPosition.current && graphRef.current) {
      event.preventDefault();
      
      // Calculate movement delta
      const deltaX = event.clientX - startPanPosition.current.x;
      const deltaY = event.clientY - startPanPosition.current.y;
      
      // Pan the camera
      const camera = graphRef.current.camera();
      if (camera) {
        const panSpeed = 0.5;
        camera.position.x -= deltaX * panSpeed;
        camera.position.y += deltaY * panSpeed;
        
        // Update camera target to maintain relative position
        const controls = graphRef.current.controls();
        if (controls && controls.target) {
          controls.target.x -= deltaX * panSpeed;
          controls.target.y += deltaY * panSpeed;
        }
      }
      
      // Update start position for next move
      startPanPosition.current = { x: event.clientX, y: event.clientY };
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isPanning.current && graphRef.current) {
      isPanning.current = false;
      startPanPosition.current = null;
      
      // Restore cursor
      const canvas = graphRef.current.renderer().domElement;
      canvas.style.cursor = isPanModeActive ? 'grab' : 'default';
      
      // If we're exiting pan mode, re-enable controls
      if (!isPanModeActive) {
        const controls = graphRef.current.controls();
        if (controls) {
          controls.enabled = true;
        }
      }
    }
  }, [isPanModeActive]);

  // Add global mouse event handlers
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      handleMouseUp();
    };
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isPanning.current) {
        handleMouseMove(e as any);
      }
    };
    
    // Add global event listeners
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('mousemove', handleGlobalMouseMove);
    
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [handleMouseUp, handleMouseMove]);

  return (
    <div className="hierarchical-network" 
      onMouseDown={handleGraphMouseDown}
      onMouseUp={handleMouseUp}
    >
      <div className="view-controls-container">
        <button
          className={`view-control-btn ${viewMode === 'organic' ? 'active' : ''}`}
          onClick={() => setViewMode('organic')}
          title="Organic cloud-like layout"
        >
          <span role="img" aria-label="Organic Layout">◯</span>
        </button>
        <button
          className={`view-control-btn ${viewMode === 'grid' ? 'active' : ''}`}
          onClick={() => setViewMode('grid')}
          title="3D grid hierarchical layout"
        >
          <span role="img" aria-label="Grid Layout" style={{ fontSize: '28px' }}>⊞</span>
        </button>
        <button
          className="view-control-btn"
          onClick={handleResetPosition}
          title="Reset camera position"
        >
          <span role="img" aria-label="Reset Position" style={{ fontSize: '26px' }}>⟲</span>
        </button>
        <button
          className={`view-control-btn ${isPanModeActive ? 'active' : ''}`}
          onClick={togglePanMode}
          title={isPanModeActive ? "Switch to rotation mode" : "Switch to pan mode"}
        >
          <span role="img" aria-label="Pan Mode">P</span>
        </button>
      </div>

      {/* Toggle button when panel is hidden */}
      {!isPanelVisible && (
        <button 
          className="panel-toggle-btn"
          onClick={() => setIsPanelVisible(true)}
          title="Show Network Statistics - Nodes & Edges (Ctrl/Cmd + S)"
        >
          📊
        </button>
      )}
      
      {/* Enhanced Statistics Panel with popup styling */}
      {isPanelVisible && (
        <div 
          className={`network-stats-panel ${isDragging ? 'dragging' : ''}`}
          style={{
            left: panelPosition.x,
            top: panelPosition.y,
            transform: isDragging ? 'scale(1.02)' : 'scale(1)',
            transition: isDragging ? 'none' : 'transform 0.2s ease',
            cursor: isDragging ? 'grabbing' : 'grab',
            background: isDarkMode ? 'rgba(30, 30, 40, 0.95)' : 'rgba(232, 227, 207, 0.95)',
            border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`,
            padding: '16px',
            boxSizing: 'border-box'
          }}
          onMouseDown={handlePanelMouseDown}
          title="Drag to move panel"
        >
          {/* Close button in the corner */}
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            zIndex: 10
          }}>
            <button 
              className="panel-close-btn"
              onClick={() => setIsPanelVisible(false)}
              onMouseDown={(e) => e.stopPropagation()} // Prevent dragging when clicking close
              title="Close panel (Esc)"
              style={{
                background: 'none',
                border: 'none',
                color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                fontSize: '18px',
                cursor: 'pointer',
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

          {/* Panel content without the header */}
          <div style={{
            width: '100%',
            overflowY: 'auto',
            maxHeight: '450px',
            paddingTop: '20px' // Add top padding to create space below the close button
          }}>
            <div className="stats-overview" style={{ 
              padding: '0 0 12px 0',
              borderBottom: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
              marginBottom: '12px',
              paddingRight: '36px' // Add right padding to prevent overlap with the close button
            }}>
              <div className="stat-item total">
                <span className="stat-label">Total Nodes:</span>
                <span className="stat-value" style={{ 
                  color: isDarkMode ? '#ffffff' : '#000000',
                  fontWeight: '600'
                }}>
                  {networkData.nodes.length.toLocaleString()}
                </span>
              </div>
              <div className="stat-item total">
                <span className="stat-label">Total Edges:</span>
                <span className="stat-value" style={{ 
                  color: isDarkMode ? '#ffffff' : '#000000',
                  fontWeight: '600'
                }}>
                  {networkData.links.length.toLocaleString()}
                </span>
              </div>
            </div>
          
          <div className="layer-stats">
            <h5 style={{ 
              margin: '0 0 12px 0',
              fontSize: '14px',
              color: isDarkMode ? 'var(--accent-primary)' : '#364FA1',
              fontWeight: '500'
            }}>
              Layer Statistics
            </h5>
            
            {Array.from(layerStats.values()).map(layer => (
              <div 
                key={layer.label} 
                className={`layer-stat-item ${!layer.visible ? 'hidden' : ''}`}
                style={{
                  background: isDarkMode ? 'rgba(30, 30, 40, 0.5)' : 'rgba(255, 255, 255, 0.2)',
                  borderLeft: `3px solid ${layer.color}`,
                  borderRadius: '6px',
                  padding: '10px',
                  marginBottom: '10px'
                }}
              >
                <div className="layer-stat-header">
                  <div 
                    className="layer-color-indicator" 
                    style={{ backgroundColor: layer.color }}
                  ></div>
                  <div className="layer-name" style={{ 
                    color: isDarkMode ? '#ffffff' : '#333333',
                    flex: 1,
                    fontWeight: '500'
                  }}>
                    {layer.label}
                  </div>
                  <div className={`layer-status ${layer.visible ? 'visible' : 'hidden'}`} style={{
                    color: layer.visible ? '#364FA1' : (isDarkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)')
                  }}>
                    {layer.visible ? 'Visible' : 'Hidden'}
                  </div>
                </div>
                
                <div className="layer-stat-counts" style={{ display: 'flex', gap: '12px' }}>
                  <div className="stat-count">
                    <div className="count-label" style={{ 
                      fontSize: '11px',
                      color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)'
                    }}>
                      Nodes
                    </div>
                    <div className="count-value" style={{ 
                      fontWeight: '600',
                      fontSize: '13px',
                      color: isDarkMode ? '#ffffff' : '#333333'
                    }}>
                      {layer.nodeCount.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="stat-count">
                    <div className="count-label" style={{ 
                      fontSize: '11px',
                      color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)'
                    }}>
                      Edges
                    </div>
                    <div className="count-value" style={{ 
                      fontWeight: '600',
                      fontSize: '13px',
                      color: isDarkMode ? '#ffffff' : '#333333'
                    }}>
                      {layer.edgeCount.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {(hoveredNode || selectedNode) && (
            <div className="interaction-info" style={{
              marginTop: '12px',
              padding: '12px 0 0',
              borderTop: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
            }}>
              <h5 style={{ 
                margin: '0 0 8px 0',
                fontSize: '14px',
                color: isDarkMode ? 'var(--accent-primary)' : '#364FA1',
                fontWeight: '500'
              }}>
                Current Selection
              </h5>
              
              {hoveredNode && (
                <div className="interaction-item" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '6px'
                }}>
                  <span className="interaction-label" style={{
                    fontSize: '12px',
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                    fontWeight: '500'
                  }}>
                    Focused:
                  </span>
                  <span className="interaction-value" style={{
                    fontSize: '12px',
                    color: isDarkMode ? '#ffffff' : '#333333',
                    fontWeight: '600'
                  }}>
                    {hoveredNode}
                  </span>
                </div>
              )}
              
              {selectedNode && (
                <div className="interaction-item" style={{
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span className="interaction-label" style={{
                    fontSize: '12px',
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                    fontWeight: '500'
                  }}>
                    Selected:
                  </span>
                  <span className="interaction-value" style={{
                    fontSize: '12px',
                    color: isDarkMode ? '#ffffff' : '#333333',
                    fontWeight: '600'
                  }}>
                    {selectedNode}
                  </span>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      )}
      
      <ForceGraph3D
        graphData={networkData}
        backgroundColor="rgba(0,0,0,0)"
        showNavInfo={false}
        enableNodeDrag={true}
        enableNavigationControls={true}
        enablePointerInteraction={true}

        
        // Node styling for glowy modular particle cloud
        nodeThreeObject={nodeThreeObject}
        nodeVal={(node: any) => node.val}
        nodeColor={nodeColor}
        nodeVisibility={nodeVisibility} // Control node visibility for layer toggling
        nodeOpacity={0.9} // Higher opacity for more glow
        nodeResolution={32} // Very high resolution for ultra-smooth nodes
        nodeRelSize={1} // Relative size scaling
        nodeAutoColorBy="levelName"
        
        // Link styling for enhanced structural connections with bundling
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkVisibility={linkVisibility} // Control link visibility for layer toggling
        linkOpacity={0.7} // More visible edges
        linkCurvature={linkCurvature} // Add curvature for bundling effect
        linkDirectionalParticles={0}
        
        // Force simulation settings with edge bundling
        d3AlphaDecay={viewMode === 'grid' ? 1 : 0.01} // Disable physics in grid mode
        d3VelocityDecay={viewMode === 'grid' ? 1 : 0.3} // Stop movement in grid mode
        cooldownTicks={viewMode === 'grid' ? 0 : 500} // No simulation in grid mode
        
        // Camera controls with zoom restrictions
        
        // Event handlers
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        onLinkHover={() => {}}
        
        // Update grid planes when engine stops
        onEngineStop={() => {
          if (graphRef.current && viewMode === 'grid') {
            // Update grid planes for current visible layers
            updateGridPlanes();
          }
        }}
        
        // Reference for camera control
        ref={graphRef}
      />
    </div>
  );
};

export default HierarchicalNetwork3D; 