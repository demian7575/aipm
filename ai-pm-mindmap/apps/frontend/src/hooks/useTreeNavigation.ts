import { useEffect, useState } from 'react';
import type { TreeNode } from '../store/useStoryStore';

interface Options {
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  expanded: Record<string, boolean>;
}

export function useTreeNavigation(nodes: TreeNode[], options: Options) {
  const [focused, setFocused] = useState<string | null>(null);

  useEffect(() => {
    if (!focused && nodes.length > 0) {
      setFocused(nodes[0].id);
    }
  }, [nodes, focused]);

  const flatList = flatten(nodes, options.expanded);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!focused) return;
    const currentIndex = flatList.findIndex((item) => item.id === focused);
    if (event.key === 'ArrowDown') {
      const next = flatList[currentIndex + 1];
      if (next) setFocused(next.id);
      event.preventDefault();
    } else if (event.key === 'ArrowUp') {
      const prev = flatList[currentIndex - 1];
      if (prev) setFocused(prev.id);
      event.preventDefault();
    } else if (event.key === 'ArrowRight') {
      if (!options.expanded[focused]) {
        options.onToggle(focused);
      }
      event.preventDefault();
    } else if (event.key === 'ArrowLeft') {
      if (options.expanded[focused]) {
        options.onToggle(focused);
      }
      event.preventDefault();
    } else if (event.key === 'Enter') {
      options.onSelect(focused);
      event.preventDefault();
    }
  };

  return {
    focused,
    setFocused,
    onKeyDown
  };
}

function flatten(nodes: TreeNode[], expanded: Record<string, boolean>, acc: TreeNode[] = []) {
  for (const node of nodes) {
    acc.push(node);
    if (expanded[node.id]) {
      flatten(node.children, expanded, acc);
    }
  }
  return acc;
}
