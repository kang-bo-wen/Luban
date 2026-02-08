// types/graph.ts

/**
 * Represents a node in the visual graph.
 */
export interface MatterNode {
  id: string;           // UUID
  label: string;        // e.g., "Screen", "Glass", "Sand"
  type: 'root' | 'component' | 'raw_material';
  parentId: string | null;
  description?: string; // Short scientific/humorous description

  // State flags
  isExpanded: boolean;  // Has the user clicked this yet?
  isTerminal: boolean;  // Is this a natural resource? (Stops recursion)

  // Visual meta
  icon?: string;        // Optional emoji or icon name
}

/**
 * The structure expected from the Gemini API.
 */
export interface DeconstructionResponse {
  parent_item: string;
  parts: {
    name: string;
    description: string;
    is_raw_material: boolean; // TRUE if it exists in nature (e.g. Iron Ore, Water)
    icon: string;             // Emoji icon representing this part
    percentage?: number;      // Estimated composition percentage
  }[];
}

/**
 * The structure for initial image identification.
 */
export interface IdentificationResponse {
  name: string;
  category: string;
  brief_description: string;
  icon: string; // Emoji icon representing the identified object
}
