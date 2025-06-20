import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { PathwayData, OmicsType } from '../types';
import './RadarChart.css';

interface RadarChartProps {
  data: PathwayData;
  drugData?: { [drugId: string]: PathwayData } | null;
  selectedDrugs?: Set<string>;
  isDarkMode?: boolean;
}

interface RadarDataPoint {
  axis: string;
  value: number;
  maxValue: number;
  drug: string;
}

const RadarChart: React.FC<RadarChartProps> = ({
  data,
  drugData,
  selectedDrugs = new Set(),
  isDarkMode = false
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Process data for radar chart
  const radarData = useMemo(() => {
    // Use the same categories as the pathway visualization
    const axes = [
      'Energy Metabolism',
      'Immune Response',
      'Oxidative Stress', 
      'Circadian Rhythm',
      'Blood Pressure',
      'Heart Rate',
      'Temperature Regulation'
    ];

    const drugProfiles: { [drugId: string]: RadarDataPoint[] } = {};

    // Generate demo drug profiles with distinct characteristics based on pathway categories
    const demoDrugProfiles = {
      'ketamine': {
        'Energy Metabolism': 0.8,
        'Immune Response': 1.2,
        'Oxidative Stress': 1.4,
        'Circadian Rhythm': 0.6,
        'Blood Pressure': 1.1,
        'Heart Rate': 1.3,
        'Temperature Regulation': 0.9
      },
      'propofol': {
        'Energy Metabolism': 0.7,
        'Immune Response': 0.4,
        'Oxidative Stress': 0.3,
        'Circadian Rhythm': 1.1,
        'Blood Pressure': 0.8,
        'Heart Rate': 0.6,
        'Temperature Regulation': 1.2
      },
      'etomidate': {
        'Energy Metabolism': 1.1,
        'Immune Response': 0.9,
        'Oxidative Stress': 0.8,
        'Circadian Rhythm': 1.3,
        'Blood Pressure': 0.5,
        'Heart Rate': 0.7,
        'Temperature Regulation': 0.4
      },
      'novel1': {
        'Energy Metabolism': 0.9,
        'Immune Response': 1.0,
        'Oxidative Stress': 0.7,
        'Circadian Rhythm': 0.8,
        'Blood Pressure': 1.2,
        'Heart Rate': 0.9,
        'Temperature Regulation': 1.1
      },
      'novel2': {
        'Energy Metabolism': 1.3,
        'Immune Response': 0.6,
        'Oxidative Stress': 1.1,
        'Circadian Rhythm': 0.5,
        'Blood Pressure': 0.9,
        'Heart Rate': 1.0,
        'Temperature Regulation': 0.7
      }
    };
    
    Object.entries(demoDrugProfiles).forEach(([drugId, drugProfile]) => {
      const profile: RadarDataPoint[] = [];
      
      axes.forEach(axis => {
        const value = drugProfile[axis as keyof typeof drugProfile] || 0.5;
        
        profile.push({
          axis,
          value,
          maxValue: 1.5,
          drug: drugId
        });
      });
      
      drugProfiles[drugId] = profile;
    });

    return drugProfiles;
  }, [data, drugData, selectedDrugs]);

  // Create individual mini radar charts for each drug
  const createMiniRadar = (drugId: string, drugProfile: RadarDataPoint[], x: number, y: number, size: number) => {
    // This function is no longer used - removing individual profiles
    return null;
  };

  useEffect(() => {
    if (!svgRef.current || Object.keys(radarData).length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const containerWidth = svgRef.current.clientWidth;
    const containerHeight = svgRef.current.clientHeight;
    
    // Full width layout with sidebar for mini radars
    const margin = { top: 60, right: 170, bottom: 60, left: 60 }; // Reduced right margin since legend is closer
    const mainRadius = Math.min(containerWidth - margin.left - margin.right, containerHeight - margin.top - margin.bottom) / 2 - 80; // Reduced from -40 to -80 to make smaller

    // Centered main chart group (moved left to center with legend)
    const mainG = svg.append('g')
      .attr('class', 'main-radar')
      .attr('transform', `translate(${containerWidth / 2 - 50}, ${containerHeight / 2})`); // Moved left by 50px

    // Get axes from first drug
    const firstDrug = Object.keys(radarData)[0];
    const axes = firstDrug ? radarData[firstDrug].map(d => d.axis) : [];
    const angleSlice = (Math.PI * 2) / axes.length;

    // Create main radar chart background
    const rScale = d3.scaleLinear()
      .domain([0, 1.5])
      .range([0, mainRadius]);

    // Removed background grid circles - keeping only axis lines

    // Axis lines and labels with dotted lines and points at the end
    axes.forEach((axis, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x = Math.cos(angle) * mainRadius;
      const y = Math.sin(angle) * mainRadius;
      
      // Extended axis line (goes beyond the data area)
      const extendedRadius = mainRadius * 1.3; // Extend 30% beyond data area
      const extendedX = Math.cos(angle) * extendedRadius;
      const extendedY = Math.sin(angle) * extendedRadius;

      // Dotted axis line (extends beyond data area)
      mainG.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', extendedX)
        .attr('y2', extendedY)
        .attr('stroke', isDarkMode ? '#ffffff25' : '#00000025')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3'); // Dotted line

      // Point at the end of each extended axis
      mainG.append('circle')
        .attr('cx', extendedX)
        .attr('cy', extendedY)
        .attr('r', 3)
        .attr('fill', isDarkMode ? '#ffffff' : '#000000')
        .attr('stroke', 'none');

      // Axis label (positioned beyond the extended line)
      const labelRadius = extendedRadius * 1.15; // 15% beyond the extended line
      const labelX = Math.cos(angle) * labelRadius;
      const labelY = Math.sin(angle) * labelRadius;
      
      mainG.append('text')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', isDarkMode ? '#ffffff' : '#000000')
        .attr('font-size', '12px')
        .attr('font-weight', '500')
        .text(axis);
    });

    // Use the same drug colors as pathway visualization
    const drugColors: { [key: string]: string } = {
      'ketamine': '#FFBF00',    // User specified
      'etomidate': '#40E0D0',   // User specified
      'propofol': '#DE3163',    // User specified
      'novel1': '#6495ED',      // User specified
      'novel2': '#77B254'       // User specified
    };

    // Draw all drug profiles on main chart
    Object.entries(radarData).forEach(([drugId, drugProfile], drugIndex) => {
      const drugColor = drugColors[drugId] || '#888888';

      const lineGenerator = d3.lineRadial<RadarDataPoint>()
        .angle((d, i) => angleSlice * i)
        .radius(d => rScale(d.value))
        .curve(d3.curveCardinalClosed); // Changed to curved line

      // Filled area with curved lines and no outline
      mainG.append('path')
        .datum(drugProfile)
        .attr('class', `radar-area radar-area-${drugId}`)
        .attr('d', lineGenerator)
        .attr('fill', drugColor)
        .attr('fill-opacity', isDarkMode ? 0.25 : 0.15) // Higher opacity in dark mode
        .attr('stroke', 'none') // Removed outline
        .attr('filter', isDarkMode ? `drop-shadow(0 0 8px ${drugColor})` : 'none'); // Glow effect in dark mode

      // Removed data points (dots) - keeping only the outline
    });

    // Add legend and mini radar charts on the right (moved much further left to center with plot)
    const legendX = containerWidth / 2 + 400; // Position relative to center instead of right edge
    const legendY = 60;
    const miniRadarSize = 80;
    const miniRadarSpacing = 100;

    Object.entries(radarData).forEach(([drugId, drugProfile], index) => {
      const drugColor = drugColors[drugId] || '#888888';
      const y = legendY + index * miniRadarSpacing;

      // Create mini radar chart
      const miniRadarG = svg.append('g')
        .attr('class', `mini-radar-${drugId}`)
        .attr('transform', `translate(${legendX + miniRadarSize/2}, ${y + miniRadarSize/2})`);

      // Mini radar axis lines (dotted) - no background circles
      axes.forEach((axis, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const x = Math.cos(angle) * miniRadarSize/2;
        const y = Math.sin(angle) * miniRadarSize/2;

        miniRadarG.append('line')
          .attr('x1', 0)
          .attr('y1', 0)
          .attr('x2', x)
          .attr('y2', y)
          .attr('stroke', isDarkMode ? '#ffffff20' : '#00000020')
          .attr('stroke-width', 0.5)
          .attr('stroke-dasharray', '2,2');

        // Point at the end
        miniRadarG.append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', 1.5)
          .attr('fill', isDarkMode ? '#ffffff' : '#000000')
          .attr('stroke', 'none');
      });

      // Mini radar drug profile with curved lines and no outline
      const miniLineGenerator = d3.lineRadial<RadarDataPoint>()
        .angle((d, i) => angleSlice * i)
        .radius(d => (miniRadarSize/2) * (d.value / 1.5))
        .curve(d3.curveCardinalClosed); // Changed to curved line

      miniRadarG.append('path')
        .datum(drugProfile)
        .attr('class', `mini-radar-area mini-radar-area-${drugId}`)
        .attr('d', miniLineGenerator)
        .attr('fill', drugColor)
        .attr('fill-opacity', isDarkMode ? 0.5 : 0.3) // Higher opacity in dark mode
        .attr('stroke', 'none') // Removed outline
        .attr('filter', isDarkMode ? `drop-shadow(0 0 6px ${drugColor})` : 'none'); // Glow effect in dark mode

      // Legend text
      svg.append('text')
        .attr('x', legendX + miniRadarSize + 10)
        .attr('y', y + miniRadarSize/2)
        .attr('text-anchor', 'start')
        .attr('dominant-baseline', 'middle')
        .attr('fill', isDarkMode ? '#ffffff' : '#000000')
        .attr('font-size', '12px')
        .attr('font-weight', '500')
        .text(drugId.toUpperCase());
    });

    // Add hover interactions
    svg.selectAll('.radar-area')
      .on('mouseover', function(event, d) {
        const className = (this as SVGElement).getAttribute('class');
        const drugId = className?.split('-').pop();
        
        if (drugId) {
          // Highlight main chart
          svg.selectAll('.radar-area')
            .attr('fill-opacity', isDarkMode ? 0.1 : 0.05);
          
          d3.select(this)
            .attr('fill-opacity', isDarkMode ? 0.6 : 0.4);

          // Highlight corresponding mini radar
          svg.selectAll('.mini-radar-area')
            .attr('fill-opacity', isDarkMode ? 0.2 : 0.1);
          
          svg.select(`.mini-radar-area-${drugId}`)
            .attr('fill-opacity', isDarkMode ? 0.8 : 0.6);
        }
      })
      .on('mouseout', function() {
        // Reset all opacities
        svg.selectAll('.radar-area')
          .attr('fill-opacity', isDarkMode ? 0.25 : 0.15);
        
        svg.selectAll('.mini-radar-area')
          .attr('fill-opacity', isDarkMode ? 0.5 : 0.3);
      });

  }, [radarData, isDarkMode]);

  return (
    <div className="radar-chart-container">
      <div className="radar-controls">
        <div className="control-info">
          <h3>Drug Profile Radar</h3>
          <p>Compare drug effects across multiple biological pathways. Each drug shows a unique profile pattern.</p>
        </div>
      </div>
      
      <div className="radar-wrapper">
        <svg
          ref={svgRef}
          className="radar-chart"
          width="100%"
          height="500"
        />
        
        <div
          ref={tooltipRef}
          className="radar-tooltip"
          style={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: 'none',
            zIndex: 1000
          }}
        />
      </div>
    </div>
  );
};

export default RadarChart; 