import React, { useEffect, useRef, useState, useMemo } from 'react';
import { PathwayData, OmicsType } from '../types';
import './HierarchicalNetwork.css';

interface HierarchicalNetworkProps {
  data: PathwayData;
  drugData?: { [drugId: string]: PathwayData } | null;
  selectedDrugs?: Set<string>;
  isDarkMode?: boolean;
}

interface HierarchicalNode {
  id: string;
  x: number;
  y: number;
  level: number; // 0=molecular, 1=cellular, 2=tissue, 3=organ, 4=system
  size: number;
  color: [number, number, number, number]; // RGBA
  intensity: number;
  clusterId: string;
  parentId?: string;
  children?: string[];
  type: 'molecular' | 'cellular' | 'tissue' | 'organ' | 'system';
  omicsType?: OmicsType;
  pathway?: string;
  drugEffect?: number;
}

interface HierarchicalLink {
  source: string;
  target: string;
  strength: number;
  level: number;
}

const HIERARCHY_LEVELS = [
  { name: 'Molecular', color: [159, 226, 191, 1.0], baseSize: 1.0, count: 100000 },
  { name: 'Cellular', color: [204, 204, 255, 1.0], baseSize: 2.0, count: 10000 },
  { name: 'Tissue', color: [255, 159, 159, 1.0], baseSize: 4.0, count: 1000 },
  { name: 'Organ', color: [232, 102, 89, 1.0], baseSize: 6.0, count: 100 },
  { name: 'System', color: [120, 168, 212, 1.0], baseSize: 8.0, count: 10 }
];

