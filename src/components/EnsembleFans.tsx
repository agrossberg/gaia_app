import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { PathwayData, OmicsType } from '../types';
import './EnsembleFans.css';

interface EnsembleFansProps {
  data: PathwayData;
  drugData?: { [drugId: string]: PathwayData } | null;
  selectedDrugs?: Set<string>;
  isDarkMode?: boolean;
}

interface EnsembleDataPoint {
  pathway: string;
  timepoint: string;
  mean: number;
  confidence: number;
  upperBound: number;
  lowerBound: number;
  uncertainty: number;
  drug?: string;
}

const EnsembleFans: React.FC<EnsembleFansProps> = ({
  data,
  drugData,
  selectedDrugs = new Set(),
  isDarkMode = false
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Process data for ensemble visualization
  const ensembleData = useMemo(() => {
    const pathways = Array.from(new Set(data.nodes.map(n => n.pathway)));
    const timepoints = ['10 min', '30 min', '90 min', '48 hours'];
    
    const ensemblePoints: EnsembleDataPoint[] = [];

    // Generate baseline ensemble data
    pathways.forEach(pathway => {
      timepoints.forEach(timepoint => {
        const pathwayNodes = data.nodes.filter(n => 
          n.pathway === pathway && (n as any).timepoint === timepoint
        );
        
        if (pathwayNodes.length > 0) {
          const meanExpression = pathwayNodes.reduce((sum, n) => sum + (n.expression || 0.5), 0) / pathwayNodes.length;
          const meanConfidence = pathwayNodes.reduce((sum, n) => sum + (n.confidence || 0.5), 0) / pathwayNodes.length;
          
          // Calculate uncertainty based on variance in the data
          const variance = pathwayNodes.reduce((sum, n) => 
            sum + Math.pow((n.expression || 0.5) - meanExpression, 2), 0
          ) / pathwayNodes.length;
          const uncertainty = Math.sqrt(variance);
          
          ensemblePoints.push({
            pathway,
            timepoint,
            mean: meanExpression,
            confidence: meanConfidence,
            upperBound: Math.min(1, meanExpression + uncertainty * 2),
            lowerBound: Math.max(0, meanExpression - uncertainty * 2),
            uncertainty
          });
        }
      });
    });

    // Add drug ensemble data if available
    if (drugData && selectedDrugs.size > 0) {
      selectedDrugs.forEach(drugId => {
        if (drugData[drugId]) {
          pathways.forEach(pathway => {
            timepoints.forEach(timepoint => {
              const drugNodes = drugData[drugId].nodes.filter(n => 
                n.pathway === pathway && (n as any).timepoint === timepoint
              );
              
              if (drugNodes.length > 0) {
                const meanFoldChange = drugNodes.reduce((sum, n) => sum + (n.foldChange || 1), 0) / drugNodes.length;
                const meanConfidence = drugNodes.reduce((sum, n) => sum + (n.confidence || 0.5), 0) / drugNodes.length;
                
                // Calculate drug-specific uncertainty
                const variance = drugNodes.reduce((sum, n) => 
                  sum + Math.pow((n.foldChange || 1) - meanFoldChange, 2), 0
                ) / drugNodes.length;
                const uncertainty = Math.sqrt(variance);
                
                ensemblePoints.push({
                  pathway,
                  timepoint,
                  mean: meanFoldChange,
                  confidence: meanConfidence,
                  upperBound: meanFoldChange + uncertainty * 2,
                  lowerBound: meanFoldChange - uncertainty * 2,
                  uncertainty,
                  drug: drugId
                });
              }
            });
          });
        }
      });
    }

    return ensemblePoints;
  }, [data, drugData, selectedDrugs]);

  useEffect(() => {
    if (!svgRef.current || ensembleData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const containerWidth = svgRef.current.clientWidth;
    const containerHeight = svgRef.current.clientHeight;
    const margin = { top: 60, right: 120, bottom: 80, left: 80 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Get unique pathways and timepoints
    const pathways = Array.from(new Set(ensembleData.map(d => d.pathway)));
    const timepoints = ['10 min', '30 min', '90 min', '48 hours'];

    // Create scales
    const xScale = d3.scalePoint()
      .domain(timepoints)
      .range([0, width])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([
        d3.min(ensembleData, d => d.lowerBound) || 0,
        d3.max(ensembleData, d => d.upperBound) || 1
      ])
      .range([height, 0]);

    // Color scale for pathways
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
      .domain(pathways);

    // Drug colors
    const drugColors = {
      'ketamine': '#FFBF00',
      'etomidate': '#40E0D0',
      'propofol': '#DE3163',
      'novel1': '#6495ED',
      'novel2': '#77B254'
    };

    // Create line generator
    const line = d3.line<EnsembleDataPoint>()
      .x(d => xScale(d.timepoint)!)
      .y(d => yScale(d.mean))
      .curve(d3.curveMonotoneX);

    // Create area generator for confidence bands
    const area = d3.area<EnsembleDataPoint>()
      .x(d => xScale(d.timepoint)!)
      .y0(d => yScale(d.lowerBound))
      .y1(d => yScale(d.upperBound))
      .curve(d3.curveMonotoneX);

    // Group data by pathway and drug
    const groupedData = d3.groups(ensembleData, d => d.drug || 'baseline', d => d.pathway);

    // Draw confidence bands and lines for each group
    groupedData.forEach(([drugId, pathwayGroups]) => {
      pathwayGroups.forEach(([pathway, points]) => {
        const sortedPoints = points.sort((a, b) => 
          timepoints.indexOf(a.timepoint) - timepoints.indexOf(b.timepoint)
        );

        const color = drugId === 'baseline' 
          ? colorScale(pathway)
          : drugColors[drugId as keyof typeof drugColors] || '#888888';

        // Draw confidence band
        g.append('path')
          .datum(sortedPoints)
          .attr('class', `confidence-band confidence-band-${drugId}-${pathway}`)
          .attr('d', area)
          .attr('fill', color)
          .attr('fill-opacity', 0.2)
          .attr('stroke', 'none');

        // Draw mean line
        g.append('path')
          .datum(sortedPoints)
          .attr('class', `ensemble-line ensemble-line-${drugId}-${pathway}`)
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', drugId === 'baseline' ? 2 : 3)
          .attr('stroke-opacity', 0.8)
          .attr('stroke-dasharray', drugId === 'baseline' ? 'none' : '5,5');

        // Draw data points
        sortedPoints.forEach(point => {
          g.append('circle')
            .attr('class', `ensemble-point ensemble-point-${drugId}-${pathway}`)
            .attr('cx', xScale(point.timepoint)!)
            .attr('cy', yScale(point.mean))
            .attr('r', 4)
            .attr('fill', color)
            .attr('stroke', isDarkMode ? '#ffffff' : '#000000')
            .attr('stroke-width', 1)
            .style('cursor', 'pointer')
            .on('mouseover', function(event) {
              if (tooltipRef.current) {
                d3.select(tooltipRef.current)
                  .style('opacity', 1)
                  .style('left', (event.pageX + 10) + 'px')
                  .style('top', (event.pageY - 10) + 'px')
                  .html(`
                    <strong>${pathway}</strong><br/>
                    <strong>${point.timepoint}</strong><br/>
                    ${drugId !== 'baseline' ? `<strong>${drugId.toUpperCase()}</strong><br/>` : ''}
                    Mean: ${point.mean.toFixed(3)}<br/>
                    Confidence: ${(point.confidence * 100).toFixed(1)}%<br/>
                    Uncertainty: ±${point.uncertainty.toFixed(3)}
                  `);
              }
            })
            .on('mouseout', function() {
              if (tooltipRef.current) {
                d3.select(tooltipRef.current).style('opacity', 0);
              }
            });
        });
      });
    });

    // Add x-axis
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('fill', isDarkMode ? '#ffffff' : '#000000')
      .style('font-size', '12px');

    // Add y-axis
    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .attr('fill', isDarkMode ? '#ffffff' : '#000000')
      .style('font-size', '12px');

    // Add axis labels
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (height / 2))
      .attr('dy', '1em')
      .attr('text-anchor', 'middle')
      .attr('fill', isDarkMode ? '#ffffff' : '#000000')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('Expression / Fold Change');

    g.append('text')
      .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 10})`)
      .attr('text-anchor', 'middle')
      .attr('fill', isDarkMode ? '#ffffff' : '#000000')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('Time Points');

    // Add title
    svg.append('text')
      .attr('class', 'ensemble-title')
      .attr('x', containerWidth / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('fill', isDarkMode ? '#ffffff' : '#000000')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .text('Ensemble Prediction Confidence Fans');

    // Add legend
    const legend = svg.append('g')
      .attr('class', 'ensemble-legend')
      .attr('transform', `translate(${containerWidth - margin.right + 20}, ${margin.top})`);

    let legendY = 0;

    // Baseline pathways legend
    pathways.slice(0, 5).forEach((pathway, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${legendY})`);

      legendItem.append('line')
        .attr('x1', 0)
        .attr('x2', 20)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', colorScale(pathway))
        .attr('stroke-width', 2);

      legendItem.append('text')
        .attr('x', 25)
        .attr('y', 5)
        .attr('fill', isDarkMode ? '#ffffff' : '#000000')
        .style('font-size', '10px')
        .text(pathway);

      legendY += 20;
    });

    // Drug legend
    if (selectedDrugs.size > 0) {
      legendY += 10;
      
      selectedDrugs.forEach(drugId => {
        const legendItem = legend.append('g')
          .attr('transform', `translate(0, ${legendY})`);

        legendItem.append('line')
          .attr('x1', 0)
          .attr('x2', 20)
          .attr('y1', 0)
          .attr('y2', 0)
          .attr('stroke', drugColors[drugId as keyof typeof drugColors] || '#888888')
          .attr('stroke-width', 3)
          .attr('stroke-dasharray', '5,5');

        legendItem.append('text')
          .attr('x', 25)
          .attr('y', 5)
          .attr('fill', isDarkMode ? '#ffffff' : '#000000')
          .style('font-size', '10px')
          .text(drugId.toUpperCase());

        legendY += 20;
      });
    }

  }, [ensembleData, isDarkMode, selectedDrugs]);

  return (
    <div className="ensemble-fans-container">
      <div className="ensemble-controls">
        <div className="control-info">
          <h3>Ensemble Prediction Confidence Fans</h3>
          <p>Uncertainty visualization showing prediction confidence bands over time</p>
        </div>
      </div>
      
      <div className="ensemble-wrapper">
        <svg
          ref={svgRef}
          className="ensemble-fans"
          width="100%"
          height="600"
        />
        
        <div
          ref={tooltipRef}
          className="ensemble-tooltip"
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

export default EnsembleFans; 