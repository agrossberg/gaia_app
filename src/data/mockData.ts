import { BiologicalNode, BiologicalLink, OmicsType, PathwayData, DrugTreatment } from '../types';

// Time series categories for the hierarchical structure
export const TIME_SERIES = [
  '10 min',
  '30 min', 
  '90 min',
  '48 hours'
];

// Broad biological pathway categories (horizontal spread)
export const BROAD_CATEGORIES = {
  'Energy Metabolism': [
    'Glucose Metabolism',
    'Lipid Metabolism',
    'Mitochondrial Respiration',
    'mTOR Signaling'
  ],
  'Immune Response': [
    'Innate Immunity',
    'Adaptive Immunity', 
    'Inflammation',
    'Cytokine Signaling'
  ],
  'Oxidative Stress': [
    'ROS Production',
    'Antioxidant Defense',
    'DNA Damage Response',
    'Protein Folding Stress'
  ],
  'Circadian Rhythm': [
    'Circadian Clock',
    'Sleep-Wake Cycle',
    'Melatonin Signaling',
    'Light-Dark Response'
  ],
  'Blood Pressure': [
    'Renin-Angiotensin System',
    'Vascular Tone',
    'Sodium Balance',
    'Baroreceptor Response'
  ],
  'Heart Rate': [
    'Cardiac Conduction',
    'Autonomic Control',
    'Calcium Handling',
    'Beta-Adrenergic Signaling'
  ],
  'Temperature Regulation': [
    'Thermogenesis',
    'Heat Shock Response',
    'Hypothalamic Control',
    'Brown Fat Activation'
  ]
};

// All pathways flattened
export const ALL_PATHWAYS = Object.values(BROAD_CATEGORIES).flat();

// Mock drug treatments with pathway targeting that matches actual pathways
export const DRUG_TREATMENTS: DrugTreatment[] = [
  {
    id: 'ketamine',
    name: 'Ketamine',
    mechanism: 'NMDA Receptor Antagonist',
    targetPathways: ['Antioxidant Defense', 'DNA Damage Response', 'Circadian Clock'], // Overlaps with Novel1
    targetOmicsTypes: [OmicsType.mRNA, OmicsType.PROTEIN, OmicsType.METABOLITE],
    effects: {
      upregulatedGenes: ['BDNF', 'ARC', 'CREB1', 'FOS'],
      downregulatedGenes: ['GRIN1', 'GRIN2A', 'GRIN2B', 'GRIA1'],
      enhancedInteractions: ['BDNF-TrkB', 'CREB-CBP'],
      disruptedInteractions: ['NMDA-Glutamate', 'GABA-Inhibition']
    }
  },
  {
    id: 'etomidate',
    name: 'Etomidate',
    mechanism: 'GABAA Receptor Agonist',
    targetPathways: ['Inflammation', 'Cytokine Signaling', 'Heat Shock Response'], // Overlaps with Propofol
    targetOmicsTypes: [OmicsType.mRNA, OmicsType.PROTEIN],
    effects: {
      upregulatedGenes: ['GABRA1', 'GABRB2', 'GABRG2', 'GAD1'],
      downregulatedGenes: ['CYP11B1', 'CYP17A1', 'STAR', 'MC2R'],
      enhancedInteractions: ['GABA-GABAA', 'Chloride-Influx'],
      disruptedInteractions: ['ACTH-MC2R', 'Cholesterol-Cortisol']
    }
  },
  {
    id: 'propofol',
    name: 'Propofol',
    mechanism: 'GABAA Receptor Modulator',
    targetPathways: ['Lipid Metabolism', 'Mitochondrial Respiration', 'Inflammation'], // Overlaps with Etomidate
    targetOmicsTypes: [OmicsType.PROTEIN, OmicsType.METABOLITE, OmicsType.LIPID],
    effects: {
      upregulatedGenes: ['GABRA1', 'GABRB1', 'GABRG2', 'UCP1'],
      downregulatedGenes: ['COX1', 'COX2', 'ATP5A1', 'NDUFA1'],
      enhancedInteractions: ['GABA-Receptor', 'Propofol-Membrane'],
      disruptedInteractions: ['ETC-Complex1', 'ATP-Synthesis']
    }
  },
  {
    id: 'novel1',
    name: 'Novel 1',
    mechanism: 'Multi-target Neuromodulator',
    targetPathways: ['Circadian Clock', 'Sleep-Wake Cycle', 'Antioxidant Defense'], // Overlaps with Ketamine
    targetOmicsTypes: [OmicsType.mRNA, OmicsType.PROTEIN, OmicsType.METABOLITE],
    effects: {
      upregulatedGenes: ['CLOCK', 'PER1', 'CRY1', 'BMAL1'],
      downregulatedGenes: ['ROS', 'NOX4', 'MAOA', 'COMT'],
      enhancedInteractions: ['Clock-Bmal1', 'Antioxidant-Defense'],
      disruptedInteractions: ['ROS-Damage', 'Stress-Response']
    }
  },
  {
    id: 'novel2',
    name: 'Novel 2',
    mechanism: 'Selective Ion Channel Modulator',
    targetPathways: ['Cardiac Conduction', 'Calcium Handling', 'Autonomic Control'], // Unique pathways
    targetOmicsTypes: [OmicsType.PROTEIN, OmicsType.METABOLITE],
    effects: {
      upregulatedGenes: ['CACNA1C', 'RYR2', 'SERCA2', 'PLN'],
      downregulatedGenes: ['SCN5A', 'KCNH2', 'KCNQ1', 'HCN4'],
      enhancedInteractions: ['Calcium-Release', 'SERCA-Uptake'],
      disruptedInteractions: ['Sodium-Current', 'Potassium-Efflux']
    }
  }
];

// Omics type distribution weights across timepoints
const getOmicsDistribution = (timepoint: string): { [key in OmicsType]: number } => {
  switch (timepoint) {
    case '10 min':
      return {
        [OmicsType.mRNA]: 0.1,        // Very few mRNA changes yet
        [OmicsType.PROTEIN]: 0.4,     // Some protein activity changes
        [OmicsType.METABOLITE]: 0.4,  // Rapid metabolite changes
        [OmicsType.LIPID]: 0.1        // Minimal lipid changes
      };
    case '30 min':
      return {
        [OmicsType.mRNA]: 0.25,       // Early transcriptional response
        [OmicsType.PROTEIN]: 0.35,    // Protein modifications peak
        [OmicsType.METABOLITE]: 0.3,  // Continued metabolite flux
        [OmicsType.LIPID]: 0.1        // Some lipid signaling
      };
    case '90 min':
      return {
        [OmicsType.mRNA]: 0.35,       // Peak transcriptional response
        [OmicsType.PROTEIN]: 0.25,    // New protein synthesis
        [OmicsType.METABOLITE]: 0.25, // Metabolic adaptation
        [OmicsType.LIPID]: 0.15       // Lipid metabolism changes
      };
    case '48 hours':
      return {
        [OmicsType.mRNA]: 0.3,        // Sustained gene expression
        [OmicsType.PROTEIN]: 0.2,     // New protein steady state
        [OmicsType.METABOLITE]: 0.15, // Metabolic remodeling
        [OmicsType.LIPID]: 0.35       // Major lipid composition changes
      };
    default:
      return {
        [OmicsType.mRNA]: 0.25,
        [OmicsType.PROTEIN]: 0.25,
        [OmicsType.METABOLITE]: 0.25,
        [OmicsType.LIPID]: 0.25
      };
  }
};

// Generate confidence score based on various factors
const generateConfidence = (omicsType: OmicsType, pathway: string, timepoint: string, nodeIndex: number): number => {
  let baseConfidence = 0.3; // Start with low confidence
  
  // Omics type confidence modifiers (some types are more reliable)
  switch (omicsType) {
    case OmicsType.PROTEIN:
      baseConfidence += 0.3; // Proteins are often well-characterized
      break;
    case OmicsType.mRNA:
      baseConfidence += 0.25; // mRNA is measurable but indirect
      break;
    case OmicsType.METABOLITE:
      baseConfidence += 0.2; // Metabolites can be variable
      break;
    case OmicsType.LIPID:
      baseConfidence += 0.15; // Lipids are complex and harder to interpret
      break;
  }
  
  // Pathway centrality - some pathways are better understood
  const wellStudiedPathways = [
    'Glucose Metabolism', 'mTOR Signaling', 'Inflammation', 
    'DNA Damage Response', 'Antioxidant Defense'
  ];
  if (wellStudiedPathways.includes(pathway)) {
    baseConfidence += 0.2;
  }
  
  // Timepoint confidence - earlier timepoints often more direct
  switch (timepoint) {
    case '10 min':
      baseConfidence += 0.15; // Direct immediate effects
      break;
    case '30 min':
      baseConfidence += 0.1; // Still fairly direct
      break;
    case '90 min':
      baseConfidence += 0.05; // Some secondary effects
      break;
    case '48 hours':
      baseConfidence -= 0.05; // Many confounding factors
      break;
  }
  
  // Add some randomness for realistic variation
  const randomVariation = (Math.random() - 0.5) * 0.3; // ±15% random variation
  baseConfidence += randomVariation;
  
  // Some nodes are "key players" with higher confidence
  const isKeyPlayer = nodeIndex < 3 || Math.random() < 0.15; // First few nodes or 15% chance
  if (isKeyPlayer) {
    baseConfidence += 0.2;
  }
  
  // Ensure confidence stays within bounds [0.1, 0.95]
  return Math.max(0.1, Math.min(0.95, baseConfidence));
};