const HierarchicalNetwork: React.FC<HierarchicalNetworkProps> = ({
  data,
  drugData,
  selectedDrugs = new Set(),
  isDarkMode = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const animationRef = useRef<number>(0);
  const [currentCondition, setCurrentCondition] = useState<'control' | string>('control');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalNodes: 0,
    totalLinks: 0,
    renderTime: 0
  });

  // Generate hierarchical data
  const hierarchicalData = useMemo(() => {
    console.log('Generating hierarchical data...');
    const nodes: HierarchicalNode[] = [];
    const links: HierarchicalLink[] = [];
    let nodeId = 0;

    // Define system-level centers (main constellation points)
    const systemCenters = [
      { x: 0.2, y: 0.3, pathway: 'Energy Metabolism' },
      { x: 0.8, y: 0.3, pathway: 'Protein Synthesis' },
      { x: 0.5, y: 0.7, pathway: 'Signal Transduction' },
      { x: 0.2, y: 0.8, pathway: 'Cell Cycle' },
      { x: 0.8, y: 0.8, pathway: 'Immune Response' }
    ];

    systemCenters.forEach((systemCenter, systemIdx) => {
      // Create system-level node
      const systemNode: HierarchicalNode = {
        id: `system-${systemIdx}`,
        x: systemCenter.x,
        y: systemCenter.y,
        level: 4,
        size: HIERARCHY_LEVELS[4].baseSize,
        color: [...HIERARCHY_LEVELS[4].color] as [number, number, number, number],
        intensity: 1.0,
        clusterId: `system-${systemIdx}`,
        type: 'system',
        pathway: systemCenter.pathway,
        children: []
      };
      nodes.push(systemNode);

      // Generate organ-level clusters around each system
      const organCount = 3 + Math.floor(Math.random() * 3);
      for (let o = 0; o < organCount; o++) {
        const angle = (o / organCount) * 2 * Math.PI;
        const distance = 0.05 + Math.random() * 0.08;
        const organNode: HierarchicalNode = {
          id: `organ-${systemIdx}-${o}`,
          x: systemCenter.x + Math.cos(angle) * distance,
          y: systemCenter.y + Math.sin(angle) * distance,
          level: 3,
          size: HIERARCHY_LEVELS[3].baseSize,
          color: [...HIERARCHY_LEVELS[3].color] as [number, number, number, number],
          intensity: 0.9,
          clusterId: `organ-${systemIdx}-${o}`,
          parentId: systemNode.id,
          type: 'organ',
          pathway: systemCenter.pathway,
          children: []
        };
        nodes.push(organNode);
        systemNode.children!.push(organNode.id);

        // Link organ to system
        links.push({
          source: systemNode.id,
          target: organNode.id,
          strength: 0.8,
          level: 3
        });

        // Generate tissue-level clusters around each organ
        const tissueCount = 5 + Math.floor(Math.random() * 5);
        for (let t = 0; t < tissueCount; t++) {
          const tissueAngle = (t / tissueCount) * 2 * Math.PI;
          const tissueDistance = 0.02 + Math.random() * 0.03;
          const tissueNode: HierarchicalNode = {
            id: `tissue-${systemIdx}-${o}-${t}`,
            x: organNode.x + Math.cos(tissueAngle) * tissueDistance,
            y: organNode.y + Math.sin(tissueAngle) * tissueDistance,
            level: 2,
            size: HIERARCHY_LEVELS[2].baseSize,
            color: [...HIERARCHY_LEVELS[2].color] as [number, number, number, number],
            intensity: 0.8,
            clusterId: `tissue-${systemIdx}-${o}-${t}`,
            parentId: organNode.id,
            type: 'tissue',
            pathway: systemCenter.pathway,
            children: []
          };
          nodes.push(tissueNode);
          organNode.children!.push(tissueNode.id);

          // Link tissue to organ
          links.push({
            source: organNode.id,
            target: tissueNode.id,
            strength: 0.7,
            level: 2
          });

          // Generate cellular-level clusters around each tissue
          const cellularCount = 20 + Math.floor(Math.random() * 30);
          for (let c = 0; c < cellularCount; c++) {
            const cellularAngle = (c / cellularCount) * 2 * Math.PI + Math.random() * 0.5;
            const cellularDistance = 0.005 + Math.random() * 0.015;
            const cellularNode: HierarchicalNode = {
              id: `cellular-${systemIdx}-${o}-${t}-${c}`,
              x: tissueNode.x + Math.cos(cellularAngle) * cellularDistance,
              y: tissueNode.y + Math.sin(cellularAngle) * cellularDistance,
              level: 1,
              size: HIERARCHY_LEVELS[1].baseSize,
              color: [...HIERARCHY_LEVELS[1].color] as [number, number, number, number],
              intensity: 0.7,
              clusterId: `cellular-${systemIdx}-${o}-${t}-${c}`,
              parentId: tissueNode.id,
              type: 'cellular',
              pathway: systemCenter.pathway,
              children: []
            };
            nodes.push(cellularNode);
            tissueNode.children!.push(cellularNode.id);

            // Link cellular to tissue
            if (Math.random() > 0.3) { // Not all cellular nodes are directly linked
              links.push({
                source: tissueNode.id,
                target: cellularNode.id,
                strength: 0.5,
                level: 1
              });
            }

            // Generate molecular-level points around each cellular cluster
            const molecularCount = 50 + Math.floor(Math.random() * 100);
            for (let m = 0; m < molecularCount; m++) {
              const molecularAngle = Math.random() * 2 * Math.PI;
              const molecularDistance = Math.random() * 0.008;
              const omicsTypes = [OmicsType.mRNA, OmicsType.PROTEIN, OmicsType.METABOLITE, OmicsType.LIPID];
              const omicsType = omicsTypes[Math.floor(Math.random() * omicsTypes.length)];
              
              const molecularNode: HierarchicalNode = {
                id: `molecular-${nodeId++}`,
                x: cellularNode.x + Math.cos(molecularAngle) * molecularDistance,
                y: cellularNode.y + Math.sin(molecularAngle) * molecularDistance,
                level: 0,
                size: HIERARCHY_LEVELS[0].baseSize,
                color: [...HIERARCHY_LEVELS[0].color] as [number, number, number, number],
                intensity: 0.6 + Math.random() * 0.4,
                clusterId: `molecular-${systemIdx}-${o}-${t}-${c}`,
                parentId: cellularNode.id,
                type: 'molecular',
                omicsType: omicsType,
                pathway: systemCenter.pathway
              };
              nodes.push(molecularNode);
              cellularNode.children!.push(molecularNode.id);

              // Occasionally link molecular to cellular
              if (Math.random() > 0.8) {
                links.push({
                  source: cellularNode.id,
                  target: molecularNode.id,
                  strength: 0.3,
                  level: 0
                });
              }
            }
          }
        }
      }
    });

    console.log(`Generated ${nodes.length} nodes and ${links.length} links`);
    return { nodes, links };
  }, [data]);

  // Apply drug effects to the data
  const processedData = useMemo(() => {
    if (currentCondition === 'control' || !drugData || selectedDrugs.size === 0) {
      return hierarchicalData;
    }

    // Apply drug effects
    const modifiedNodes = hierarchicalData.nodes.map(node => {
      let drugEffect = 0;
      
      // Calculate combined drug effects
      selectedDrugs.forEach(drugId => {
        if (drugData[drugId]) {
          // Simulate drug effects based on pathway and level
          const pathwayEffect = Math.random() - 0.5; // -0.5 to 0.5
          const levelMultiplier = [1.0, 0.8, 0.6, 0.4, 0.2][node.level]; // Stronger effects at molecular level
          drugEffect += pathwayEffect * levelMultiplier;
        }
      });

      // Modify node properties based on drug effect
      const newNode = { ...node };
      newNode.drugEffect = drugEffect;
      newNode.intensity = Math.max(0.1, Math.min(1.0, node.intensity + drugEffect));
      
      // Modify color based on drug effect
      if (Math.abs(drugEffect) > 0.1) {
        const effectColor = drugEffect > 0 ? [255, 215, 0, 1.0] : [255, 69, 0, 1.0]; // Gold for positive, red for negative
        const blendFactor = Math.min(0.5, Math.abs(drugEffect));
        newNode.color = [
          node.color[0] * (1 - blendFactor) + effectColor[0] * blendFactor,
          node.color[1] * (1 - blendFactor) + effectColor[1] * blendFactor,
          node.color[2] * (1 - blendFactor) + effectColor[2] * blendFactor,
          node.color[3]
        ] as [number, number, number, number];
      }

      return newNode;
    });

    return { nodes: modifiedNodes, links: hierarchicalData.links };
  }, [hierarchicalData, currentCondition, drugData, selectedDrugs]);

  // Initialize WebGL
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { 
      antialias: true, 
      alpha: true,
      premultipliedAlpha: false
    });
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    glRef.current = gl;

    // Set viewport
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create shader program
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute float a_size;
      attribute vec4 a_color;
      attribute float a_intensity;
      
      uniform vec2 u_resolution;
      
      varying vec4 v_color;
      varying float v_intensity;
      
      void main() {
        vec2 position = (a_position * 2.0 - 1.0);
        position.y *= -1.0;
        
        gl_Position = vec4(position, 0.0, 1.0);
        gl_PointSize = a_size;
        
        v_color = a_color / 255.0;
        v_intensity = a_intensity;
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      
      varying vec4 v_color;
      varying float v_intensity;
      
      void main() {
        vec2 center = gl_PointCoord - 0.5;
        float dist = length(center);
        
        if (dist > 0.5) {
          discard;
        }
        
        float alpha = (1.0 - dist * 2.0) * v_color.a * v_intensity;
        gl_FragColor = vec4(v_color.rgb, alpha);
      }
    `;

    const createShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      
      return shader;
    };

    const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) {
      return;
    }

    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Get attribute and uniform locations
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const sizeLocation = gl.getAttribLocation(program, 'a_size');
    const colorLocation = gl.getAttribLocation(program, 'a_color');
    const intensityLocation = gl.getAttribLocation(program, 'a_intensity');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');

    // Set up rendering state
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    // Store rendering context
    (canvas as any).webglContext = {
      gl,
      program,
      locations: {
        position: positionLocation,
        size: sizeLocation,
        color: colorLocation,
        intensity: intensityLocation,
        resolution: resolutionLocation
      }
    };

    setIsLoading(false);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Render function
  const render = (timestamp: number) => {
    const canvas = canvasRef.current;
    const context = (canvas as any)?.webglContext;
    
    if (!canvas || !context) return;

    const { gl, program, locations } = context;
    const startTime = performance.now();

    // Clear canvas
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Set resolution uniform
    gl.uniform2f(locations.resolution, canvas.width, canvas.height);

    // Prepare data arrays
    const nodes = processedData.nodes;
    const positions = new Float32Array(nodes.length * 2);
    const sizes = new Float32Array(nodes.length);
    const colors = new Float32Array(nodes.length * 4);
    const intensities = new Float32Array(nodes.length);

    nodes.forEach((node, i) => {
      positions[i * 2] = node.x;
      positions[i * 2 + 1] = node.y;
      sizes[i] = node.size;
      colors[i * 4] = node.color[0];
      colors[i * 4 + 1] = node.color[1];
      colors[i * 4 + 2] = node.color[2];
      colors[i * 4 + 3] = node.color[3];
      intensities[i] = node.intensity;
    });

    // Create and bind buffers
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(locations.position);
    gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);

    const sizeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sizes, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(locations.size);
    gl.vertexAttribPointer(locations.size, 1, gl.FLOAT, false, 0, 0);

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(locations.color);
    gl.vertexAttribPointer(locations.color, 4, gl.FLOAT, false, 0, 0);

    const intensityBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, intensityBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, intensities, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(locations.intensity);
    gl.vertexAttribPointer(locations.intensity, 1, gl.FLOAT, false, 0, 0);

    // Draw points
    gl.drawArrays(gl.POINTS, 0, nodes.length);

    // Clean up buffers
    gl.deleteBuffer(positionBuffer);
    gl.deleteBuffer(sizeBuffer);
    gl.deleteBuffer(colorBuffer);
    gl.deleteBuffer(intensityBuffer);

    const renderTime = performance.now() - startTime;
    setStats({
      totalNodes: nodes.length,
      totalLinks: processedData.links.length,
      renderTime: Math.round(renderTime * 100) / 100
    });

    // Continue animation loop
    animationRef.current = requestAnimationFrame(render);
  };

  // Start rendering when data is ready
  useEffect(() => {
    if (!isLoading && processedData.nodes.length > 0) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      animationRef.current = requestAnimationFrame(render);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [processedData, isLoading]);

  const availableConditions = ['control', ...Array.from(selectedDrugs)];

  if (isLoading) {
    return (
      <div className="hierarchical-network-container">
        <div className="hierarchical-loading">
          Generating hierarchical network...
        </div>
      </div>
    );
  }

  return (
    <div className="hierarchical-network-container">
      <div className="hierarchical-controls">
        <div className="control-info">
          <h3>Hierarchical Network Constellation</h3>
          <p>
            Multi-scale biological organization from molecular components to system-level emergent properties. 
            {stats.totalNodes.toLocaleString()} nodes rendered with WebGL acceleration.
          </p>
        </div>
      </div>

      <div className="hierarchical-wrapper">
        <canvas 
          ref={canvasRef}
          className="hierarchical-network webgl-canvas"
        />

        {/* Legend */}
        <div className="hierarchy-legend">
          {HIERARCHY_LEVELS.map((level, index) => (
            <div key={level.name} className="legend-item">
              <div 
                className="legend-color" 
                style={{ 
                  backgroundColor: `rgba(${level.color[0]}, ${level.color[1]}, ${level.color[2]}, ${level.color[3]})` 
                }}
              />
              <span>{level.name}</span>
            </div>
          ))}
        </div>

        {/* Condition Toggle */}
        {availableConditions.length > 1 && (
          <div className="condition-toggle">
            {availableConditions.map(condition => (
              <button
                key={condition}
                className={`condition-button ${currentCondition === condition ? 'active' : ''}`}
                onClick={() => setCurrentCondition(condition)}
              >
                {condition}
              </button>
            ))}
          </div>
        )}

        {/* Stats Overlay */}
        <div className="stats-overlay">
          <div className="stat-line">Nodes: {stats.totalNodes.toLocaleString()}</div>
          <div className="stat-line">Links: {stats.totalLinks.toLocaleString()}</div>
          <div className="stat-line">Render: {stats.renderTime}ms</div>
          <div className="stat-line">FPS: {Math.round(1000 / Math.max(stats.renderTime, 1))}</div>
        </div>
      </div>
    </div>
  );
};

export default HierarchicalNetwork; 