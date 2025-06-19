import nlp from 'compromise';
import Fuse from 'fuse.js';
import { BiologicalNode, PathwayData, OmicsType } from '../types';
import { ALL_PATHWAYS, BROAD_CATEGORIES } from '../data/mockData';

export interface QueryResult {
  nodes: BiologicalNode[];
  explanation: string;
  confidence: number;
}

export class NaturalLanguageQueryParser {
  private pathwayFuse: Fuse<string>;
  private categoryFuse: Fuse<string>;
  private geneFuse: Fuse<BiologicalNode>;
  private omicsTypes: string[];
  private timepoints: string[];

  constructor(pathwayData: PathwayData) {
    // Initialize fuzzy search for pathways
    this.pathwayFuse = new Fuse(ALL_PATHWAYS, {
      threshold: 0.6,
      includeScore: true,
      keys: ['']
    });

    // Initialize fuzzy search for categories
    this.categoryFuse = new Fuse(Object.keys(BROAD_CATEGORIES), {
      threshold: 0.6,
      includeScore: true,
      keys: ['']
    });

    // Initialize fuzzy search for gene names
    this.geneFuse = new Fuse(pathwayData.nodes, {
      threshold: 0.4,
      includeScore: true,
      keys: ['name']
    });

    // Set up omics types and timepoints
    this.omicsTypes = Object.values(OmicsType);
    this.timepoints = ['10 min', '30 min', '90 min', '48 hours'];
  }

  parseQuery(query: string, allNodes: BiologicalNode[]): QueryResult {
    const doc = nlp(query.toLowerCase());
    const tokens = doc.terms().out('array');
    
    console.log('=== QUERY PARSING DEBUG ===');
    console.log('Original query:', query);
    console.log('Tokens:', tokens);
    console.log('Total nodes to filter:', allNodes.length);
    console.log('Sample node types:', allNodes.slice(0, 5).map(n => ({ name: n.name, type: n.type })));
    
    let filteredNodes = [...allNodes];
    let explanationParts: string[] = [];
    let confidence = 0.8;
    
    // Extract query components
    const queryComponents = this.extractQueryComponents(query, tokens);
    console.log('Extracted components:', queryComponents);
    
    // Apply filters based on extracted components
    if (queryComponents.omicsTypes.length > 0) {
      console.log('Applying omics type filter:', queryComponents.omicsTypes);
      const beforeCount = filteredNodes.length;
      filteredNodes = this.filterByOmicsType(filteredNodes, queryComponents.omicsTypes);
      console.log(`Omics filter: ${beforeCount} -> ${filteredNodes.length} nodes`);
      explanationParts.push(`filtered by omics types: ${queryComponents.omicsTypes.join(', ')}`);
    }
    
    if (queryComponents.pathways.length > 0) {
      console.log('Applying pathway filter:', queryComponents.pathways);
      const beforeCount = filteredNodes.length;
      filteredNodes = this.filterByPathways(filteredNodes, queryComponents.pathways);
      console.log(`Pathway filter: ${beforeCount} -> ${filteredNodes.length} nodes`);
      explanationParts.push(`filtered by pathways: ${queryComponents.pathways.join(', ')}`);
    }
    
    if (queryComponents.categories.length > 0) {
      console.log('Applying category filter:', queryComponents.categories);
      const beforeCount = filteredNodes.length;
      filteredNodes = this.filterByCategories(filteredNodes, queryComponents.categories);
      console.log(`Category filter: ${beforeCount} -> ${filteredNodes.length} nodes`);
      explanationParts.push(`filtered by categories: ${queryComponents.categories.join(', ')}`);
    }
    
    if (queryComponents.timepoints.length > 0) {
      console.log('Applying timepoint filter:', queryComponents.timepoints);
      const beforeCount = filteredNodes.length;
      filteredNodes = this.filterByTimepoints(filteredNodes, queryComponents.timepoints);
      console.log(`Timepoint filter: ${beforeCount} -> ${filteredNodes.length} nodes`);
      explanationParts.push(`filtered by timepoints: ${queryComponents.timepoints.join(', ')}`);
    }
    
    if (queryComponents.geneNames.length > 0) {
      console.log('Applying gene name filter:', queryComponents.geneNames);
      const beforeCount = filteredNodes.length;
      filteredNodes = this.filterByGeneNames(filteredNodes, queryComponents.geneNames);
      console.log(`Gene name filter: ${beforeCount} -> ${filteredNodes.length} nodes`);
      explanationParts.push(`filtered by gene names: ${queryComponents.geneNames.join(', ')}`);
    }
    
    if (queryComponents.expressionFilters.length > 0) {
      console.log('Applying expression filter:', queryComponents.expressionFilters);
      const beforeCount = filteredNodes.length;
      filteredNodes = this.filterByExpression(filteredNodes, queryComponents.expressionFilters);
      console.log(`Expression filter: ${beforeCount} -> ${filteredNodes.length} nodes`);
      explanationParts.push(`filtered by expression: ${queryComponents.expressionFilters.join(', ')}`);
    }
    
    if (queryComponents.drugFilters.length > 0) {
      console.log('Applying drug effect filter:', queryComponents.drugFilters);
      const beforeCount = filteredNodes.length;
      filteredNodes = this.filterByDrugEffects(filteredNodes, queryComponents.drugFilters);
      console.log(`Drug filter: ${beforeCount} -> ${filteredNodes.length} nodes`);
      explanationParts.push(`filtered by drug effects: ${queryComponents.drugFilters.join(', ')}`);
    }
    
    // Generate explanation
    const explanation = explanationParts.length > 0 
      ? `Found ${filteredNodes.length} nodes ${explanationParts.join(', ')}`
      : `Found ${filteredNodes.length} nodes (no specific filters applied)`;
    
    // Adjust confidence based on result quality
    if (filteredNodes.length === 0) {
      confidence = 0.2;
    } else if (filteredNodes.length === allNodes.length) {
      confidence = 0.4;
    } else if (queryComponents.categories.length + queryComponents.pathways.length + queryComponents.omicsTypes.length > 0) {
      confidence = 0.9;
    }
    
    console.log('Final result:', {
      nodeCount: filteredNodes.length,
      explanation,
      confidence
    });
    console.log('=== END QUERY PARSING DEBUG ===');
    
    return {
      nodes: filteredNodes,
      explanation,
      confidence
    };
  }