// Generate nodes distributed across timepoints and broad categories
const generateNodes = (): BiologicalNode[] => {
  const nodes: BiologicalNode[] = [];
  
  // Y-position for time series (cascading down)
  const timeYPositions: { [key: string]: number } = {
    '10 min': 0.15,
    '30 min': 0.35,
    '90 min': 0.55,
    '48 hours': 0.75
  };
  
  // X-position for broad categories (spread across width)
  const categoryXPositions: { [key: string]: number } = {
    'Energy Metabolism': 0.2,
    'Immune Response': 0.5,
    'Oxidative Stress': 0.8
  };
  
  // Generate nodes for each timepoint - SIGNIFICANTLY INCREASED
  TIME_SERIES.forEach((timepoint, timeIndex) => {
    const omicsDistribution = getOmicsDistribution(timepoint);
    const totalNodesAtTimepoint = 120; // Increased from 45 to 120 nodes per timepoint
    
    Object.entries(BROAD_CATEGORIES).forEach(([broadCategory, subPathways]) => {
      const nodesPerCategory = Math.floor(totalNodesAtTimepoint / Object.keys(BROAD_CATEGORIES).length);
      
      // Distribute omics types according to timepoint weights
      const omicsTypeCounts: { [key in OmicsType]: number } = {
        [OmicsType.mRNA]: Math.round(nodesPerCategory * omicsDistribution[OmicsType.mRNA]),
        [OmicsType.PROTEIN]: Math.round(nodesPerCategory * omicsDistribution[OmicsType.PROTEIN]),
        [OmicsType.METABOLITE]: Math.round(nodesPerCategory * omicsDistribution[OmicsType.METABOLITE]),
        [OmicsType.LIPID]: Math.round(nodesPerCategory * omicsDistribution[OmicsType.LIPID])
      };
      
      // Create nodes for each omics type - MORE NODES PER PATHWAY
      Object.entries(omicsTypeCounts).forEach(([omicsType, count]) => {
        // Distribute nodes more evenly across pathways within each category
        subPathways.forEach((pathway, pathwayIndex) => {
          const nodesPerPathway = Math.ceil(count / subPathways.length);
          
          for (let i = 0; i < nodesPerPathway; i++) {
            const baseExpression = Math.random() * 10 + 1;
            const nodeName = getNodeName(pathway, omicsType as OmicsType, i, timepoint);
            
            if (nodeName && pathway && omicsType && broadCategory) {
              // Add some random spread within the category/timepoint
              const categorySpread = (Math.random() - 0.5) * 0.15; // ±7.5% spread
              const timeSpread = (Math.random() - 0.5) * 0.08;     // ±4% spread
              
              // Generate confidence for this node
              const confidence = generateConfidence(omicsType as OmicsType, pathway, timepoint, i);
              
              // Assign multiple categories to some nodes based on biological overlap
              let nodeCategories: string | string[] = broadCategory;
              
              // Add logic for nodes that belong to multiple categories
              if (pathway === 'Inflammation' && Math.random() < 0.4) {
                // Inflammation nodes can also be in Immune Response
                nodeCategories = [broadCategory, 'Immune Response'];
              } else if (pathway === 'ROS Production' && Math.random() < 0.3) {
                // ROS Production nodes can also be in Oxidative Stress
                nodeCategories = [broadCategory, 'Oxidative Stress'];
              } else if (pathway === 'Mitochondrial Respiration' && Math.random() < 0.3) {
                // Mitochondrial nodes can also be in Energy Metabolism
                nodeCategories = [broadCategory, 'Energy Metabolism'];
              } else if (pathway === 'Circadian Clock' && Math.random() < 0.2) {
                // Circadian nodes can also be in Sleep-Wake Cycle
                nodeCategories = [broadCategory, 'Sleep-Wake Cycle'];
              } else if (pathway === 'Autonomic Control' && Math.random() < 0.25) {
                // Autonomic nodes can also be in Blood Pressure
                nodeCategories = [broadCategory, 'Blood Pressure'];
              }
              
              nodes.push({
                id: `${timepoint.replace(/\s+/g, '')}_${broadCategory.replace(/\s+/g, '')}_${pathway.replace(/\s+/g, '')}_${omicsType.replace(/\s+/g, '')}_${i}`,
                name: nodeName,
                type: omicsType as OmicsType,
                pathway,
                broadCategory: nodeCategories,
                timepoint, // Add timepoint as a property
                expression: baseExpression,
                baselineExpression: baseExpression,
                significance: Math.random() * 0.05,
                confidence: confidence, // Add confidence score
                isPerturbationTarget: false,
                // Positioned by timepoint (Y) and primary broad category (X) - use original broadCategory for positioning
                initialX: categoryXPositions[broadCategory] + categorySpread,
                initialY: timeYPositions[timepoint] + timeSpread
              });
            }
          }
        });
      });
    });
  });
  
  return nodes.filter(node => node && node.id && node.name && node.type && node.pathway);
};

