import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { PathwayData, OmicsType } from '../types';
import './ConfidenceHeatmap.css';

interface ConfidenceHeatmapProps {
  data: PathwayData;
  drugData?: { [drugId: string]: PathwayData } | null;
  selectedDrugs?: Set<string>;
  isDarkMode?: boolean;
}

interface HeatmapCell {
  pathway: string;
  omicsType: OmicsType;
  confidence: number;
  nodeCount: number;
  avgExpression: number;
  drugEffect?: number;
}

const ConfidenceHeatmap: React.FC<ConfidenceHeatmapProps> = ({
  data,
  drugData,
  selectedDrugs = new Set(),
  isDarkMode = false
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Process data into heatmap format
  const heatmapData = useMemo(() => {
    const pathways = Array.from(new Set(data.nodes.map(n => n.pathway)));
    const omicsTypes = Object.values(OmicsType);
    
    const cells: HeatmapCell[] = [];
    
    pathways.forEach(pathway => {
      omicsTypes.forEach(omicsType => {
        const nodes = data.nodes.filter(n => n.pathway === pathway && n.type === omicsType);
        
        if (nodes.length > 0) {
          const avgConfidence = nodes.reduce((sum, n) => sum + (n.confidence || 0.5), 0) / nodes.length;
          const avgExpression = nodes.reduce((sum, n) => sum + (n.expression || 0.5), 0) / nodes.length;
          
          // Calculate drug effect if applicable
          let drugEffect = 0;
          if (drugData && selectedDrugs.size > 0) {
            let totalEffect = 0;
            let effectCount = 0;
            
            selectedDrugs.forEach(drugId => {
              const drugNodes = drugData[drugId]?.nodes.filter(n => 
                n.pathway === pathway && n.type === omicsType
              );
              if (drugNodes && drugNodes.length > 0) {
                const avgFoldChange = drugNodes.reduce((sum, n) => sum + (n.foldChange || 1), 0) / drugNodes.length;
                totalEffect += Math.abs(avgFoldChange - 1);
                effectCount++;
              }
            });
            
            if (effectCount > 0) {
              drugEffect = totalEffect / effectCount;
            }
          }
          
          cells.push({
            pathway,
            omicsType,
            confidence: avgConfidence,
            nodeCount: nodes.length,
            avgExpression,
            drugEffect
          });
        }
      });
    });
    
    return cells;
  }, [data, drugData, selectedDrugs]);

  useEffect(() => {
    if (!svgRef.current || heatmapData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Dimensions and margins
    const containerWidth = svgRef.current.clientWidth;
    const containerHeight = svgRef.current.clientHeight;
    const margin = { top: 80, right: 120, bottom: 100, left: 150 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    // Create main group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Get unique pathways and omics types
    const pathways = Array.from(new Set(heatmapData.map(d => d.pathway)));
    const omicsTypes = Object.values(OmicsType);

    // Create scales
    const xScale = d3.scaleBand()
      .domain(pathways)
      .range([0, width])
      .padding(0.05);

    const yScale = d3.scaleBand()
      .domain(omicsTypes)
      .range([0, height])
      .padding(0.05);

    // Color scales
    const confidenceColorScale = d3.scaleSequential(d3.interpolateViridis)
      .domain([0, 1]);

    const drugEffectColorScale = d3.scaleSequential(d3.interpolateRdYlBu)
      .domain([0, Math.max(0.5, d3.max(heatmapData, d => d.drugEffect || 0) || 0.5)]);

    // Create cells
    const cells = g.selectAll('.heatmap-cell')
      .data(heatmapData)
      .enter()
      .append('rect')
      .attr('class', 'heatmap-cell')
      .attr('x', d => xScale(d.pathway) || 0)
      .attr('y', d => yScale(d.omicsType) || 0)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => {
        if (selectedDrugs.size > 0 && d.drugEffect !== undefined) {
          return drugEffectColorScale(d.drugEffect);
        }
        return confidenceColorScale(d.confidence);
      })
      .attr('stroke', isDarkMode ? '#ffffff' : '#000000')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.8)
      .style('cursor', 'pointer');

    // Add cell values as text
    g.selectAll('.cell-text')
      .data(heatmapData)
      .enter()
      .append('text')
      .attr('class', 'cell-text')
      .attr('x', d => (xScale(d.pathway) || 0) + xScale.bandwidth() / 2)
      .attr('y', d => (yScale(d.omicsType) || 0) + yScale.bandwidth() / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', isDarkMode ? '#ffffff' : '#000000')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .text(d => {
        if (selectedDrugs.size > 0 && d.drugEffect !== undefined) {
          return `${(d.drugEffect * 100).toFixed(0)}%`;
        }
        return `${(d.confidence * 100).toFixed(0)}%`;
      });

    // Add x-axis
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('fill', isDarkMode ? '#ffffff' : '#000000')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)')
      .style('font-size', '12px');

    // Add y-axis
    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .attr('fill', isDarkMode ? '#ffffff' : '#000000')
      .style('font-size', '12px');

    // Add title
    svg.append('text')
      .attr('class', 'heatmap-title')
      .attr('x', containerWidth / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('fill', isDarkMode ? '#ffffff' : '#000000')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .text(selectedDrugs.size > 0 ? 'Drug Effect Intensity Heatmap' : 'Prediction Confidence Heatmap');

    // Add color legend
    const legendWidth = 200;
    const legendHeight = 10;
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${containerWidth - margin.right + 20}, ${margin.top})`);

    const legendScale = d3.scaleLinear()
      .domain(selectedDrugs.size > 0 ? [0, d3.max(heatmapData, d => d.drugEffect || 0) || 0.5] : [0, 1])
      .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)
      .tickFormat(d => `${(+d * 100).toFixed(0)}%`);

    // Create gradient for legend
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'legend-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%')
      .attr('y1', '0%')
      .attr('y2', '0%');

    if (selectedDrugs.size > 0) {
      const steps = 10;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        gradient.append('stop')
          .attr('offset', `${t * 100}%`)
          .attr('stop-color', drugEffectColorScale(t * (d3.max(heatmapData, d => d.drugEffect || 0) || 0.5)));
      }
    } else {
      const steps = 10;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        gradient.append('stop')
          .attr('offset', `${t * 100}%`)
          .attr('stop-color', confidenceColorScale(t));
      }
    }

    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('fill', 'url(#legend-gradient)')
      .attr('stroke', isDarkMode ? '#ffffff' : '#000000')
      .attr('stroke-width', 1);

    legend.append('g')
      .attr('transform', `translate(0, ${legendHeight})`)
      .call(legendAxis)
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
      .text(selectedDrugs.size > 0 ? 'Drug Effect' : 'Confidence');

    // Add tooltip interactions
    cells
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('opacity', 1)
          .attr('stroke-width', 2);

        if (tooltipRef.current) {
          const tooltip = d3.select(tooltipRef.current);
          tooltip.style('opacity', 1)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .html(`
              <strong>${d.pathway}</strong><br/>
              <strong>${d.omicsType}</strong><br/>
              Nodes: ${d.nodeCount}<br/>
              Confidence: ${(d.confidence * 100).toFixed(1)}%<br/>
              Expression: ${(d.avgExpression * 100).toFixed(1)}%
              ${selectedDrugs.size > 0 && d.drugEffect !== undefined ? 
                `<br/>Drug Effect: ${(d.drugEffect * 100).toFixed(1)}%` : ''}
            `);
        }
      })
      .on('mousemove', function(event) {
        if (tooltipRef.current) {
          d3.select(tooltipRef.current)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        }
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('opacity', 0.8)
          .attr('stroke-width', 0.5);

        if (tooltipRef.current) {
          d3.select(tooltipRef.current).style('opacity', 0);
        }
      });

  }, [heatmapData, isDarkMode, selectedDrugs]);

  return (
    <div className="confidence-heatmap-container">
      <div className="heatmap-controls">
        <div className="control-info">
          <h3>
            {selectedDrugs.size > 0 
              ? `Drug Effect Analysis (${selectedDrugs.size} drugs selected)`
              : 'Prediction Confidence Analysis'
            }
          </h3>
          <p>
            {selectedDrugs.size > 0 
              ? 'Intensity of drug effects across pathways and omics types'
              : 'Model confidence in predictions across biological pathways and data types'
            }
          </p>
        </div>
      </div>
      
      <div className="heatmap-wrapper">
        <svg
          ref={svgRef}
          className="confidence-heatmap"
          width="100%"
          height="600"
        />
        
        <div
          ref={tooltipRef}
          className="heatmap-tooltip"
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

export default ConfidenceHeatmap; 