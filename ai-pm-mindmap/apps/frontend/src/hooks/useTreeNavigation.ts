import { useCallback, type KeyboardEvent } from 'react';
import { useStoryStore } from '../store/useStoryStore';

export interface TreeNodeRef {
  id: string;
  parentId: string | null;
  hasChildren: boolean;
  isExpanded: boolean;
}

export function useTreeNavigation(nodes: TreeNodeRef[]) {
  const { toggleExpanded, selectStory } = useStoryStore();

  const findIndex = (id: string) => nodes.findIndex((node) => node.id === id);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>, id: string) => {
      const index = findIndex(id);
      if (index === -1) return;
      const node = nodes[index];
      switch (event.key) {
        case 'ArrowDown': {
          const next = nodes[index + 1];
          if (next) {
            document.querySelector<HTMLElement>(`[data-tree-id="${next.id}"]`)?.focus();
            selectStory(next.id);
            event.preventDefault();
          }
          break;
        }
        case 'ArrowUp': {
          const prev = nodes[index - 1];
          if (prev) {
            document.querySelector<HTMLElement>(`[data-tree-id="${prev.id}"]`)?.focus();
            selectStory(prev.id);
            event.preventDefault();
          }
          break;
        }
        case 'ArrowRight': {
          if (node.hasChildren && !node.isExpanded) {
            toggleExpanded(node.id, true);
          }
          event.preventDefault();
          break;
        }
        case 'ArrowLeft': {
          if (node.hasChildren && node.isExpanded) {
            toggleExpanded(node.id, false);
          } else if (node.parentId) {
            document.querySelector<HTMLElement>(`[data-tree-id="${node.parentId}"]`)?.focus();
            selectStory(node.parentId);
          }
          event.preventDefault();
          break;
        }
        case 'Enter': {
          toggleExpanded(node.id);
          event.preventDefault();
          break;
        }
        default:
          break;
      }
    },
    [nodes, selectStory, toggleExpanded]
  );

  return { onKeyDown };
}
