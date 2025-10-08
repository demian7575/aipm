import clsx from 'clsx';
import type { StoryTreeNode } from '@ai-pm/shared/types';
import { useStoriesStore } from '../store/useStoriesStore';

interface OutlineTreeProps {
  nodes: StoryTreeNode[];
  onMove: (storyId: string, parentId: string | null, index: number) => void;
  canMove: (storyId: string, parentId: string | null) => boolean;
  className?: string;
  hidden?: boolean;
}

interface TreeNodeProps {
  node: StoryTreeNode;
  level: number;
  parentId: string | null;
  index: number;
  onMove: OutlineTreeProps['onMove'];
  canMove: OutlineTreeProps['canMove'];
}

export default function OutlineTree({ nodes, onMove, canMove, className, hidden }: OutlineTreeProps) {
  const store = useStoriesStore();
  const { expandedIds, selectedStoryId } = store;

  return (
    <div
      role="tree"
      aria-label="Story outline"
      className={clsx('outline-tree', className)}
      aria-hidden={hidden}
    >
      <ul>
        {nodes.map((node, index) => (
          <TreeNode
            key={node.story.id}
            node={node}
            level={1}
            parentId={null}
            index={index}
            onMove={handleMove}
            canMove={canMove}
          />
        ))}
      </ul>
    </div>
  );

  function handleMove(storyId: string, parentId: string | null, index: number) {
    onMove(storyId, parentId, index);
  }

  function TreeNode({ node, level, parentId, index, onMove: move, canMove }: TreeNodeProps) {
    const expanded = expandedIds.includes(node.story.id);
    const isSelected = selectedStoryId === node.story.id;

    const handleToggle = (event: React.MouseEvent) => {
      if (event.shiftKey) {
        // Expand/collapse recursively by toggling and applying to children
        const ids = collectDescendantIds(node);
        if (expanded) {
          const remaining = store.expandedIds.filter((id) => !ids.includes(id));
          store.expandAll(remaining);
        } else {
          store.expandAll([...new Set([...expandedIds, ...ids])]);
        }
      } else {
        store.toggleNode(node.story.id);
      }
    };

    const handleSelect = () => {
      store.setSelected(node.story.id);
    };

    const handleDragStart = (event: React.DragEvent) => {
      event.dataTransfer.setData('text/plain', node.story.id);
    };

    const handleDropOnHeader = (event: React.DragEvent) => {
      event.preventDefault();
      const id = event.dataTransfer.getData('text/plain');
      if (!id || id === node.story.id) return;
      if (!canMove(id, node.story.id)) return;
      move(id, node.story.id, node.children.length);
    };

    const handleDragOver = (event: React.DragEvent) => {
      event.preventDefault();
    };

    const handleDropZone = (event: React.DragEvent, targetIndex: number) => {
      event.preventDefault();
      const id = event.dataTransfer.getData('text/plain');
      if (!id || id === node.story.id) return;
      if (!canMove(id, parentId)) return;
      move(id, parentId, targetIndex);
    };

    return (
      <li
        role="treeitem"
        aria-level={level}
        aria-expanded={node.children.length > 0 ? expanded : undefined}
        aria-selected={isSelected}
        draggable
        onDragStart={handleDragStart}
        className={clsx('tree-node', { selected: isSelected })}
      >
        <div className="drop-zone" onDragOver={handleDragOver} onDrop={(event) => handleDropZone(event, index)} />
        <div className="node-header" onClick={handleSelect}>
          {node.children.length > 0 && (
            <button aria-label="Toggle" onClick={handleToggle} className="toggle">
              {expanded ? '-' : '+'}
            </button>
          )}
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(event) => handleKeyNavigation(event, node, parentId, index)}
            className="node-title"
            onDoubleClick={handleToggle}
            onDragOver={handleDragOver}
            onDrop={handleDropOnHeader}
          >
            <span>{node.story.title}</span>
            <small>{node.story.status}</small>
          </div>
        </div>
        {expanded && node.children.length > 0 && (
          <ul role="group">
            {node.children.map((child, childIndex) => (
              <TreeNode
                key={child.story.id}
                node={child}
                level={level + 1}
                parentId={node.story.id}
                index={childIndex}
                onMove={move}
                canMove={canMove}
              />
            ))}
            <li className="drop-zone" onDragOver={handleDragOver} onDrop={(event) => handleDropZone(event, node.children.length)} />
          </ul>
        )}
      </li>
    );
  }

  function handleKeyNavigation(
    event: React.KeyboardEvent,
    node: StoryTreeNode,
    parentId: string | null,
    index: number
  ) {
    if (event.key === 'Enter') {
      store.setSelected(node.story.id);
    }
    if (event.key === 'ArrowRight') {
      if (!expandedIds.includes(node.story.id)) {
        store.toggleNode(node.story.id);
      }
    }
    if (event.key === 'ArrowLeft') {
      if (expandedIds.includes(node.story.id)) {
        store.toggleNode(node.story.id);
      }
    }
    if (event.key === 'Delete') {
      // Deletion handled elsewhere via UI; noop placeholder
    }
  }
}

function collectDescendantIds(node: StoryTreeNode): string[] {
  let ids: string[] = [node.story.id];
  for (const child of node.children) {
    ids = ids.concat(collectDescendantIds(child));
  }
  return ids;
}
