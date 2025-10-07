export interface StoryTreeNode {
  id: string;
  parentId: string | null;
  depth: number;
  order: number;
}

export interface TreeMovePayload {
  parentId: string | null;
  index: number;
}

export interface TreeReorderPayload {
  order: string[];
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: unknown;
}