  private extractQueryComponents(query: string, tokens: string[]) {
    const components = {
      omicsTypes: [] as string[],
      pathways: [] as string[],
      categories: [] as string[],
      timepoints: [] as string[],
      geneNames: [] as string[],
      expressionFilters: [] as string[],
      drugFilters: [] as string[]
    };
    
    const lowerQuery = query.toLowerCase();
    
    // Extract omics types with exact matching to enum values
    if (lowerQuery.includes('protein')) {
      components.omicsTypes.push(OmicsType.PROTEIN); // 'proteins'
    }
    if (lowerQuery.includes('metabolite')) {
      components.omicsTypes.push(OmicsType.METABOLITE); // 'metabolites'
    }
    if (lowerQuery.includes('lipid')) {
      components.omicsTypes.push(OmicsType.LIPID); // 'lipids'
    }
    if (lowerQuery.includes('transcript') || lowerQuery.includes('mrna') || lowerQuery.includes('gene')) {
      components.omicsTypes.push(OmicsType.mRNA); // 'mRNA transcripts'
    }
    
    // Extract timepoints
    this.timepoints.forEach(timepoint => {
      if (lowerQuery.includes(timepoint.toLowerCase())) {
        components.timepoints.push(timepoint);
      }
    });
    
    // Handle relative timepoint references - only if explicitly mentioned
    if (lowerQuery.includes('early') || lowerQuery.includes('immediate')) {
      components.timepoints.push('10 min', '30 min');
    }
    if (lowerQuery.includes('late') || lowerQuery.includes('long-term')) {
      components.timepoints.push('90 min', '48 hours');
    }
    // Only add hours if explicitly mentioned, not just from "upregulated"
    if (lowerQuery.includes('hours') && !lowerQuery.includes('upregulated') && !lowerQuery.includes('downregulated')) {
      components.timepoints.push('48 hours');
    }
    
    // Extract pathways using fuzzy search
    const pathwayMatches = this.pathwayFuse.search(query);
    pathwayMatches.slice(0, 3).forEach(match => {
      if (match.score && match.score < 0.5) {
        components.pathways.push(match.item);
      }
    });
    
    // Extract categories using fuzzy search and direct matching
    const categoryMatches = this.categoryFuse.search(query);
    categoryMatches.slice(0, 2).forEach(match => {
      if (match.score && match.score < 0.6) {
        components.categories.push(match.item);
      }
    });
    
    // Also check for direct category matches with individual words
    Object.keys(BROAD_CATEGORIES).forEach(category => {
      const categoryWords = category.toLowerCase().split(' ');
      if (categoryWords.some(word => lowerQuery.includes(word))) {
        if (!components.categories.includes(category)) {
          components.categories.push(category);
        }
      }
    });
    
    // Extract expression filters
    if (lowerQuery.includes('upregulated') || lowerQuery.includes('increased') || lowerQuery.includes('higher') || lowerQuery.includes('up-regulated')) {
      components.expressionFilters.push('upregulated');
    }
    if (lowerQuery.includes('downregulated') || lowerQuery.includes('decreased') || lowerQuery.includes('lower') || lowerQuery.includes('down-regulated')) {
      components.expressionFilters.push('downregulated');
    }
    if (lowerQuery.includes('unchanged') || lowerQuery.includes('stable')) {
      components.expressionFilters.push('unchanged');
    }
    
    // Extract drug-related filters
    if (lowerQuery.includes('drug target') || lowerQuery.includes('affected by') || lowerQuery.includes('perturbed')) {
      components.drugFilters.push('drug_targets');
    }
    if (lowerQuery.includes('not affected') || lowerQuery.includes('unperturbed')) {
      components.drugFilters.push('not_drug_targets');
    }
    
    return components;
  }