// Generate meaningful node names based on pathway, omics type, and timepoint
const getNodeName = (pathway: string, omicsType: OmicsType, index: number, timepoint: string): string => {
  if (!pathway || !omicsType || index < 0) {
    return `Node_${index}`;
  }
  
  // GREATLY EXPANDED gene names with timepoint-specific suffixes
  const geneNames: { [key: string]: string[] } = {
    'Glucose Metabolism': [
      'GLUT4', 'HK2', 'PFKM', 'ALDOA', 'G6PC', 'PCK1', 'PDHB', 'CS', 'IDH1', 'GLUT1', 'HK1', 'PFKL', 'ALDOB', 'G6PD', 'PCK2', 'PDHA1', 'ACO1', 'IDH2',
      'GLUT2', 'GLUT3', 'HK3', 'HK4', 'PFKP', 'ALDOC', 'GPI', 'TPI1', 'GAPDH', 'PGK1', 'PGAM1', 'ENO1', 'PKM', 'LDHA', 'LDHB', 'PDK1', 'PDK2', 'PDK3', 'PDK4',
      'PDP1', 'PDP2', 'ACLY', 'ACC1', 'FASN', 'SCD1', 'ELOVL6', 'DGAT1', 'DGAT2', 'ATGL', 'HSL', 'MAGL', 'CPT1A', 'CPT1B', 'CPT2', 'ACADM', 'HADHA', 'HADHB'
    ],
    'Lipid Metabolism': [
      'FASN', 'ACACA', 'CPT1A', 'PPARA', 'SREBF1', 'ACOX1', 'DGAT1', 'LIPE', 'PLIN1', 'ACACB', 'CPT1B', 'PPARG', 'SREBF2', 'ACOX2', 'DGAT2', 'PNPLA2', 'PLIN2',
      'ELOVL1', 'ELOVL2', 'ELOVL3', 'ELOVL4', 'ELOVL5', 'ELOVL6', 'ELOVL7', 'SCD1', 'SCD2', 'FADS1', 'FADS2', 'FADS3', 'ACSL1', 'ACSL3', 'ACSL4', 'ACSL5', 'ACSL6',
      'HADHA', 'HADHB', 'ACADM', 'ACADL', 'ACADS', 'ACADVL', 'EHHADH', 'HSD17B4', 'PECR', 'MECR', 'TECR', 'SC5D', 'DHCR7', 'DHCR24', 'LSS', 'SQLE', 'HMGCR', 'HMGCS1'
    ],
    'Mitochondrial Respiration': [
      'COX4I1', 'NDUFA4', 'SDHA', 'UQCRB', 'ATP5A1', 'PGC1A', 'TFAM', 'NRF1', 'PPRC1', 'COX4I2', 'NDUFA1', 'SDHB', 'UQCRH', 'ATP5B', 'PGC1B', 'TFAM2', 'NRF2', 'PPRC2',
      'NDUFS1', 'NDUFS2', 'NDUFS3', 'NDUFS4', 'NDUFS5', 'NDUFS6', 'NDUFS7', 'NDUFS8', 'NDUFV1', 'NDUFV2', 'NDUFV3', 'NDUFA2', 'NDUFA3', 'NDUFA5', 'NDUFA6', 'NDUFA7', 'NDUFA8', 'NDUFA9',
      'SDHC', 'SDHD', 'SDHAF1', 'SDHAF2', 'UQCRC1', 'UQCRC2', 'CYC1', 'UQCRFS1', 'UQCRQ', 'COX5A', 'COX5B', 'COX6A1', 'COX6B1', 'COX6C', 'COX7A1', 'COX7B', 'COX7C', 'COX8A'
    ],
    'mTOR Signaling': [
      'MTOR', 'RPS6KB1', 'EIF4EBP1', 'ULK1', 'TFEB', 'TSC2', 'RHEB', 'AKT1', 'PTEN', 'RPTOR', 'RPS6KB2', 'EIF4EBP2', 'ULK2', 'TFE3', 'TSC1', 'RHOA', 'AKT2', 'PIK3CA',
      'PIK3CB', 'PIK3CD', 'PIK3CG', 'PIK3R1', 'PIK3R2', 'PIK3R3', 'PDK1', 'RICTOR', 'MAPKAP1', 'MLST8', 'DEPTOR', 'PRAS40', 'RAPTOR', 'mLST8', 'FKBP12', 'FRAP1', 'RRAGA', 'RRAGB', 'RRAGC', 'RRAGD',
      'LAMTOR1', 'LAMTOR2', 'LAMTOR3', 'LAMTOR4', 'LAMTOR5', 'SLC38A9', 'FLCN', 'FNIP1', 'FNIP2', 'SESN1', 'SESN2', 'SESN3', 'CASTOR1', 'CASTOR2', 'SAMTOR', 'WDR24', 'WDR59', 'MIOS'
    ],
    'Innate Immunity': [
      'TLR4', 'MYD88', 'IRF3', 'IFNB1', 'IL1B', 'CXCL10', 'IRF7', 'TBK1', 'MAVS', 'TLR2', 'TIRAP', 'IRF4', 'IFNA1', 'IL1A', 'CXCL8', 'IRF8', 'IKBKE', 'RIG1',
      'TLR1', 'TLR3', 'TLR5', 'TLR6', 'TLR7', 'TLR8', 'TLR9', 'TLR10', 'IRAK1', 'IRAK2', 'IRAK4', 'TRAF3', 'TRAF6', 'TAK1', 'TAB1', 'TAB2', 'TAB3', 'IKK1', 'IKK2', 'NEMO',
      'NFKB1', 'NFKB2', 'RELA', 'RELB', 'REL', 'IKBA', 'IKBB', 'IKBE', 'STAT1', 'STAT2', 'STAT3', 'STAT4', 'STAT5A', 'STAT5B', 'STAT6', 'JAK1', 'JAK2', 'JAK3', 'TYK2'
    ],
    'Adaptive Immunity': [
      'CD4', 'CD8A', 'TCR', 'BCR', 'IL2', 'IFNG', 'CD28', 'CTLA4', 'PD1', 'CD8B', 'TCRA', 'TCRB', 'TCRG', 'TCRD', 'IL4', 'IL5', 'IL13', 'CD80', 'CD86', 'PDCD1',
      'CD3D', 'CD3E', 'CD3G', 'CD3Z', 'ZAP70', 'LCK', 'FYN', 'LAT', 'SLP76', 'GRAP2', 'VAV1', 'VAV2', 'VAV3', 'PLCG1', 'PLCG2', 'PRKCQ', 'PRKCA', 'NFATC1', 'NFATC2', 'NFATC3',
      'ICOS', 'ICOSLG', 'CD40', 'CD40LG', 'OX40', 'OX40L', '41BB', '41BBL', 'GITR', 'GITRL', 'LAG3', 'TIM3', 'TIGIT', 'VISTA', 'CD27', 'CD70', 'HVEM', 'BTLA', 'CD160'
    ],
    'Inflammation': [
      'NFKB1', 'TNF', 'IL6', 'PTGS2', 'NOS2', 'HMGB1', 'NLRP3', 'CASP1', 'IL18', 'RELA', 'TNFRSF1A', 'IL1R1', 'PTGS1', 'NOS1', 'S100A8', 'NLRP1', 'CASP4', 'IL1RN',
      'IL1B', 'IL1A', 'IL6R', 'IL6ST', 'CXCL1', 'CXCL2', 'CXCL3', 'CXCL5', 'CCL2', 'CCL3', 'CCL4', 'CCL5', 'CCL20', 'CXCR1', 'CXCR2', 'CCR1', 'CCR2', 'CCR5', 'ICAM1', 'VCAM1',
      'SELE', 'SELP', 'SELL', 'ITGAL', 'ITGAM', 'ITGAX', 'ITGB2', 'CD14', 'CD68', 'MPO', 'ELANE', 'CTSG', 'AZU1', 'PRTN3', 'CAMP', 'LTF', 'LCN2', 'S100A9', 'CALR'
    ],
    'Cytokine Signaling': [
      'JAK2', 'STAT3', 'SOCS3', 'IL10', 'TGFB1', 'SMAD3', 'JAK1', 'STAT1', 'IRF4', 'TYK2', 'STAT4', 'SOCS1', 'IL12', 'TGFB2', 'SMAD2', 'JAK3', 'STAT2', 'IRF1',
      'STAT5A', 'STAT5B', 'STAT6', 'SOCS2', 'SOCS4', 'SOCS5', 'SOCS6', 'SOCS7', 'CIS', 'PIAS1', 'PIAS2', 'PIAS3', 'PIAS4', 'SUMO1', 'SUMO2', 'SUMO3', 'UBC9', 'SENP1', 'SENP2', 'SENP3',
      'SMAD1', 'SMAD4', 'SMAD5', 'SMAD6', 'SMAD7', 'SMAD8', 'SMAD9', 'TGFBR1', 'TGFBR2', 'TGFBR3', 'BAMBI', 'SARA', 'SKI', 'SKIL', 'LTBP1', 'LTBP2', 'LTBP3', 'LTBP4', 'THBS1'
    ],
    'ROS Production': [
      'NOX4', 'XDH', 'CYP2E1', 'MPO', 'DUOX2', 'NOX1', 'NOX2', 'CYBA', 'NCF1', 'DUOX1', 'XO', 'CYP1A1', 'EPO', 'DUOX3', 'NOX3', 'NOX5', 'CYBB', 'NCF2',
      'NCF4', 'RAC1', 'RAC2', 'NOXA1', 'NOXO1', 'DUOXA1', 'DUOXA2', 'TPO', 'LPO', 'CYP2A6', 'CYP2B6', 'CYP2C8', 'CYP2C9', 'CYP2C19', 'CYP2D6', 'CYP3A4', 'CYP3A5', 'CYP1A2', 'CYP2J2',
      'ALDH1A1', 'ALDH2', 'ALDH3A1', 'ADH1A', 'ADH1B', 'ADH1C', 'ADH4', 'ADH5', 'ADH6', 'ADH7', 'MAOA', 'MAOB', 'AOC1', 'AOC2', 'AOC3', 'DAO', 'DDC', 'COMT'
    ],
    'Antioxidant Defense': [
      'SOD1', 'CAT', 'GPX1', 'GSR', 'NRF2', 'HMOX1', 'SOD2', 'PRDX1', 'TXN', 'SOD3', 'CATALASE', 'GPX2', 'GSSG', 'KEAP1', 'HMOX2', 'SOD4', 'PRDX2', 'TXNRD1',
      'GPX3', 'GPX4', 'GPX5', 'GPX6', 'GPX7', 'GPX8', 'PRDX3', 'PRDX4', 'PRDX5', 'PRDX6', 'TXNRD2', 'TXNRD3', 'TXN2', 'TXNIP', 'SRXN1', 'GCLC', 'GCLM', 'GSS', 'GSTA1', 'GSTA2',
      'GSTA3', 'GSTA4', 'GSTA5', 'GSTK1', 'GSTM1', 'GSTM2', 'GSTM3', 'GSTM4', 'GSTM5', 'GSTP1', 'GSTT1', 'GSTT2', 'GSTZ1', 'MGST1', 'MGST2', 'MGST3', 'EPHX1', 'EPHX2', 'NQO1'
    ],
    'DNA Damage Response': [
      'ATM', 'TP53', 'BRCA1', 'RAD51', 'PARP1', 'H2AFX', 'ATR', 'CHEK1', 'MDM2', 'ATF2', 'TP73', 'BRCA2', 'RAD52', 'PARP2', 'H2AX', 'ATRIP', 'CHEK2', 'MDM4',
      'RAD50', 'MRE11', 'NBN', 'XRCC1', 'XRCC2', 'XRCC3', 'XRCC4', 'XRCC5', 'XRCC6', 'LIG1', 'LIG3', 'LIG4', 'PRKDC', 'NHEJ1', 'DCLRE1C', 'POLB', 'POLD1', 'POLE', 'PCNA', 'RPA1',
      'RPA2', 'RPA3', 'RFC1', 'RFC2', 'RFC3', 'RFC4', 'RFC5', 'FEN1', 'WRN', 'BLM', 'RECQL', 'RECQL4', 'RECQL5', 'TOP1', 'TOP2A', 'TOP2B', 'TOP3A', 'TOP3B', 'TOPBP1'
    ],
    'Protein Folding Stress': [
      'HSPA1A', 'DNAJB1', 'CALR', 'PDIA3', 'XBP1', 'ATF4', 'HSPA5', 'HSPB1', 'CCT2', 'HSPA1B', 'DNAJB2', 'CANX', 'PDIA4', 'XBP1S', 'ATF6', 'HSPA8', 'HSPB2', 'CCT3',
      'HSPA2', 'HSPA4', 'HSPA6', 'HSPA9', 'HSPA12A', 'HSPA12B', 'HSPA13', 'HSPA14', 'HSPB3', 'HSPB4', 'HSPB5', 'HSPB6', 'HSPB7', 'HSPB8', 'HSPB9', 'HSPB10', 'HSPB11', 'CCT1', 'CCT4', 'CCT5',
      'CCT6A', 'CCT6B', 'CCT7', 'CCT8', 'DNAJA1', 'DNAJA2', 'DNAJA3', 'DNAJA4', 'DNAJB3', 'DNAJB4', 'DNAJB5', 'DNAJB6', 'DNAJB7', 'DNAJB8', 'DNAJB9', 'DNAJB11', 'DNAJB12', 'DNAJB13', 'DNAJB14'
    ],
    'Circadian Clock': [
      'CLOCK', 'BMAL1', 'PER1', 'PER2', 'PER3', 'CRY1', 'CRY2', 'REV-ERBA', 'ROR', 'NPAS2', 'ARNTL', 'CSNK1E', 'CSNK1D', 'FBXL3', 'FBXL21', 'CK1', 'GSK3B', 'SIRT1',
      'TIMELESS', 'PERIOD', 'CYCLE', 'VRILLE', 'CLOCKWORK', 'DOUBLETIME', 'SHAGGY', 'JETLAG', 'TIMEOUT', 'SUPERNUMERARY', 'BRIDE', 'SLEEPLESS', 'WIDE', 'AWAKE', 'LARK', 'SLOWPOKE', 'HYPERKINETIC', 'PARALYTIC', 'CACOPHONY',
      'KAI1', 'KAI2', 'KAI3', 'KAIA', 'KAIB', 'KAIC', 'CCA1', 'LHY', 'TOC1', 'PRR9', 'PRR7', 'PRR5', 'PRR3', 'ELF4', 'ELF3', 'LUX', 'PCL1', 'RVE8', 'RVE4'
    ],
    'Sleep-Wake Cycle': [
      'HCRT', 'MCH', 'GABA', 'ACHE', 'COMT', 'MAOA', 'HTR1A', 'HTR2A', 'DRD2', 'ADRA1A', 'CHRNA4', 'GABRA1', 'GABRB2', 'GABRG2', 'SLC6A4', 'SLC6A3', 'SLC6A2', 'TPH2',
      'PENK', 'POMC', 'NPY', 'AGRP', 'CART', 'LEPR', 'GHSR', 'MC4R', 'AVPR1A', 'OXTR', 'CRHR1', 'CRHR2', 'UCN', 'CRH', 'AVP', 'OXT', 'VIP', 'PHI', 'PACAP', 'ADCYAP1R1',
      'ADORA1', 'ADORA2A', 'ADORA2B', 'ADORA3', 'ENT1', 'ENT2', 'ADA', 'PDE4A', 'PDE4B', 'PDE4D', 'CREB1', 'ATF1', 'MAPK1', 'MAPK3', 'CAMK2A', 'CAMK2B', 'CAMK4', 'PRKACA', 'PRKAR1A'
    ],
    'Melatonin Signaling': [
      'MTNR1A', 'MTNR1B', 'AANAT', 'ASMT', 'TPH1', 'DDC', 'INMT', 'CYP1A2', 'CYP1A1', 'UGT1A6', 'SULT1A1', 'COMT2', 'MAO', 'ALDH', 'ADH', 'GNAS', 'GNAI', 'ADCY', 'PRKA',
      'PLCB1', 'PLCB2', 'PLCB3', 'PLCB4', 'IP3R1', 'IP3R2', 'IP3R3', 'RYR1', 'RYR2', 'RYR3', 'CACNA1C', 'CACNA1D', 'CACNA1S', 'KCNJ3', 'KCNJ5', 'KCNJ9', 'KCNJ10', 'GIRK1', 'GIRK2',
      'PINEAL', 'SCN', 'PVN', 'DMH', 'VMH', 'ARC', 'SON', 'PVT', 'IGL', 'vLGN', 'dLGN', 'SPZ', 'VLPO', 'TMN', 'LC', 'DR', 'MR', 'LDT', 'PPT'
    ],
    'Light-Dark Response': [
      'OPN4', 'RHO', 'OPN1SW', 'OPN1MW', 'OPN1LW', 'GNAT1', 'GNAT2', 'GNGT1', 'GNGT2', 'PDE6A', 'PDE6B', 'PDE6G', 'GRK1', 'ARR1', 'RCVRN', 'RGS9', 'R9AP', 'CNGB1', 'CNGA1',
      'SLC24A1', 'SLC24A2', 'KCNV2', 'HCN1', 'HCN4', 'CABP4', 'CACNA1F', 'CACNA2D4', 'TRPM1', 'GRM6', 'GNAO1', 'GNB3', 'GNG13', 'LRIT3', 'ELFN1', 'GPR179', 'NYCTALOPIN', 'PIKACB', 'PRKCA',
      'CREB1', 'ATF1', 'FOSB', 'JUNB', 'EGR1', 'EGR3', 'ARC', 'HOMER1', 'NPAS4', 'NR4A1', 'NR4A2', 'NR4A3', 'PER1', 'PER2', 'CRY1', 'CRY2', 'CLOCK', 'BMAL1', 'CIART'
    ],
    'Renin-Angiotensin System': [
      'REN', 'AGT', 'ACE', 'ACE2', 'AGTR1', 'AGTR2', 'ENPEP', 'MME', 'CTSG', 'CMA1', 'ANPEP', 'THOP1', 'PREP', 'DPP3', 'LNPEP', 'RNPEP', 'CTSA', 'CTSB', 'CTSD', 'CTSL',
      'CYP11B2', 'NR3C2', 'SCNN1A', 'SCNN1B', 'SCNN1G', 'ATP1A1', 'ATP1B1', 'SLC12A3', 'SLC12A1', 'KCNJ1', 'CLCNKB', 'CLCNKA', 'BSND', 'ROMK', 'NKCC2', 'NCCT', 'ENaC', 'CFTR', 'AQP2',
      'AVPR2', 'AVPR1A', 'AVPR1B', 'AVP', 'OXT', 'OXTR', 'ADH', 'GNAS', 'GNAQ', 'GNA11', 'PLCB1', 'IP3R1', 'CACNA1C', 'CAMK2A', 'PRKCA', 'MAPK1', 'MAPK3', 'AKT1', 'PIK3CA'
    ],
    'Vascular Tone': [
      'NOS3', 'NOS2', 'NOS1', 'ARG1', 'ARG2', 'DDAH1', 'DDAH2', 'ADMA', 'PRMT1', 'PRMT5', 'EDN1', 'EDN2', 'EDN3', 'EDNRA', 'EDNRB', 'ECE1', 'ECE2', 'GUCY1A1', 'GUCY1B1',
      'PDE5A', 'PDE1A', 'PDE1C', 'PDE2A', 'PDE3A', 'PDE3B', 'ADCY1', 'ADCY2', 'ADCY3', 'ADCY5', 'ADCY6', 'GNAS', 'GNAI1', 'GNAI2', 'GNAQ', 'GNA11', 'GNA12', 'GNA13', 'RHOA', 'ROCK1',
      'ROCK2', 'MYL9', 'MYLK', 'MYLK2', 'MYLK3', 'MYLK4', 'PPP1CB', 'PPP1CC', 'MYPT1', 'CPI17', 'ACTA2', 'MYH11', 'CNN1', 'TAGLN', 'CALR', 'CALM1', 'CALM2', 'CALM3', 'S100A4'
    ],
    'Sodium Balance': [
      'SLC12A1', 'SLC12A3', 'SCNN1A', 'SCNN1B', 'SCNN1G', 'KCNJ1', 'CLCNKB', 'CLCNKA', 'ATP1A1', 'ATP1B1', 'ATP1B3', 'SLC9A3', 'SLC9A1', 'SLC4A4', 'SLC4A5', 'CA2', 'CA4', 'CA12',
      'WNK1', 'WNK2', 'WNK3', 'WNK4', 'STK39', 'OXSR1', 'SPAK', 'NEDD4L', 'SGK1', 'KLHL3', 'CUL3', 'UBQLN2', 'USP2', 'STUB1', 'CHIP', 'HSP70', 'HSP90', 'FKBP5', 'DNAJB1',
      'NR3C2', 'NR3C1', 'HSD11B2', 'HSD11B1', 'CYP11B2', 'CYP11B1', 'STAR', 'CYP11A1', 'HSD3B2', 'CYP21A2', 'CYP17A1', 'FDXR', 'FDX1', 'POR', 'SULT2A1', 'UGT2B7', 'UGT2B15', 'UGT2B17', 'COMT'
    ],
    'Baroreceptor Response': [
      'ADRB1', 'ADRB2', 'ADRB3', 'ADRA1A', 'ADRA1B', 'ADRA1D', 'ADRA2A', 'ADRA2B', 'ADRA2C', 'GRK2', 'GRK5', 'ARRB1', 'ARRB2', 'GNAS', 'GNAI1', 'GNAI2', 'GNAQ', 'GNA11',
      'ADCY1', 'ADCY2', 'ADCY5', 'ADCY6', 'PDE3A', 'PDE3B', 'PDE4A', 'PDE4B', 'PDE4D', 'PRKACA', 'PRKACB', 'PRKAR1A', 'PRKAR2A', 'AKAP1', 'AKAP5', 'AKAP6', 'AKAP7', 'AKAP9', 'AKAP10',
      'PLCB1', 'PLCB2', 'PLCB3', 'IP3R1', 'IP3R2', 'RYR2', 'CACNA1C', 'CACNA1D', 'CACNA1S', 'CACNB1', 'CACNB2', 'KCNJ3', 'KCNJ5', 'KCNH2', 'KCNQ1', 'SCN5A', 'CAMK2A', 'CAMK2D', 'PRKCA'
    ],
    'Cardiac Conduction': [
      'SCN5A', 'SCN1B', 'SCN2B', 'SCN3B', 'SCN4B', 'KCNQ1', 'KCNE1', 'KCNH2', 'KCNE2', 'KCNJ2', 'KCNJ12', 'KCNA5', 'KCND3', 'CACNA1C', 'CACNB2', 'CACNA2D1', 'RYR2', 'CASQ2',
      'HCN1', 'HCN2', 'HCN3', 'HCN4', 'KCNF1', 'KCNG2', 'KCNG3', 'KCNH1', 'KCNH6', 'KCNH7', 'KCNIP2', 'KCNAB1', 'KCNAB2', 'KCNMB1', 'KCNMB2', 'KCNN1', 'KCNN2', 'KCNN3', 'KCNN4',
      'GJA1', 'GJA5', 'GJC1', 'NPPA', 'NPPB', 'NPR1', 'NPR2', 'NPR3', 'GUCY1A2', 'GUCY1B2', 'PDE2A', 'PDE5A', 'PRKG1', 'PRKG2', 'VASP', 'IRAG', 'IP3K', 'MRVI1', 'FXYD1'
    ],
    'Autonomic Control': [
      'CHAT', 'ACHE', 'CHRM1', 'CHRM2', 'CHRM3', 'CHRNA1', 'CHRNA3', 'CHRNA4', 'CHRNA7', 'CHRNB2', 'CHRNB4', 'TH', 'DBH', 'PNMT', 'COMT', 'MAOA', 'MAOB', 'SLC6A2', 'SLC6A3',
      'ADRB1', 'ADRB2', 'ADRB3', 'ADRA1A', 'ADRA1B', 'ADRA2A', 'ADRA2B', 'ADRA2C', 'DRD1', 'DRD2', 'DRD3', 'DRD4', 'DRD5', 'HTR1A', 'HTR1B', 'HTR2A', 'HTR2C', 'HTR3A', 'HTR4',
      'GABA', 'GABRA1', 'GABRA2', 'GABRB1', 'GABRB2', 'GABRG2', 'SLC6A1', 'GAD1', 'GAD2', 'VGAT', 'VGLUT1', 'VGLUT2', 'SLC17A6', 'SLC17A7', 'GLS', 'GLUL', 'SLC1A2', 'SLC1A3', 'EAAT1'
    ],
    'Calcium Handling': [
      'RYR2', 'CASQ2', 'TRDN', 'JUNC', 'SRL', 'FKBP12', 'FKBP12.6', 'CAMK2A', 'CAMK2D', 'PP1', 'PP2A', 'PLN', 'SERCA2', 'ATP2A2', 'SLN', 'DWORF', 'NCX1', 'SLC8A1', 'PMCA1',
      'ATP2B1', 'ATP2B2', 'ATP2B3', 'ATP2B4', 'CACNA1C', 'CACNA1D', 'CACNA1S', 'CACNB1', 'CACNB2', 'CACNA2D1', 'CACNA2D2', 'CALM1', 'CALM2', 'CALM3', 'CALR', 'S100A1', 'TNNT2', 'TNNI3',
      'TNNC1', 'TPM1', 'MYL2', 'MYL3', 'ACTC1', 'MYH6', 'MYH7', 'MYBPC3', 'ACTN2', 'TTN', 'TCAP', 'LDB3', 'MYOZ2', 'CSRP3', 'ANKRD1', 'XIRP1', 'XIRP2', 'OBSCN', 'NEBL'
    ],
    'Beta-Adrenergic Signaling': [
      'ADRB1', 'ADRB2', 'ADRB3', 'GNAS', 'GNAI1', 'ADCY1', 'ADCY2', 'ADCY5', 'ADCY6', 'PRKACA', 'PRKACB', 'PRKAR1A', 'PRKAR2A', 'PDE3A', 'PDE3B', 'PDE4A', 'PDE4B', 'PDE4D', 'AKAP1',
      'AKAP5', 'AKAP6', 'AKAP7', 'AKAP9', 'AKAP10', 'AKAP12', 'AKAP13', 'GRK2', 'GRK5', 'ARRB1', 'ARRB2', 'CREB1', 'ATF1', 'CAMK2A', 'CAMK2D', 'PLN', 'RYR2', 'CACNA1C', 'TNNI3',
      'MYL2', 'MYBPC3', 'TPM1', 'ACTC1', 'MYH6', 'MYH7', 'SERCA2', 'NCX1', 'PMCA1', 'CASQ2', 'CALM1', 'CALM2', 'CALM3', 'S100A1', 'FKBP12', 'PP1', 'PP2A', 'YWHAZ', 'YWHAB'
    ],
    'Thermogenesis': [
      'UCP1', 'UCP2', 'UCP3', 'PPARA', 'PPARG', 'PPARGC1A', 'PPARGC1B', 'PRDM16', 'CIDEA', 'CIDEC', 'DIO2', 'ADRB3', 'ADCY3', 'PRKACA', 'CREB1', 'ATF2', 'CEBPB', 'CEBPA', 'KLF15',
      'FABP4', 'FABP5', 'CD36', 'CPT1B', 'CPT2', 'ACADM', 'ACADL', 'HADHA', 'HADHB', 'ACOX1', 'EHHADH', 'SCD1', 'ELOVL3', 'DGAT1', 'DGAT2', 'PLIN1', 'PLIN5', 'ATGL', 'HSL', 'MAGL',
      'THRB', 'THRA', 'THRSP', 'SPOT14', 'ME1', 'G6PD', 'ACLY', 'FASN', 'ACC1', 'ACC2', 'GPAM', 'AGPAT2', 'LPIN1', 'DGAT1', 'DGAT2', 'MOGAT1', 'MOGAT2', 'MGAT1', 'MGAT2'
    ],
    'Heat Shock Response': [
      'HSF1', 'HSF2', 'HSF4', 'HSPA1A', 'HSPA1B', 'HSPA1L', 'HSPA2', 'HSPA4', 'HSPA5', 'HSPA6', 'HSPA8', 'HSPA9', 'HSPA12A', 'HSPA13', 'HSPA14', 'HSPB1', 'HSPB2', 'HSPB3', 'HSPB4',
      'HSPB5', 'HSPB6', 'HSPB7', 'HSPB8', 'HSPB9', 'HSPB10', 'HSPB11', 'HSPC1', 'HSPC2', 'HSPC3', 'HSPC4', 'HSPC5', 'DNAJA1', 'DNAJA2', 'DNAJA3', 'DNAJA4', 'DNAJB1', 'DNAJB2', 'DNAJB3',
      'DNAJB4', 'DNAJB5', 'DNAJB6', 'DNAJB7', 'DNAJB8', 'DNAJB9', 'DNAJB11', 'DNAJB12', 'DNAJB13', 'DNAJB14', 'CCT1', 'CCT2', 'CCT3', 'CCT4', 'CCT5', 'CCT6A', 'CCT6B', 'CCT7', 'CCT8'
    ],
    'Hypothalamic Control': [
      'TRH', 'TRHR', 'TSH', 'TSHR', 'CRH', 'CRHR1', 'CRHR2', 'ACTH', 'MC2R', 'GnRH', 'GNRHR', 'LH', 'FSH', 'LHCGR', 'FSHR', 'GH', 'GHR', 'IGF1', 'IGF1R', 'PRL', 'PRLR', 'OXT', 'OXTR',
      'AVP', 'AVPR1A', 'AVPR1B', 'AVPR2', 'POMC', 'AGRP', 'NPY', 'CART', 'MCH', 'HCRT', 'LEPR', 'GHSR', 'MC3R', 'MC4R', 'Y1R', 'Y2R', 'Y5R', 'MCHR1', 'HCRTR1', 'HCRTR2',
      'GNAS', 'GNAQ', 'GNA11', 'GNAI1', 'GNAI2', 'ADCY1', 'ADCY2', 'ADCY5', 'ADCY6', 'PLCB1', 'PLCB2', 'PLCB3', 'IP3R1', 'IP3R2', 'IP3R3', 'CACNA1C', 'CACNA1D', 'KCNJ3', 'KCNJ5'
    ],
    'Brown Fat Activation': [
      'UCP1', 'PPARGC1A', 'PRDM16', 'CEBPB', 'PPARG', 'CIDEA', 'DIO2', 'ADRB3', 'TBX1', 'IRF4', 'MRTFA', 'MRTFB', 'EBF2', 'ZIC1', 'LHX8', 'SHOX2', 'EN1', 'MSX1', 'TBX15', 'HOXC9',
      'HOXC8', 'HOXC10', 'EVX1', 'ZFP423', 'EBF1', 'EBF3', 'FOXC2', 'KLF11', 'KLF15', 'ZFPM2', 'TWIST1', 'TWIST2', 'TCF21', 'WT1', 'TBX18', 'OSR1', 'OSR2', 'PAX3', 'PAX7', 'MYF5',
      'MYOD1', 'MYOG', 'MRF4', 'MEF2A', 'MEF2C', 'MEF2D', 'SIX1', 'SIX4', 'EYA1', 'EYA2', 'DACH1', 'DACH2', 'PITX2', 'PITX3', 'LBX1', 'MSX2', 'DLX5', 'DLX6', 'BARX1'
    ]
  };
  
  const names = geneNames[pathway] || [];
  let baseName = '';
  
  if (names.length > index && names[index]) {
    baseName = names[index];
  } else {
    // Generate fallback name for indices beyond the predefined list
    const pathwayAbbrev = pathway.split(' ').map(w => w.charAt(0)).join('');
    const omicsAbbrev = omicsType === OmicsType.mRNA ? 'G' :
                       omicsType === OmicsType.PROTEIN ? 'P' :
                       omicsType === OmicsType.METABOLITE ? 'M' : 'L';
    baseName = `${pathwayAbbrev}${omicsAbbrev}${index + 1}`;
  }
  
  // Add timepoint suffix for clarity (optional)
  const timeSuffix = timepoint.replace(/\s+/g, '').replace('min', 'm').replace('hours', 'h');
  return `${baseName}_${timeSuffix}`;
};

