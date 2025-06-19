export enum OmicsType {
  mRNA = 'mRNA transcripts',
  PROTEIN = 'proteins',
  METABOLITE = 'metabolites',
  LIPID = 'lipids'
}

export interface BiologicalNode {
  id: string;
  name: string;
  type: OmicsType;
  pathway: string;
  broadCategory?: string | string[]; // Support both single and multiple categories
  timepoint?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
  expression?: number; // Expression level/abundance
  significance?: number; // p-value or similar
  confidence?: number; // Confidence in causal chain importance (0-1, higher = more confident)
  // Drug perturbation effects
  baselineExpression?: number;
  perturbedExpression?: number;
  foldChange?: number;
  isPerturbationTarget?: boolean;
  // Initial positioning for cascading layout
  initialX?: number;
  initialY?: number;
}

export interface BiologicalLink {
  source: string | BiologicalNode;
  target: string | BiologicalNode;
  strength: number; // Interaction strength
  type: 'regulation' | 'interaction' | 'conversion' | 'transport';
  // Drug perturbation effects
  baselineStrength?: number;
  perturbedStrength?: number;
  strengthChange?: number;
}

export interface PathwayData {
  nodes: BiologicalNode[];
  links: BiologicalLink[];
  pathways: string[];
  broadCategories?: string[];
}

export interface DrugTreatment {
  id: string;
  name: string;
  mechanism: string;
  targetPathways: string[];
  targetOmicsTypes: OmicsType[];
  effects: {
    upregulatedGenes: string[];
    downregulatedGenes: string[];
    enhancedInteractions: string[];
    disruptedInteractions: string[];
  };
}

export enum VisualizationMode {
  BASELINE = 'baseline',
  PERTURBED = 'perturbed',
  COMPARISON = 'comparison',
  ANIMATION = 'animation'
} 