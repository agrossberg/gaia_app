import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { PathwayData, BiologicalNode, BiologicalLink, OmicsType } from '../types';
import './PerturbationAnimation.css';

interface PerturbationAnimationProps {
  data: PathwayData;
  drugData?: { [drugId: string]: PathwayData } | null;
  selectedDrugs?: Set<string>;
  isDarkMode?: boolean;
}

interface AnimationNode extends BiologicalNode {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
  animationState?: 'initial' | 'perturbed' | 'propagating' | 'stable';
  perturbationTime?: number;
  originalEffect?: number;
}

interface AnimationLink extends BiologicalLink {
  source: AnimationNode;
  target: AnimationNode;
  animationState?: 'inactive' | 'transmitting' | 'active';
  transmissionTime?: number;
}

const PerturbationAnimation: React.FC<PerturbationAnimationProps> = ({
  data,
  drugData,
  selectedDrugs = new Set(),
  isDarkMode = false
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const animationRef = useRef<number | null>(null);

  // Process data for animation
  const animationData = useMemo(() => {
    // Start with baseline data and add perturbation information
    const nodes: AnimationNode[] = data.nodes.slice(0, 20).map(node => ({ // Limit to 20 nodes for demo
      ...node,
      animationState: 'initial' as const,
      perturbationTime: 0,
      originalEffect: 0
    }));

    const links: AnimationLink[] = data.links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return nodes.some(n => n.id === sourceId) && nodes.some(n => n.id === targetId);
    }).map(link => ({
      ...link,
      source: nodes.find(n => n.id === (typeof link.source === 'string' ? link.source : link.source.id))!,
      target: nodes.find(n => n.id === (typeof link.target === 'string' ? link.target : link.target.id))!,
      animationState: 'inactive' as const,
      transmissionTime: 0
    }));

    // Add drug perturbation effects with timing
    if (drugData && selectedDrugs.size > 0) {
      // Use real drug data
      Array.from(selectedDrugs).forEach((drugId, drugIndex) => {
        if (drugData[drugId]) {
          drugData[drugId].nodes.forEach(drugNode => {
            const baseNode = nodes.find(n => n.id === drugNode.id);
            if (baseNode && drugNode.foldChange !== 1.0) {
              baseNode.originalEffect = Math.abs((drugNode.foldChange || 1) - 1);
              baseNode.perturbationTime = drugIndex * 2 + Math.random() * 1; // Stagger drug effects
            }
          });
        }
      });
    } else {
      // Generate demo perturbations for preview
      const numPerturbations = Math.min(5, nodes.length);
      const selectedNodes = nodes.slice(0, numPerturbations);
      
      selectedNodes.forEach((node, index) => {
        node.originalEffect = 0.3 + Math.random() * 0.7; // Random effect strength
        node.perturbationTime = index * 1.5 + Math.random() * 0.5; // Stagger effects
      });
    }

    return { nodes, links };
  }, [data, drugData, selectedDrugs]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const animate = () => {
      setCurrentTime(prev => prev + 0.1 * animationSpeed);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, animationSpeed]);

  // D3 visualization
  useEffect(() => {
    if (!svgRef.current || animationData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const containerWidth = svgRef.current.clientWidth;
    const containerHeight = svgRef.current.clientHeight;
    const width = containerWidth;
    const height = containerHeight - 100; // Leave space for controls

    // Create simulation
    const simulation = d3.forceSimulation<AnimationNode>(animationData.nodes)
      .force('link', d3.forceLink<AnimationNode, AnimationLink>(animationData.links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Create container
    const container = svg.append('g');

    // Create links
    const link = container.append('g')
      .selectAll('line')
      .data(animationData.links)
      .enter()
      .append('line')
      .attr('class', 'animation-link')
      .attr('stroke', isDarkMode ? '#ffffff40' : '#00000040')
      .attr('stroke-width', 2);

    // Create nodes
    const node = container.append('g')
      .selectAll('circle')
      .data(animationData.nodes)
      .enter()
      .append('circle')
      .attr('class', 'animation-node')
      .attr('r', 8)
      .attr('fill', d => {
        switch (d.type) {
          case OmicsType.PROTEIN: return '#CCCCFF';
          case OmicsType.METABOLITE: return '#FF7F50';
          case OmicsType.mRNA: return '#9FE2BF';
          case OmicsType.LIPID: return '#DFFF00';
          default: return '#888888';
        }
      })
      .attr('stroke', isDarkMode ? '#ffffff' : '#000000')
      .attr('stroke-width', 1);

    // Create labels
    const label = container.append('g')
      .selectAll('text')
      .data(animationData.nodes)
      .enter()
      .append('text')
      .attr('class', 'animation-label')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('font-size', '10px')
      .attr('fill', isDarkMode ? '#ffffff' : '#000000')
      .text(d => d.name.substring(0, 8));

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x!)
        .attr('y1', d => d.source.y!)
        .attr('x2', d => d.target.x!)
        .attr('y2', d => d.target.y!);

      node
        .attr('cx', d => d.x!)
        .attr('cy', d => d.y!);

      label
        .attr('x', d => d.x!)
        .attr('y', d => d.y!);
    });

    // Animation update function
    const updateAnimation = () => {
      // Reset all nodes to initial state
      animationData.nodes.forEach(nodeData => {
        nodeData.animationState = 'initial';
      });

      // Step 1: Mark directly perturbed nodes (drug targets)
      animationData.nodes.forEach(nodeData => {
        if (nodeData.originalEffect && nodeData.originalEffect > 0) {
          const timeSincePerturbation = currentTime - nodeData.perturbationTime!;
          
          if (timeSincePerturbation >= 0 && timeSincePerturbation < 2) {
            nodeData.animationState = 'perturbed';
          }
        }
      });

      // Step 2: Propagate effects through network connections
      const maxPropagationWaves = 4;
      const waveInterval = 1.5; // seconds between waves
      
      for (let wave = 1; wave <= maxPropagationWaves; wave++) {
        const waveTime = wave * waveInterval;
        
        if (currentTime >= waveTime) {
          // Create a set to track nodes that should be affected in this wave
          const nodesToPropagate = new Set<AnimationNode>();
          
          // Find nodes that should be affected by this wave
          animationData.links.forEach(linkData => {
            const sourceNode = linkData.source;
            const targetNode = linkData.target;
            
            // Propagate from perturbed/propagating nodes to initial nodes
            if ((sourceNode.animationState === 'perturbed' || sourceNode.animationState === 'propagating') 
                && targetNode.animationState === 'initial') {
              
              // Add deterministic propagation with some randomness based on node properties
              const propagationChance = 0.8 - (wave * 0.1); // Decreasing chance with each wave
              const nodeHash = targetNode.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
              if ((nodeHash % 100) / 100 < propagationChance) {
                nodesToPropagate.add(targetNode);
              }
            }
            
            // Bidirectional propagation
            if ((targetNode.animationState === 'perturbed' || targetNode.animationState === 'propagating') 
                && sourceNode.animationState === 'initial') {
              
              const propagationChance = 0.8 - (wave * 0.1);
              const nodeHash = sourceNode.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
              if ((nodeHash % 100) / 100 < propagationChance) {
                nodesToPropagate.add(sourceNode);
              }
            }
          });
          
          // Apply propagation to selected nodes
          nodesToPropagate.forEach(node => {
            node.animationState = 'propagating';
            node.perturbationTime = currentTime;
          });
        }
      }

      // Step 3: Transition nodes to stable state after propagation
      animationData.nodes.forEach(nodeData => {
        if (nodeData.animationState === 'propagating' && nodeData.perturbationTime) {
          const timeSincePropagation = currentTime - nodeData.perturbationTime;
          if (timeSincePropagation > 3) {
            nodeData.animationState = 'stable';
          }
        }
        
        // Original perturbed nodes also eventually stabilize
        if (nodeData.originalEffect && nodeData.originalEffect > 0) {
          const timeSincePerturbation = currentTime - nodeData.perturbationTime!;
          if (timeSincePerturbation > 5) {
            nodeData.animationState = 'stable';
          }
        }
      });

      // Update link states and create dynamic topology
      const activeNodes = new Set<string>();
      const dynamicLinks: AnimationLink[] = [];
      
      // Collect all active nodes
      animationData.nodes.forEach(nodeData => {
        if (nodeData.animationState !== 'initial') {
          activeNodes.add(nodeData.id);
        }
      });

      // Update existing link states
      animationData.links.forEach(linkData => {
        const sourceActive = activeNodes.has(linkData.source.id);
        const targetActive = activeNodes.has(linkData.target.id);
        
        if (sourceActive && targetActive) {
          linkData.animationState = 'active';
        } else if (sourceActive || targetActive) {
          linkData.animationState = 'transmitting';
        } else {
          linkData.animationState = 'inactive';
        }
      });

      // Create new dynamic connections between active nodes
      const activeNodesList = Array.from(activeNodes).map(id => 
        animationData.nodes.find(n => n.id === id)!
      ).filter(Boolean);

      for (let i = 0; i < activeNodesList.length; i++) {
        for (let j = i + 1; j < activeNodesList.length; j++) {
          const source = activeNodesList[i];
          const target = activeNodesList[j];
          
          // Create connections based on pathway similarity and proximity
          const samePathway = source.pathway === target.pathway;
          const distance = Math.sqrt(
            Math.pow((source.x || 0) - (target.x || 0), 2) + 
            Math.pow((source.y || 0) - (target.y || 0), 2)
          );
          
          if (samePathway || (distance < 100 && Math.random() < 0.3)) {
            // Check if this connection doesn't already exist
            const existingLink = animationData.links.find(l => 
              (l.source.id === source.id && l.target.id === target.id) ||
              (l.source.id === target.id && l.target.id === source.id)
            );
            
            if (!existingLink) {
              dynamicLinks.push({
                source,
                target,
                strength: 0.5,
                type: 'interaction' as const,
                animationState: 'active'
              });
            }
          }
        }
      }

      // Update visual states with enhanced effects
      node
        .transition()
        .duration(200)
        .attr('r', d => {
          switch (d.animationState) {
            case 'perturbed': return 15;
            case 'propagating': return 12;
            case 'stable': return 10;
            default: return 6;
          }
        })
        .attr('fill', d => {
          switch (d.animationState) {
            case 'perturbed': return '#FF1744'; // Bright red
            case 'propagating': return '#FF9800'; // Orange
            case 'stable': return '#4CAF50'; // Green
            default: return isDarkMode ? '#666666' : '#CCCCCC'; // Gray
          }
        })
        .attr('stroke', d => {
          return d.animationState !== 'initial' ? '#FFFFFF' : 'none';
        })
        .attr('stroke-width', d => {
          switch (d.animationState) {
            case 'perturbed': return 4;
            case 'propagating': return 3;
            case 'stable': return 2;
            default: return 0;
          }
        });

      // Update existing links
      link
        .transition()
        .duration(200)
        .attr('stroke', d => {
          switch (d.animationState) {
            case 'active': return '#FF1744';
            case 'transmitting': return '#FF9800';
            default: return isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
          }
        })
        .attr('stroke-width', d => {
          switch (d.animationState) {
            case 'active': return 5;
            case 'transmitting': return 3;
            default: return 1;
          }
        })
        .attr('opacity', d => {
          switch (d.animationState) {
            case 'active': return 1.0;
            case 'transmitting': return 0.7;
            default: return 0.1;
          }
        });

      // Add dynamic links
      const dynamicLinkSelection = svg.selectAll('.dynamic-link')
        .data(dynamicLinks, (d: any) => `${d.source.id}-${d.target.id}`);

      dynamicLinkSelection.enter()
        .append('line')
        .attr('class', 'dynamic-link')
        .attr('x1', d => d.source.x || 0)
        .attr('y1', d => d.source.y || 0)
        .attr('x2', d => d.target.x || 0)
        .attr('y2', d => d.target.y || 0)
        .attr('stroke', '#FF1744')
        .attr('stroke-width', 3)
        .attr('opacity', 0)
        .style('stroke-dasharray', '5,5')
        .transition()
        .duration(500)
        .attr('opacity', 0.8);

      dynamicLinkSelection
        .attr('x1', d => d.source.x || 0)
        .attr('y1', d => d.source.y || 0)
        .attr('x2', d => d.target.x || 0)
        .attr('y2', d => d.target.y || 0);

      dynamicLinkSelection.exit()
        .transition()
        .duration(300)
        .attr('opacity', 0)
        .remove();
    };

    // Update animation on time change
    updateAnimation();

  }, [animationData, currentTime, isDarkMode]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleSpeedChange = (speed: number) => {
    setAnimationSpeed(speed);
  };

  return (
    <div className="perturbation-animation-container">
      <div className="animation-controls">
        <div className="control-info">
          <h3>Perturbation Propagation Animation</h3>
          <p>Watch how drug effects propagate through the biological network over time</p>
        </div>
        
        <div className="animation-control-buttons">
          <button 
            className="control-button play-pause"
            onClick={handlePlayPause}
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>
          
          <button 
            className="control-button reset"
            onClick={handleReset}
          >
            🔄
          </button>
          
          <div className="speed-controls">
            <label>Speed:</label>
            <button 
              className={`speed-button ${animationSpeed === 0.5 ? 'active' : ''}`}
              onClick={() => handleSpeedChange(0.5)}
            >
              0.5x
            </button>
            <button 
              className={`speed-button ${animationSpeed === 1 ? 'active' : ''}`}
              onClick={() => handleSpeedChange(1)}
            >
              1x
            </button>
            <button 
              className={`speed-button ${animationSpeed === 2 ? 'active' : ''}`}
              onClick={() => handleSpeedChange(2)}
            >
              2x
            </button>
          </div>
          
          <div className="time-indicator">
            Time: {currentTime.toFixed(1)}s
          </div>
        </div>
      </div>
      
      <div className="animation-wrapper">
        <svg
          ref={svgRef}
          className="perturbation-animation"
          width="100%"
          height="600"
        />
        
        <div className="animation-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#888888' }}></div>
            <span>Initial State</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#FF4444' }}></div>
            <span>Perturbed</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#FFAA44' }}></div>
            <span>Propagating</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#44FF44' }}></div>
            <span>Stabilized</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerturbationAnimation; 