// Generate links with complex causal chains within pathways
const generateLinks = (nodes: BiologicalNode[]): BiologicalLink[] => {
  const links: BiologicalLink[] = [];
  
  // Group nodes by pathway, timepoint, category, and omics type for complex chain building
  const nodesByPathway: { [key: string]: BiologicalNode[] } = {};
  const nodesByTimepoint: { [key: string]: BiologicalNode[] } = {};
  const nodesByCategory: { [key: string]: BiologicalNode[] } = {};
  const nodesByOmicsType: { [key in OmicsType]: BiologicalNode[] } = {
    [OmicsType.mRNA]: [],
    [OmicsType.PROTEIN]: [],
    [OmicsType.METABOLITE]: [],
    [OmicsType.LIPID]: []
  };
  
  nodes.forEach(node => {
    // Group by pathway (MOST IMPORTANT for causal chains)
    if (!nodesByPathway[node.pathway]) {
      nodesByPathway[node.pathway] = [];
    }
    nodesByPathway[node.pathway].push(node);
    
    // Group by timepoint
    const timepoint = (node as any).timepoint || '10 min';
    if (!nodesByTimepoint[timepoint]) {
      nodesByTimepoint[timepoint] = [];
    }
    nodesByTimepoint[timepoint].push(node);
    
    // Group by category - handle both single and multiple categories
    const categories = Array.isArray(node.broadCategory) ? node.broadCategory : [node.broadCategory || 'Energy Metabolism'];
    categories.forEach(category => {
      if (!nodesByCategory[category]) {
        nodesByCategory[category] = [];
      }
      nodesByCategory[category].push(node);
    });
    
    // Group by omics type
    nodesByOmicsType[node.type].push(node);
  });

  // 1. CREATE DENSE WITHIN-PATHWAY NETWORKS (Primary causal chains)
  Object.entries(nodesByPathway).forEach(([pathway, pathwayNodes]) => {
    console.log(`Creating dense network for pathway: ${pathway} with ${pathwayNodes.length} nodes`);
    
    // Group pathway nodes by timepoint for temporal cascade
    const pathwayByTime: { [key: string]: BiologicalNode[] } = {};
    pathwayNodes.forEach(node => {
      const timepoint = (node as any).timepoint || '10 min';
      if (!pathwayByTime[timepoint]) {
        pathwayByTime[timepoint] = [];
      }
      pathwayByTime[timepoint].push(node);
    });
    
    // Create DENSE connections within each timepoint for the same pathway
    Object.values(pathwayByTime).forEach(timepointNodes => {
      // Connect each node to 2-4 other nodes in the same pathway and timepoint
      timepointNodes.forEach(sourceNode => {
        const numConnections = Math.min(2 + Math.floor(Math.random() * 3), timepointNodes.length - 1);
        const otherNodes = timepointNodes.filter(n => n.id !== sourceNode.id);
        
        // Shuffle and take first numConnections
        const shuffled = otherNodes.sort(() => Math.random() - 0.5);
        const targets = shuffled.slice(0, numConnections);
        
        targets.forEach(targetNode => {
          // Avoid duplicate links
          if (!links.some(l => 
            (l.source === sourceNode.id && l.target === targetNode.id) ||
            (l.source === targetNode.id && l.target === sourceNode.id)
          )) {
            const baseStrength = 0.6 + Math.random() * 0.3; // Strong within-pathway connections
            links.push({
              source: sourceNode.id,
              target: targetNode.id,
              strength: baseStrength,
              baselineStrength: baseStrength,
              type: 'regulation'
            });
          }
        });
      });
    });
    
    // Create temporal cascade within the same pathway (early → later timepoints)
    TIME_SERIES.forEach((timepoint, timeIndex) => {
      if (timeIndex < TIME_SERIES.length - 1) {
        const currentNodes = pathwayByTime[timepoint] || [];
        const nextTimepoint = TIME_SERIES[timeIndex + 1];
        const nextNodes = pathwayByTime[nextTimepoint] || [];
        
        // Connect MANY nodes from current timepoint to next timepoint within same pathway
        currentNodes.forEach(currentNode => {
          const numForwardConnections = 1 + Math.floor(Math.random() * 3); // 1-3 forward connections
          
          for (let i = 0; i < numForwardConnections && i < nextNodes.length; i++) {
            const targetNode = nextNodes[Math.floor(Math.random() * nextNodes.length)];
            if (!links.some(l => 
              (l.source === currentNode.id && l.target === targetNode.id) ||
              (l.source === targetNode.id && l.target === currentNode.id)
            )) {
              const baseStrength = 0.5 + Math.random() * 0.4; // Strong temporal connections
              links.push({
                source: currentNode.id,
                target: targetNode.id,
                strength: baseStrength,
                baselineStrength: baseStrength,
                type: 'regulation'
              });
            }
          }
        });
      }
    });
    
    // Create some backward connections within pathway (feedback loops)
    TIME_SERIES.forEach((timepoint, timeIndex) => {
      if (timeIndex > 0) {
        const currentNodes = pathwayByTime[timepoint] || [];
        const prevTimepoint = TIME_SERIES[timeIndex - 1];
        const prevNodes = pathwayByTime[prevTimepoint] || [];
        
        // Occasional feedback connections (later → earlier timepoints)
        currentNodes.forEach(currentNode => {
          if (Math.random() > 0.7 && prevNodes.length > 0) { // 30% chance for feedback
            const targetNode = prevNodes[Math.floor(Math.random() * prevNodes.length)];
            if (!links.some(l => 
              (l.source === currentNode.id && l.target === targetNode.id) ||
              (l.source === targetNode.id && l.target === currentNode.id)
            )) {
              const baseStrength = 0.3 + Math.random() * 0.3; // Moderate feedback strength
              links.push({
                source: currentNode.id,
                target: targetNode.id,
                strength: baseStrength,
                baselineStrength: baseStrength,
                type: 'regulation'
              });
            }
          }
        });
      }
    });
  });

  // 2. CREATE CROSS-PATHWAY CONNECTIONS WITHIN CATEGORIES
  Object.entries(nodesByCategory).forEach(([category, categoryNodes]) => {
    // Group by pathway within category
    const pathwaysInCategory: { [key: string]: BiologicalNode[] } = {};
    categoryNodes.forEach(node => {
      if (!pathwaysInCategory[node.pathway]) {
        pathwaysInCategory[node.pathway] = [];
      }
      pathwaysInCategory[node.pathway].push(node);
    });
    
    const pathwayNames = Object.keys(pathwaysInCategory);
    
    // Connect between pathways within the same category
    pathwayNames.forEach(pathway1 => {
      pathwayNames.forEach(pathway2 => {
        if (pathway1 !== pathway2) {
          const nodes1 = pathwaysInCategory[pathway1];
          const nodes2 = pathwaysInCategory[pathway2];
          
          // Create some cross-pathway connections within category
          nodes1.forEach(node1 => {
            if (Math.random() > 0.6) { // 40% chance for cross-pathway connection
              const node2 = nodes2[Math.floor(Math.random() * nodes2.length)];
              // Prefer same timepoint connections
              const sameTimepointNodes = nodes2.filter(n => (n as any).timepoint === (node1 as any).timepoint);
              const targetNode = sameTimepointNodes.length > 0 ? 
                sameTimepointNodes[Math.floor(Math.random() * sameTimepointNodes.length)] : node2;
              
              if (!links.some(l => 
                (l.source === node1.id && l.target === targetNode.id) ||
                (l.source === targetNode.id && l.target === node1.id)
              )) {
                const baseStrength = 0.3 + Math.random() * 0.3;
                links.push({
                  source: node1.id,
                  target: targetNode.id,
                  strength: baseStrength,
                  baselineStrength: baseStrength,
                  type: 'interaction'
                });
              }
            }
          });
        }
      });
    });
  });

  // 3. CREATE CROSS-CATEGORY CONNECTIONS (Broader network)
  Object.keys(nodesByCategory).forEach(category1 => {
    Object.keys(nodesByCategory).forEach(category2 => {
      if (category1 !== category2) {
        const nodes1 = nodesByCategory[category1];
        const nodes2 = nodesByCategory[category2];
        
        // Create sparse cross-category connections
        nodes1.forEach(node1 => {
          if (Math.random() > 0.8) { // 20% chance for cross-category connection
            const node2 = nodes2[Math.floor(Math.random() * nodes2.length)];
            if (!links.some(l => 
              (l.source === node1.id && l.target === node2.id) ||
              (l.source === node2.id && l.target === node1.id)
            )) {
              const baseStrength = 0.2 + Math.random() * 0.3;
              links.push({
                source: node1.id,
                target: node2.id,
                strength: baseStrength,
                baselineStrength: baseStrength,
                type: 'interaction'
              });
            }
          }
        });
      }
    });
  });

  // 4. CREATE OMICS-SPECIFIC INTERACTION NETWORKS
  // mRNA → Protein connections (transcription/translation)
  nodesByOmicsType[OmicsType.mRNA].forEach(mrnaNode => {
    const samePathwayProteins = nodesByOmicsType[OmicsType.PROTEIN].filter(p => 
      p.pathway === mrnaNode.pathway
    );
    
    // Each mRNA connects to 1-2 proteins in same pathway
    const numConnections = Math.min(1 + Math.floor(Math.random() * 2), samePathwayProteins.length);
    const shuffledProteins = samePathwayProteins.sort(() => Math.random() - 0.5);
    
    shuffledProteins.slice(0, numConnections).forEach(proteinNode => {
      if (!links.some(l => 
        (l.source === mrnaNode.id && l.target === proteinNode.id) ||
        (l.source === proteinNode.id && l.target === mrnaNode.id)
      )) {
        const baseStrength = 0.7 + Math.random() * 0.2; // Strong mRNA→protein connections
        links.push({
          source: mrnaNode.id,
          target: proteinNode.id,
          strength: baseStrength,
          baselineStrength: baseStrength,
          type: 'regulation'
        });
      }
    });
  });

  // Protein → Metabolite connections (enzymatic reactions)
  nodesByOmicsType[OmicsType.PROTEIN].forEach(proteinNode => {
    const samePathwayMetabolites = nodesByOmicsType[OmicsType.METABOLITE].filter(m => 
      m.pathway === proteinNode.pathway
    );
    
    // Each protein connects to 1-3 metabolites in same pathway
    const numConnections = Math.min(1 + Math.floor(Math.random() * 3), samePathwayMetabolites.length);
    const shuffledMetabolites = samePathwayMetabolites.sort(() => Math.random() - 0.5);
    
    shuffledMetabolites.slice(0, numConnections).forEach(metaboliteNode => {
      if (!links.some(l => 
        (l.source === proteinNode.id && l.target === metaboliteNode.id) ||
        (l.source === metaboliteNode.id && l.target === proteinNode.id)
      )) {
        const baseStrength = 0.6 + Math.random() * 0.3; // Strong protein→metabolite connections
        links.push({
          source: proteinNode.id,
          target: metaboliteNode.id,
          strength: baseStrength,
          baselineStrength: baseStrength,
          type: 'conversion'
        });
      }
    });
  });

  // Metabolite → Lipid connections (lipid synthesis pathways)
  nodesByOmicsType[OmicsType.METABOLITE].forEach(metaboliteNode => {
    if (metaboliteNode.pathway.toLowerCase().includes('lipid') || 
        metaboliteNode.pathway.toLowerCase().includes('metabolism')) {
      const samePathwayLipids = nodesByOmicsType[OmicsType.LIPID].filter(l => 
        l.pathway === metaboliteNode.pathway
      );
      
      // Each relevant metabolite connects to 1-2 lipids
      const numConnections = Math.min(1 + Math.floor(Math.random() * 2), samePathwayLipids.length);
      const shuffledLipids = samePathwayLipids.sort(() => Math.random() - 0.5);
      
      shuffledLipids.slice(0, numConnections).forEach(lipidNode => {
        if (!links.some(l => 
          (l.source === metaboliteNode.id && l.target === lipidNode.id) ||
          (l.source === lipidNode.id && l.target === metaboliteNode.id)
        )) {
          const baseStrength = 0.5 + Math.random() * 0.3;
          links.push({
            source: metaboliteNode.id,
            target: lipidNode.id,
            strength: baseStrength,
            baselineStrength: baseStrength,
            type: 'conversion'
          });
        }
      });
    }
  });
  
  console.log(`Generated ${links.length} total links with complex causal chains`);
  return links;
};

