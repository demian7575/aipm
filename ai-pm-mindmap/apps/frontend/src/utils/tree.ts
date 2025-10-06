import { StoryNode } from './api';

export const findStoryNode = (nodes: StoryNode[], id: string): StoryNode | undefined => {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findStoryNode(node.children, id);
    if (found) return found;
  }
  return undefined;
};

export const findParentId = (nodes: StoryNode[], id: string, parentId: string | null = null): string | null => {
  for (const node of nodes) {
    if (node.id === id) return parentId;
    const result = findParentId(node.children, id, node.id);
    if (result !== null) return result;
  }
  return null;
};

export const collectVisibleNodes = (
  nodes: StoryNode[],
  expanded: Set<string>,
  depth = 0,
): { node: StoryNode; depth: number }[] => {
  const items: { node: StoryNode; depth: number }[] = [];
  nodes
    .slice()
    .sort((a, b) => a.order - b.order)
    .forEach((node) => {
      items.push({ node, depth });
      if (expanded.has(node.id)) {
        items.push(...collectVisibleNodes(node.children, expanded, depth + 1));
      }
    });
  return items;
};

export const computeDepth = (nodes: StoryNode[], id: string): number => {
  const node = findStoryNode(nodes, id);
  if (!node) return 0;
  return node.depth;
};

export const getPath = (nodes: StoryNode[], id: string): StoryNode[] => {
  const path: StoryNode[] = [];
  const traverse = (current: StoryNode[], stack: StoryNode[]) => {
    for (const node of current) {
      const nextStack = [...stack, node];
      if (node.id === id) {
        path.push(...nextStack);
        return true;
      }
      if (traverse(node.children, nextStack)) {
        return true;
      }
    }
    return false;
  };
  traverse(nodes, []);
  return path;
};

export const maxDepthAfterMove = (
  tree: StoryNode[],
  storyId: string,
  parentId: string | null,
): number => {
  const story = findStoryNode(tree, storyId);
  if (!story) return 0;
  const parent = parentId ? findStoryNode(tree, parentId) : undefined;
  const baseDepth = parent ? parent.depth + 1 : 0;
  const depthDifference = baseDepth - story.depth;
  let maxDepth = 0;
  const visit = (node: StoryNode) => {
    const candidateDepth = node.depth + depthDifference;
    if (candidateDepth > maxDepth) {
      maxDepth = candidateDepth;
    }
    node.children.forEach(visit);
  };
  visit(story);
  return maxDepth;
};
