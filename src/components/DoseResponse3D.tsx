import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { PathwayData } from '../types';
import './DoseResponse3D.css';

interface DoseResponse3DProps {
  data: PathwayData;
  drugData?: { [drugId: string]: PathwayData } | null;
  selectedDrugs?: Set<string>;
  isDarkMode?: boolean;
}

interface DoseResponsePoint {
  dose: number;
  time: number;
  response: number;
  pathway: string;
  drug: string;
}

const DoseResponse3D: React.FC<DoseResponse3DProps> = ({
  data,
  drugData,
  selectedDrugs = new Set(),
  isDarkMode = false
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Generate synthetic dose-response data
  const doseResponseData = useMemo(() => {
    const doses = [0.1, 0.5, 1.0, 2.0, 5.0, 10.0]; // μM concentrations
    const timePoints = [10, 30, 90, 2880]; // minutes (48h = 2880 min)
    const pathways = ['Inflammation', 'Antioxidant Defense', 'Circadian Clock'];
    
    const points: DoseResponsePoint[] = [];

    // Use selected drugs if available, otherwise demo drugs
    const drugsToShow = (drugData && selectedDrugs.size > 0) 
      ? Array.from(selectedDrugs) 
      : ['ketamine', 'propofol', 'etomidate'];

    drugsToShow.forEach(drugId => {
      pathways.forEach(pathway => {
        doses.forEach(dose => {
          timePoints.forEach(time => {
            // Generate synthetic dose-response curves
            let maxEffect = 0.8 + Math.random() * 0.4; // 0.8-1.2 max effect
            let ec50 = 1.0 + Math.random() * 2.0; // EC50 between 1-3 μM
            const hillCoeff = 1.5 + Math.random() * 1.0; // Hill coefficient 1.5-2.5
            
            // Drug-specific characteristics for demo
            if (!drugData || selectedDrugs.size === 0) {
              if (drugId === 'ketamine') {
                if (pathway === 'Inflammation') maxEffect *= 1.3;
                ec50 *= 0.8; // More potent
              } else if (drugId === 'propofol') {
                if (pathway === 'Antioxidant Defense') maxEffect *= 1.2;
                ec50 *= 1.2; // Less potent
              } else if (drugId === 'etomidate') {
                if (pathway === 'Circadian Clock') maxEffect *= 1.4;
                ec50 *= 0.9;
              }
            }
            
            // Time-dependent decay
            const timeDecay = Math.exp(-time / (1000 + Math.random() * 1000));
            
            // Dose-response curve (Hill equation)
            const response = maxEffect * Math.pow(dose, hillCoeff) / 
              (Math.pow(ec50, hillCoeff) + Math.pow(dose, hillCoeff)) * timeDecay;
            
            points.push({
              dose,
              time,
              response,
              pathway,
              drug: drugId
            });
          });
        });
      });
    });

    return points;
  }, [drugData, selectedDrugs]);

  useEffect(() => {
    if (!svgRef.current || doseResponseData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const containerWidth = svgRef.current.clientWidth;
    const containerHeight = svgRef.current.clientHeight;
    const margin = { top: 60, right: 120, bottom: 80, left: 80 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Create 3D projection parameters
    const angleX = Math.PI / 6; // 30 degrees
    const angleY = Math.PI / 4; // 45 degrees
    
    // 3D to 2D projection function
    const project3D = (x: number, y: number, z: number) => {
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      
      return {
        x: x * cosY + z * sinY,
        y: y * cosX - (x * sinY - z * cosY) * sinX
      };
    };

    // Scales
    const xScale = d3.scaleLog()
      .domain(d3.extent(doseResponseData, d => d.dose) as [number, number])
      .range([0, width * 0.6]);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(doseResponseData, d => d.time) as [number, number])
      .range([0, height * 0.6]);

    const zScale = d3.scaleLinear()
      .domain([0, d3.max(doseResponseData, d => d.response) || 1])
      .range([0, height * 0.4]);

    // Color scale
    const colorScale = d3.scaleSequential(d3.interpolateViridis)
      .domain([0, d3.max(doseResponseData, d => d.response) || 1]);

    // Drug colors
    const drugColors = {
      'ketamine': '#FFBF00',
      'etomidate': '#40E0D0',
      'propofol': '#DE3163',
      'novel1': '#6495ED',
      'novel2': '#77B254'
    };

    // Group data by drug and pathway
    const groupedData = d3.groups(doseResponseData, d => d.drug, d => d.pathway);

    // Draw 3D surface for each drug-pathway combination
    groupedData.forEach(([drugId, pathwayGroups]) => {
      pathwayGroups.forEach(([pathway, points], pathwayIndex) => {
        // Create surface mesh
        const doses = Array.from(new Set(points.map(p => p.dose))).sort((a, b) => a - b);
        const times = Array.from(new Set(points.map(p => p.time))).sort((a, b) => a - b);
        
        // Draw surface patches
        for (let i = 0; i < doses.length - 1; i++) {
          for (let j = 0; j < times.length - 1; j++) {
            const corners = [
              points.find(p => p.dose === doses[i] && p.time === times[j]),
              points.find(p => p.dose === doses[i + 1] && p.time === times[j]),
              points.find(p => p.dose === doses[i + 1] && p.time === times[j + 1]),
              points.find(p => p.dose === doses[i] && p.time === times[j + 1])
            ].filter(Boolean) as DoseResponsePoint[];

            if (corners.length === 4) {
              const projectedCorners = corners.map(corner => {
                const x3d = xScale(corner.dose);
                const y3d = yScale(corner.time);
                const z3d = zScale(corner.response);
                const projected = project3D(x3d, y3d, z3d);
                return {
                  x: projected.x + pathwayIndex * width * 0.3,
                  y: projected.y + height * 0.1,
                  response: corner.response
                };
              });

              // Calculate average response for coloring
              const avgResponse = corners.reduce((sum, c) => sum + c.response, 0) / corners.length;

              // Create path for surface patch
              const pathData = `M${projectedCorners[0].x},${projectedCorners[0].y}` +
                `L${projectedCorners[1].x},${projectedCorners[1].y}` +
                `L${projectedCorners[2].x},${projectedCorners[2].y}` +
                `L${projectedCorners[3].x},${projectedCorners[3].y}Z`;

              g.append('path')
                .attr('d', pathData)
                .attr('fill', colorScale(avgResponse))
                .attr('stroke', drugColors[drugId as keyof typeof drugColors] || '#888888')
                .attr('stroke-width', 0.5)
                .attr('opacity', 0.7)
                .style('cursor', 'pointer')
                .on('mouseover', function(event) {
                  if (tooltipRef.current) {
                    d3.select(tooltipRef.current)
                      .style('opacity', 1)
                      .style('left', (event.pageX + 10) + 'px')
                      .style('top', (event.pageY - 10) + 'px')
                      .html(`
                        <strong>${drugId.toUpperCase()}</strong><br/>
                        <strong>${pathway}</strong><br/>
                        Response: ${avgResponse.toFixed(3)}
                      `);
                  }
                })
                .on('mouseout', function() {
                  if (tooltipRef.current) {
                    d3.select(tooltipRef.current).style('opacity', 0);
                  }
                });
            }
          }
        }

        // Draw data points
        points.forEach(point => {
          const x3d = xScale(point.dose);
          const y3d = yScale(point.time);
          const z3d = zScale(point.response);
          const projected = project3D(x3d, y3d, z3d);
          
          g.append('circle')
            .attr('cx', projected.x + pathwayIndex * width * 0.3)
            .attr('cy', projected.y + height * 0.1)
            .attr('r', 2)
            .attr('fill', drugColors[drugId as keyof typeof drugColors] || '#888888')
            .attr('stroke', isDarkMode ? '#ffffff' : '#000000')
            .attr('stroke-width', 0.5)
            .style('cursor', 'pointer')
            .on('mouseover', function(event) {
              if (tooltipRef.current) {
                d3.select(tooltipRef.current)
                  .style('opacity', 1)
                  .style('left', (event.pageX + 10) + 'px')
                  .style('top', (event.pageY - 10) + 'px')
                  .html(`
                    <strong>${drugId.toUpperCase()}</strong><br/>
                    <strong>${pathway}</strong><br/>
                    Dose: ${point.dose} μM<br/>
                    Time: ${point.time} min<br/>
                    Response: ${point.response.toFixed(3)}
                  `);
              }
            })
            .on('mouseout', function() {
              if (tooltipRef.current) {
                d3.select(tooltipRef.current).style('opacity', 0);
              }
            });
        });

        // Add pathway label
        g.append('text')
          .attr('x', pathwayIndex * width * 0.3 + width * 0.15)
          .attr('y', height * 0.05)
          .attr('text-anchor', 'middle')
          .attr('fill', isDarkMode ? '#ffffff' : '#000000')
          .style('font-size', '14px')
          .style('font-weight', 'bold')
          .text(pathway);
      });
    });

    // Add axes (simplified 3D axes)
    const axisLength = Math.min(width, height) * 0.2;
    const axisOrigin = { x: width * 0.1, y: height * 0.9 };

    // X-axis (Dose)
    const xAxisEnd = project3D(axisLength, 0, 0);
    g.append('line')
      .attr('x1', axisOrigin.x)
      .attr('y1', axisOrigin.y)
      .attr('x2', axisOrigin.x + xAxisEnd.x)
      .attr('y2', axisOrigin.y + xAxisEnd.y)
      .attr('stroke', isDarkMode ? '#ffffff' : '#000000')
      .attr('stroke-width', 2);
    
    g.append('text')
      .attr('x', axisOrigin.x + xAxisEnd.x + 10)
      .attr('y', axisOrigin.y + xAxisEnd.y)
      .attr('fill', isDarkMode ? '#ffffff' : '#000000')
      .style('font-size', '12px')
      .text('Dose (μM)');

    // Y-axis (Time)
    const yAxisEnd = project3D(0, axisLength, 0);
    g.append('line')
      .attr('x1', axisOrigin.x)
      .attr('y1', axisOrigin.y)
      .attr('x2', axisOrigin.x + yAxisEnd.x)
      .attr('y2', axisOrigin.y + yAxisEnd.y)
      .attr('stroke', isDarkMode ? '#ffffff' : '#000000')
      .attr('stroke-width', 2);
    
    g.append('text')
      .attr('x', axisOrigin.x + yAxisEnd.x + 10)
      .attr('y', axisOrigin.y + yAxisEnd.y)
      .attr('fill', isDarkMode ? '#ffffff' : '#000000')
      .style('font-size', '12px')
      .text('Time (min)');

    // Z-axis (Response)
    const zAxisEnd = project3D(0, 0, axisLength);
    g.append('line')
      .attr('x1', axisOrigin.x)
      .attr('y1', axisOrigin.y)
      .attr('x2', axisOrigin.x + zAxisEnd.x)
      .attr('y2', axisOrigin.y + zAxisEnd.y)
      .attr('stroke', isDarkMode ? '#ffffff' : '#000000')
      .attr('stroke-width', 2);
    
    g.append('text')
      .attr('x', axisOrigin.x + zAxisEnd.x + 10)
      .attr('y', axisOrigin.y + zAxisEnd.y)
      .attr('fill', isDarkMode ? '#ffffff' : '#000000')
      .style('font-size', '12px')
      .text('Response');

    // Add title
    svg.append('text')
      .attr('class', 'dose-response-title')
      .attr('x', containerWidth / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('fill', isDarkMode ? '#ffffff' : '#000000')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .text('3D Dose-Response Surfaces');

    // Add color scale legend
    const legendWidth = 200;
    const legendHeight = 10;
    const legend = svg.append('g')
      .attr('class', 'dose-response-legend')
      .attr('transform', `translate(${containerWidth - margin.right + 20}, ${margin.top})`);

    const legendScale = d3.scaleLinear()
      .domain([0, d3.max(doseResponseData, d => d.response) || 1])
      .range([0, legendWidth]);

    // Create gradient
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'dose-response-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%');

    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      gradient.append('stop')
        .attr('offset', `${t * 100}%`)
        .attr('stop-color', colorScale(t));
    }

    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('fill', 'url(#dose-response-gradient)')
      .attr('stroke', isDarkMode ? '#ffffff' : '#000000')
      .attr('stroke-width', 1);

    legend.append('g')
      .attr('transform', `translate(0, ${legendHeight})`)
      .call(d3.axisBottom(legendScale).ticks(5))
      .selectAll('text')
      .attr('fill', isDarkMode ? '#ffffff' : '#000000')
      .style('font-size', '10px');

    legend.append('text')
      .attr('x', legendWidth / 2)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .attr('fill', isDarkMode ? '#ffffff' : '#000000')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('Response Intensity');

  }, [doseResponseData, isDarkMode]);

  return (
    <div className="dose-response-3d-container">
      <div className="dose-response-controls">
        <div className="control-info">
          <h3>3D Dose-Response Surfaces</h3>
          <p>Explore dose-response relationships across time and concentration gradients</p>
        </div>
      </div>
      
      <div className="dose-response-wrapper">
        <svg
          ref={svgRef}
          className="dose-response-3d"
          width="100%"
          height="600"
        />
        
        <div
          ref={tooltipRef}
          className="dose-response-tooltip"
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

export default DoseResponse3D; 