  private filterByOmicsType(nodes: BiologicalNode[], omicsTypes: string[]): BiologicalNode[] {
    console.log('Filtering by omics types:', omicsTypes);
    console.log('Sample node types:', nodes.slice(0, 5).map(n => n.type));
    console.log('All unique node types in data:', Array.from(new Set(nodes.map(n => n.type))));
    
    if (omicsTypes.length === 0) return nodes;
    
    const filtered = nodes.filter(node => {
      return omicsTypes.some(omicsType => {
        // Direct exact matching with enum values
        const match = node.type === omicsType;
        if (match) {
          console.log(`✓ Matched node ${node.name} (${node.type}) with query type ${omicsType}`);
        }
        return match;
      });
    });
    
    console.log(`Filtered ${filtered.length} nodes out of ${nodes.length} by omics type`);
    return filtered;
  }

  private filterByPathways(nodes: BiologicalNode[], pathways: string[]): BiologicalNode[] {
    return nodes.filter(node => {
      return pathways.some(pathway => 
        node.pathway.toLowerCase().includes(pathway.toLowerCase()) ||
        pathway.toLowerCase().includes(node.pathway.toLowerCase())
      );
    });
  }

  private filterByCategories(nodes: BiologicalNode[], categories: string[]): BiologicalNode[] {
    console.log('Filtering by categories:', categories);
    console.log('Sample node categories:', nodes.slice(0, 5).map(n => n.broadCategory));
    
    return nodes.filter(node => {
      return categories.some(category => {
        // Handle both single string and array of strings for broadCategory
        const nodeCategories = Array.isArray(node.broadCategory) 
          ? node.broadCategory.map(cat => cat.toLowerCase()) 
          : node.broadCategory ? [node.broadCategory.toLowerCase()] : [];
        
        const queryCategory = category.toLowerCase();
        
        console.log(`Comparing node categories [${nodeCategories.join(', ')}] with query category "${queryCategory}"`);
        
        // Check if any of the node's categories match the query category
        const match = nodeCategories.some(nodeCategory => 
          nodeCategory.includes(queryCategory) || queryCategory.includes(nodeCategory)
        );
        
        if (match) {
          console.log('  -> Category matched!');
        }
        return match;
      });
    });
  }

