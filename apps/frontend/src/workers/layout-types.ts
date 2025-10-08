import type { RollupResult } from '@ai-pm/shared';

export interface LayoutMessage {
  tree: RollupResult[];
}

export interface LayoutResponse {
  nodes: Array<{ id: string; position: { x: number; y: number }; data: { label: string; status: string } }>;
  edges: Array<{ id: string; source: string; target: string }>;
}
