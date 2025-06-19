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
    const axes = [
      'Inflammation',
      'Antioxidant Defense', 
      'Circadian Clock',
      'ROS Production',
      'DNA Damage Response',
      'Protein Folding Stress'
    ];

    const drugProfiles: { [drugId: string]: RadarDataPoint[] } = {};

    // Generate demo drug profiles with distinct characteristics
    const demoDrugProfiles = {
      'ketamine': {
        'Inflammation': 0.95,
        'Antioxidant Defense': 0.4,
        'Circadian Clock': 0.3,
        'ROS Production': 1.2,
        'DNA Damage Response': 0.8,
        'Protein Folding Stress': 0.6
      },
      'propofol': {
        'Inflammation': 0.2,
        'Antioxidant Defense': 1.1,
        'Circadian Clock': 0.9,
        'ROS Production': 0.3,
        'DNA Damage Response': 0.4,
        'Protein Folding Stress': 0.7
      },
      'etomidate': {
        'Inflammation': 0.6,
        'Antioxidant Defense': 0.7,
        'Circadian Clock': 1.3,
        'ROS Production': 0.5,
        'DNA Damage Response': 1.1,
        'Protein Folding Stress': 1.2
      },
      'dexmedetomidine': {
        'Inflammation': 0.7,
        'Antioxidant Defense': 0.9,
        'Circadian Clock': 0.6,
        'ROS Production': 0.4,
        'DNA Damage Response': 0.5,
        'Protein Folding Stress': 0.3
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
    const g = d3.select(svgRef.current!)
      .select('.mini-radars')
      .append('g')
      .attr('class', `mini-radar-${drugId}`)
      .attr('transform', `translate(${x}, ${y})`);

    const axes = drugProfile.map(d => d.axis);
    const angleSlice = (Math.PI * 2) / axes.length;
    const radius = size / 2;

    // Create radial scale for mini chart
    const rScale = d3.scaleLinear()
      .domain([0, 1.5])
      .range([0, radius]);

    // Background circle
    g.append('circle')
      .attr('r', radius)
      .attr('fill', 'none')
      .attr('stroke', isDarkMode ? '#ffffff20' : '#00000020')
      .attr('stroke-width', 1);

    // Axis lines (simplified)
    axes.forEach((axis, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', isDarkMode ? '#ffffff15' : '#00000015')
        .attr('stroke-width', 0.5);
    });

    // Drug color
    const drugColors: { [key: string]: string } = {
      'ketamine': '#FF6B6B',
      'propofol': '#4ECDC4', 
      'etomidate': '#45B7D1',
      'dexmedetomidine': '#96CEB4'
    };

    const drugColor = drugColors[drugId] || '#888888';

    // Create path for drug profile
    const lineGenerator = d3.lineRadial<RadarDataPoint>()
      .angle((d, i) => angleSlice * i)
      .radius(d => rScale(d.value))
      .curve(d3.curveLinearClosed);

    // Filled area
    g.append('path')
      .datum(drugProfile)
      .attr('d', lineGenerator)
      .attr('fill', drugColor)
      .attr('fill-opacity', 0.3)
      .attr('stroke', drugColor)
      .attr('stroke-width', 2);

    // Drug name label
    g.append('text')
      .attr('y', radius + 20)
      .attr('text-anchor', 'middle')
      .attr('fill', isDarkMode ? '#ffffff' : '#000000')
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .text(drugId.toUpperCase());

    return g;
  };

  useEffect(() => {
    if (!svgRef.current || Object.keys(radarData).length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const containerWidth = svgRef.current.clientWidth;
    const containerHeight = svgRef.current.clientHeight;
    
    // Layout: Main chart on left, mini charts on right
    const mainChartWidth = containerWidth * 0.6;
    const sidebarWidth = containerWidth * 0.4;
    const margin = { top: 40, right: 20, bottom: 40, left: 20 };
    
    const mainRadius = Math.min(mainChartWidth - margin.left - margin.right, containerHeight - margin.top - margin.bottom) / 2 - 40;

    // Main chart group
    const mainG = svg.append('g')
      .attr('class', 'main-radar')
      .attr('transform', `translate(${mainChartWidth / 2}, ${containerHeight / 2})`);

    // Mini charts container
    const miniG = svg.append('g')
      .attr('class', 'mini-radars')
      .attr('transform', `translate(${mainChartWidth}, 0)`);

    // Get axes from first drug
    const firstDrug = Object.keys(radarData)[0];
    const axes = firstDrug ? radarData[firstDrug].map(d => d.axis) : [];
    const angleSlice = (Math.PI * 2) / axes.length;

    // Create main radar chart background
    const rScale = d3.scaleLinear()
      .domain([0, 1.5])
      .range([0, mainRadius]);

    // Background grid circles (minimal)
    const levels = 3;
    for (let i = 1; i <= levels; i++) {
      mainG.append('circle')
        .attr('r', mainRadius * i / levels)
        .attr('fill', 'none')
        .attr('stroke', isDarkMode ? '#ffffff15' : '#00000015')
        .attr('stroke-width', 1);
    }

    // Axis lines and labels
    axes.forEach((axis, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x = Math.cos(angle) * mainRadius;
      const y = Math.sin(angle) * mainRadius;

      // Axis line
      mainG.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', isDarkMode ? '#ffffff25' : '#00000025')
        .attr('stroke-width', 1);

      // Axis label
      mainG.append('text')
        .attr('x', x * 1.2)
        .attr('y', y * 1.2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', isDarkMode ? '#ffffff' : '#000000')
        .attr('font-size', '11px')
        .attr('font-weight', '500')
        .text(axis);
    });

    // Drug colors
    const drugColors: { [key: string]: string } = {
      'ketamine': '#FF6B6B',
      'propofol': '#4ECDC4', 
      'etomidate': '#45B7D1',
      'dexmedetomidine': '#96CEB4'
    };

    // Draw all drug profiles on main chart
    Object.entries(radarData).forEach(([drugId, drugProfile], drugIndex) => {
      const drugColor = drugColors[drugId] || '#888888';

      const lineGenerator = d3.lineRadial<RadarDataPoint>()
        .angle((d, i) => angleSlice * i)
        .radius(d => rScale(d.value))
        .curve(d3.curveLinearClosed);

      // Filled area with lower opacity
      mainG.append('path')
        .datum(drugProfile)
        .attr('class', `radar-area radar-area-${drugId}`)
        .attr('d', lineGenerator)
        .attr('fill', drugColor)
        .attr('fill-opacity', 0.15)
        .attr('stroke', drugColor)
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.8);

      // Data points
      drugProfile.forEach((d, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const x = Math.cos(angle) * rScale(d.value);
        const y = Math.sin(angle) * rScale(d.value);

        mainG.append('circle')
          .attr('class', `radar-point radar-point-${drugId}`)
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', 3)
          .attr('fill', drugColor)
          .attr('stroke', isDarkMode ? '#000000' : '#ffffff')
          .attr('stroke-width', 1);
      });
    });

    // Create mini radar charts in sidebar
    const miniSize = 80;
    const miniSpacing = 100;
    const startY = 60;

    Object.entries(radarData).forEach(([drugId, drugProfile], index) => {
      const x = sidebarWidth / 2;
      const y = startY + index * miniSpacing;
      createMiniRadar(drugId, drugProfile, x, y, miniSize);
    });

    // Add title
    svg.append('text')
      .attr('x', containerWidth / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .attr('fill', isDarkMode ? '#ffffff' : '#000000')
      .attr('font-size', '16px')
      .attr('font-weight', '600')
      .text('Drug Profile Comparison');

    // Add sidebar title
    svg.append('text')
      .attr('x', mainChartWidth + sidebarWidth / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .attr('fill', isDarkMode ? '#ffffff' : '#000000')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .attr('opacity', 0.8)
      .text('Individual Profiles');

         // Add hover interactions
     svg.selectAll('.radar-area')
       .on('mouseover', function(event, d) {
         const className = (this as SVGElement).getAttribute('class');
         const drugId = className?.split('-').pop();
         
         if (drugId) {
           // Highlight main chart
           svg.selectAll('.radar-area')
             .attr('fill-opacity', 0.05)
             .attr('stroke-opacity', 0.3);
           
           d3.select(this)
             .attr('fill-opacity', 0.3)
             .attr('stroke-opacity', 1);

           // Highlight corresponding mini chart
           svg.selectAll(`.mini-radar-${drugId} path`)
             .attr('fill-opacity', 0.6)
             .attr('stroke-width', 3);
         }
       })
      .on('mouseout', function() {
        // Reset all opacities
        svg.selectAll('.radar-area')
          .attr('fill-opacity', 0.15)
          .attr('stroke-opacity', 0.8);

        svg.selectAll('.mini-radars path')
          .attr('fill-opacity', 0.3)
          .attr('stroke-width', 2);
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