  private filterByTimepoints(nodes: BiologicalNode[], timepoints: string[]): BiologicalNode[] {
    console.log('Filtering by timepoints:', timepoints);
    console.log('Sample node timepoints:', nodes.slice(0, 5).map(n => (n as any).timepoint));
    console.log('All unique timepoints in data:', Array.from(new Set(nodes.map(n => (n as any).timepoint).filter(Boolean))));
    
    if (timepoints.length === 0) return nodes;
    
    const filtered = nodes.filter(node => {
      const nodeTimepoint = (node as any).timepoint?.toLowerCase() || '';
      
      const matched = timepoints.some(timepoint => {
        const queryTimepoint = timepoint.toLowerCase();
        const match = nodeTimepoint.includes(queryTimepoint);
        if (match) {
          console.log(`✓ Matched node ${node.name} timepoint "${nodeTimepoint}" with query timepoint "${queryTimepoint}"`);
        }
        return match;
      });
      
      return matched;
    });
    
    console.log(`Filtered ${filtered.length} nodes out of ${nodes.length} by timepoint`);
    return filtered;
  }

  private filterByGeneNames(nodes: BiologicalNode[], geneNames: string[]): BiologicalNode[] {
    return nodes.filter(node => {
      return geneNames.some(geneName => 
        node.name.toUpperCase().includes(geneName) ||
        geneName.includes(node.name.toUpperCase())
      );
    });
  }

  private filterByExpression(nodes: BiologicalNode[], expressionFilters: string[]): BiologicalNode[] {
    console.log('Filtering by expression:', expressionFilters);
    console.log('Sample nodes with foldChange:', nodes.slice(0, 5).map(n => ({ name: n.name, foldChange: n.foldChange, expression: n.expression })));
    
    return nodes.filter(node => {
      // If no expression filters, return all nodes
      if (expressionFilters.length === 0) return true;
      
      return expressionFilters.some(filter => {
        switch (filter) {
          case 'upregulated':
            // Check foldChange first, then fall back to expression level
            if (node.foldChange !== undefined) {
              return node.foldChange > 1.2;
            } else if (node.expression !== undefined) {
              // For baseline data without foldChange, use expression level
              // Assume expression > 0.6 is "upregulated" (adjust threshold as needed)
              return node.expression > 0.6;
            }
            return false;
          case 'downregulated':
            if (node.foldChange !== undefined) {
              return node.foldChange < 0.8;
            } else if (node.expression !== undefined) {
              // For baseline data without foldChange, use expression level
              // Assume expression < 0.4 is "downregulated" (adjust threshold as needed)
              return node.expression < 0.4;
            }
            return false;
          case 'unchanged':
            if (node.foldChange !== undefined) {
              return node.foldChange >= 0.8 && node.foldChange <= 1.2;
            } else if (node.expression !== undefined) {
              // For baseline data, assume expression between 0.4-0.6 is "unchanged"
              return node.expression >= 0.4 && node.expression <= 0.6;
            }
            return false;
          default:
            return true;
        }
      });
    });
  }

  private filterByDrugEffects(nodes: BiologicalNode[], drugFilters: string[]): BiologicalNode[] {
    return nodes.filter(node => {
      return drugFilters.some(filter => {
        switch (filter) {
          case 'drug_targets':
            return node.isPerturbationTarget === true;
          case 'not_drug_targets':
            return node.isPerturbationTarget !== true;
          default:
            return true;
        }
      });
    });
  }
}

// Example usage patterns for the NLP query system
export const EXAMPLE_QUERIES = [
  "Show me proteins that are upregulated",
  "Find metabolites in energy metabolism",
  "Which genes are affected by drugs?",
  "Show lipids that decrease after 48 hours",
  "Find proteins in immune response pathways",
  "Show early response genes (10 min)",
  "Which metabolites are drug targets?",
  "Find downregulated proteins in oxidative stress",
  "Show unchanged lipids in circadian rhythm",
  "Find mRNA transcripts in heart rate pathways"
]; 