// Apply drug perturbation effects
export const applyDrugPerturbation = (data: PathwayData, drug: DrugTreatment): PathwayData => {
  if (!data || !data.nodes || !data.links || !drug) {
    console.error('Invalid data or drug provided to applyDrugPerturbation');
    return data;
  }

  const perturbedNodes = data.nodes.map(node => {
    if (!node || !node.id || !node.name) {
      console.warn('Skipping invalid node in perturbation');
      return node;
    }
    
    const perturbedNode = { ...node };
    
    // Check if this node is affected by the drug - make it less restrictive
    const isTargetPathway = drug.targetPathways.includes(node.pathway);
    const isTargetOmics = drug.targetOmicsTypes.includes(node.type);
    const isTargetBroadCategory = drug.targetPathways.some(targetPath => {
      // Check if any target pathway belongs to the same broad category
      return Object.entries(BROAD_CATEGORIES).some(([category, pathways]) => 
        pathways.includes(targetPath) && pathways.includes(node.pathway)
      );
    });
    
    // More lenient targeting: target pathway OR target omics OR same broad category
    if (isTargetPathway || isTargetOmics || isTargetBroadCategory) {
      // Check if this specific node is in the drug effects
      const isUpregulated = drug.effects.upregulatedGenes.some(gene => 
        node.name.toUpperCase().includes(gene.toUpperCase()) || 
        gene.toUpperCase().includes(node.name.toUpperCase())
      );
      const isDownregulated = drug.effects.downregulatedGenes.some(gene => 
        node.name.toUpperCase().includes(gene.toUpperCase()) || 
        gene.toUpperCase().includes(node.name.toUpperCase())
      );
      
      if (isUpregulated) {
        const foldChange = 1.8 + Math.random() * 1.5; // 1.8x to 3.3x upregulation
        perturbedNode.perturbedExpression = (node.baselineExpression || node.expression || 1) * foldChange;
        perturbedNode.foldChange = foldChange;
        perturbedNode.isPerturbationTarget = true;
        perturbedNode.expression = perturbedNode.perturbedExpression;
      } else if (isDownregulated) {
        const foldChange = 0.15 + Math.random() * 0.45; // 0.15x to 0.6x downregulation
        perturbedNode.perturbedExpression = (node.baselineExpression || node.expression || 1) * foldChange;
        perturbedNode.foldChange = foldChange;
        perturbedNode.isPerturbationTarget = true;
        perturbedNode.expression = perturbedNode.perturbedExpression;
      } else {
        // More significant random perturbation for nodes in target pathways
        // This ensures we have visible drug effects even when gene names don't match exactly
        const randomValue = Math.random();
        let foldChange;
        
        if (randomValue < 0.4) {
          // 40% chance of upregulation (increased from 30%)
          foldChange = 1.5 + Math.random() * 1.0; // 1.5x to 2.5x upregulation
          perturbedNode.isPerturbationTarget = true;
        } else if (randomValue < 0.8) {
          // 40% chance of downregulation (increased from 30%)
          foldChange = 0.3 + Math.random() * 0.4; // 0.3x to 0.7x downregulation
          perturbedNode.isPerturbationTarget = true;
        } else {
          // 20% chance of mild change (decreased from 40%)
          foldChange = 0.85 + Math.random() * 0.3; // 0.85x to 1.15x mild change
        }
        
        perturbedNode.perturbedExpression = (node.baselineExpression || node.expression || 1) * foldChange;
        perturbedNode.foldChange = foldChange;
        perturbedNode.expression = perturbedNode.perturbedExpression;
      }
    } else {
      // No perturbation - keep baseline
      perturbedNode.perturbedExpression = node.baselineExpression || node.expression;
      perturbedNode.foldChange = 1.0;
      perturbedNode.expression = perturbedNode.perturbedExpression;
    }
    
    return perturbedNode;
  }).filter(node => node && node.id); // Filter out any invalid nodes
  
  const perturbedLinks = data.links.map(link => {
    if (!link || !link.source || !link.target) {
      console.warn('Skipping invalid link in perturbation');
      return link;
    }
    
    const perturbedLink = { ...link };
    
    // Check if this interaction is enhanced or disrupted
    const sourceNode = data.nodes.find(n => n && n.id === (typeof link.source === 'string' ? link.source : link.source.id));
    const targetNode = data.nodes.find(n => n && n.id === (typeof link.target === 'string' ? link.target : link.target.id));
    
    if (!sourceNode || !targetNode) {
      return link; // Skip if nodes not found
    }
    
    const isEnhanced = drug.effects.enhancedInteractions.some(enhanced => {
      return enhanced.includes(sourceNode.name || '') || enhanced.includes(targetNode.name || '');
    });
    
    const isDisrupted = drug.effects.disruptedInteractions.some(disrupted => {
      return disrupted.includes(sourceNode.name || '') || disrupted.includes(targetNode.name || '');
    });
    
    if (isEnhanced) {
      const strengthMultiplier = 1.6 + Math.random() * 1.2; // 1.6x to 2.8x enhancement
      perturbedLink.perturbedStrength = (link.baselineStrength || link.strength) * strengthMultiplier;
      perturbedLink.strengthChange = strengthMultiplier;
      perturbedLink.strength = perturbedLink.perturbedStrength;
    } else if (isDisrupted) {
      const strengthMultiplier = 0.1 + Math.random() * 0.3; // 0.1x to 0.4x disruption
      perturbedLink.perturbedStrength = (link.baselineStrength || link.strength) * strengthMultiplier;
      perturbedLink.strengthChange = strengthMultiplier;
      perturbedLink.strength = perturbedLink.perturbedStrength;
    } else {
      // More significant random changes for links in target pathways
      const sourceInTargetPathway = drug.targetPathways.includes(sourceNode.pathway || '');
      const targetInTargetPathway = drug.targetPathways.includes(targetNode.pathway || '');
      
      if (sourceInTargetPathway || targetInTargetPathway) {
        // Stronger effects for links involving target pathway nodes
        const randomValue = Math.random();
        let strengthMultiplier;
        
        if (randomValue < 0.3) {
          // 30% chance of enhancement (increased from 20%)
          strengthMultiplier = 1.4 + Math.random() * 0.8; // 1.4x to 2.2x enhancement
        } else if (randomValue < 0.6) {
          // 30% chance of disruption (increased from 20%)
          strengthMultiplier = 0.2 + Math.random() * 0.4; // 0.2x to 0.6x disruption
        } else {
          // 40% chance of mild change (decreased from 60%)
          strengthMultiplier = 0.8 + Math.random() * 0.4; // 0.8x to 1.2x
        }
        
        perturbedLink.perturbedStrength = (link.baselineStrength || link.strength) * strengthMultiplier;
        perturbedLink.strengthChange = strengthMultiplier;
        perturbedLink.strength = perturbedLink.perturbedStrength;
      } else {
        // Very mild changes for other links
        const strengthMultiplier = 0.95 + Math.random() * 0.1; // 0.95x to 1.05x
        perturbedLink.perturbedStrength = (link.baselineStrength || link.strength) * strengthMultiplier;
        perturbedLink.strengthChange = strengthMultiplier;
        perturbedLink.strength = perturbedLink.perturbedStrength;
      }
    }
    
    return perturbedLink;
  }).filter(link => link && link.source && link.target); // Filter out any invalid links
  
  return {
    nodes: perturbedNodes,
    links: perturbedLinks,
    pathways: ALL_PATHWAYS,
    broadCategories: Object.keys(BROAD_CATEGORIES)
  };
};

export const generateMockData = (): PathwayData => {
  const nodes = generateNodes();
  const links = generateLinks(nodes);
  
  // Validate that all nodes have required properties
  const validNodes = nodes.filter(node => 
    node && 
    node.id && 
    node.name && 
    node.type && 
    node.pathway && 
    node.broadCategory &&
    typeof node.expression === 'number' &&
    typeof node.baselineExpression === 'number'
  );
  
  // Validate that all links reference existing nodes
  const nodeIds = new Set(validNodes.map(n => n.id));
  const validLinks = links.filter(link => 
    link && 
    link.source && 
    link.target && 
    typeof link.strength === 'number' &&
    nodeIds.has(typeof link.source === 'string' ? link.source : link.source.id) &&
    nodeIds.has(typeof link.target === 'string' ? link.target : link.target.id)
  );
  
  console.log(`Generated ${validNodes.length} valid nodes and ${validLinks.length} valid links`);
  
  return {
    nodes: validNodes,
    links: validLinks,
    pathways: ALL_PATHWAYS,
    broadCategories: Object.keys(BROAD_CATEGORIES)
  };
}; 