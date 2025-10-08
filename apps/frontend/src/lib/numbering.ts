import type { RollupResult } from '@ai-pm/shared';

export interface NumberedNode extends RollupResult {
  label: string;
  index: number;
  path: number[];
}

export function numberStories(tree: RollupResult[], prefix: string[] = []): NumberedNode[] {
  return tree.flatMap((node, index) => {
    const path = [...prefix, index + 1];
    const label = `US${path.join('-')}`;
    const numbered: NumberedNode = { ...node, label, index, path };
    const children = numberStories(node.children, [...path]);
    return [numbered, ...children];
  });
}
