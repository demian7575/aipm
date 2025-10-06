import { useEffect, useMemo, useState } from 'react';
import { StoryNode } from '../utils/api';
import { collectVisibleNodes, findStoryNode, maxDepthAfterMove } from '../utils/tree';
import { useLocale } from '../i18n/context';
import { useTreeExpansion } from '../hooks/useTreeExpansion';
import { UserStory } from '@ai-pm-mindmap/shared';
import clsx from 'clsx';

interface OutlineTreeViewProps {
  mrId?: string;
  tree: StoryNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onAddChild: (parentId: string | null) => void;
  onAddSibling: (storyId: string) => void;
  onAddTest: (storyId: string) => void;
  onDelete: (storyId: string) => void;
  onMove: (storyId: string, parentId: string | null, index: number) => void;
  onStatusChange: (storyId: string, status: UserStory['status']) => void;
  storyDepthLimit: number;
  showToast: (message: string) => void;
}

interface DragMeta {
  id: string;
  depth: number;
}

const statuses: UserStory['status'][] = ['backlog', 'in-progress', 'done', 'blocked'];

const OutlineTreeView = ({
  mrId,
  tree,
  selectedId,
  onSelect,
  onEdit,
  onAddChild,
  onAddSibling,
  onAddTest,
  onDelete,
  onMove,
  onStatusChange,
  storyDepthLimit,
  showToast,
}: OutlineTreeViewProps) => {
  const expansion = useTreeExpansion(mrId, tree);
  const { t } = useLocale();
  const [focusedId, setFocusedId] = useState<string | null>(selectedId);
  const [dragMeta, setDragMeta] = useState<DragMeta | null>(null);

  useEffect(() => {
    setFocusedId(selectedId);
  }, [selectedId]);

  const visibleNodes = useMemo(() => collectVisibleNodes(tree, expansion.expanded), [tree, expansion]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!focusedId) return;
    const index = visibleNodes.findIndex(({ node }) => node.id === focusedId);
    if (index === -1) return;
    const current = visibleNodes[index].node;

    switch (event.key) {
      case 'ArrowDown': {
        const next = visibleNodes[index + 1];
        if (next) {
          setFocusedId(next.node.id);
          onSelect(next.node.id);
          event.preventDefault();
        }
        break;
      }
      case 'ArrowUp': {
        const prev = visibleNodes[index - 1];
        if (prev) {
          setFocusedId(prev.node.id);
          onSelect(prev.node.id);
          event.preventDefault();
        }
        break;
      }
      case 'ArrowRight': {
        if (!expansion.isExpanded(current.id) && current.children.length > 0) {
          expansion.toggle(current.id);
          event.preventDefault();
        } else if (expansion.isExpanded(current.id) && current.children.length > 0) {
          const firstChild = current.children[0];
          setFocusedId(firstChild.id);
          onSelect(firstChild.id);
          event.preventDefault();
        }
        break;
      }
      case 'ArrowLeft': {
        if (expansion.isExpanded(current.id) && current.children.length > 0) {
          expansion.toggle(current.id);
          event.preventDefault();
        } else {
          const parentEntry = visibleNodes.find(({ node }) => node.id === current.parentId);
          if (parentEntry) {
            setFocusedId(parentEntry.node.id);
            onSelect(parentEntry.node.id);
            event.preventDefault();
          }
        }
        break;
      }
      case 'Enter':
        onEdit(current.id);
        event.preventDefault();
        break;
      case 'a':
      case 'A':
        onAddChild(current.id);
        event.preventDefault();
        break;
      case 's':
      case 'S':
        onAddSibling(current.id);
        event.preventDefault();
        break;
      case 't':
      case 'T':
        onAddTest(current.id);
        event.preventDefault();
        break;
      case 'Delete':
        onDelete(current.id);
        event.preventDefault();
        break;
      default:
        break;
    }
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, node: StoryNode) => {
    event.dataTransfer.setData('application/x-story-id', node.id);
    setDragMeta({ id: node.id, depth: node.depth });
  };

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>,
    target: StoryNode | null,
    position: 'before' | 'after' | 'child',
  ) => {
    event.preventDefault();
    const storyId = event.dataTransfer.getData('application/x-story-id');
    if (!storyId || storyId === target?.id) return;
    const story = findStoryNode(tree, storyId);
    if (!story) return;

    let parentId: string | null = null;
    let index = 0;

    if (position === 'child' && target) {
      parentId = target.id;
      index = target.children.length;
    } else if (target) {
      parentId = target.parentId;
      const siblings = (parentId
        ? findStoryNode(tree, parentId)?.children ?? []
        : tree
      ).slice()
        .sort((a, b) => a.order - b.order);
      const targetIndex = siblings.findIndex((item) => item.id === target.id);
      index = position === 'before' ? targetIndex : targetIndex + 1;
    } else {
      parentId = null;
      index = position === 'before' ? 0 : tree.length;
    }

    const maxDepth = maxDepthAfterMove(tree, storyId, parentId);
    if (maxDepth > storyDepthLimit) {
      showToast(`Cannot move beyond depth ${storyDepthLimit}`);
      return;
    }

    onMove(storyId, parentId, index);
    setDragMeta(null);
  };

  const renderDropZone = (node: StoryNode | null, position: 'before' | 'after' | 'child') => (
    <div
      key={`${node?.id ?? 'root'}-${position}`}
      className="h-2"
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => handleDrop(event, node, position)}
    />
  );

  const renderNode = (node: StoryNode) => {
    const isExpanded = expansion.isExpanded(node.id);
    const isSelected = selectedId === node.id;
    const isFocused = focusedId === node.id;

    return (
      <li
        key={node.id}
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={node.children.length > 0 ? isExpanded : undefined}
        className={clsx(
          'rounded border border-slate-700/40 bg-slate-800/60',
          isFocused && 'outline outline-2 outline-brand',
        )}
        data-story-id={node.id}
      >
        {renderDropZone(node, 'before')}
        <div
          className="flex items-start gap-2 p-2"
          draggable
          onDragStart={(event) => handleDragStart(event, node)}
          onDragEnd={() => setDragMeta(null)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => handleDrop(event, node, 'child')}
          onClick={(event) => {
            if (event.shiftKey) {
              expansion.toggle(node.id, true);
            } else {
              onSelect(node.id);
              setFocusedId(node.id);
            }
          }}
        >
          <button
            type="button"
            aria-label="Toggle"
            className="rounded bg-slate-700 px-1 text-xs"
            onClick={(event) => {
              event.stopPropagation();
              expansion.toggle(node.id);
            }}
          >
            {isExpanded ? '-' : '+'}
          </button>
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{node.title}</span>
              <select
                className="rounded bg-slate-900 px-2 py-1 text-xs"
                value={node.status}
                onChange={(event) => onStatusChange(node.id, event.target.value as UserStory['status'])}
                onClick={(event) => event.stopPropagation()}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-300">
              {node.asA} · {node.iWant}
            </p>
            <div className="flex flex-wrap gap-1 text-[10px] text-slate-400">
              {node.analysis.invest.summary.score}/{node.analysis.invest.summary.total} INVEST
              {node.analysis.ambiguity.hasIssues && (
                <span className="rounded bg-orange-500/20 px-1 text-orange-300">Ambiguity</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1 text-[10px]">
              <button
                type="button"
                className="rounded bg-slate-900 px-2 py-1"
                onClick={(event) => {
                  event.stopPropagation();
                  onAddChild(node.id);
                }}
              >
                {t('addChild')}
              </button>
              <button
                type="button"
                className="rounded bg-slate-900 px-2 py-1"
                onClick={(event) => {
                  event.stopPropagation();
                  onAddSibling(node.id);
                }}
              >
                {t('addSibling')}
              </button>
              <button
                type="button"
                className="rounded bg-slate-900 px-2 py-1"
                onClick={(event) => {
                  event.stopPropagation();
                  onAddTest(node.id);
                }}
              >
                {t('addTest')}
              </button>
              <button
                type="button"
                className="rounded bg-red-900/60 px-2 py-1 text-red-200"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(node.id);
                }}
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
        {renderDropZone(node, 'after')}
        {isExpanded && node.children.length > 0 && (
          <ul role="group" className="ml-4 space-y-2">
            {node.children.map((child) => renderNode(child))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div
      className="flex h-full flex-col gap-2"
      role="tree"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-activedescendant={focusedId ?? undefined}
    >
      <div className="flex items-center gap-2">
        <button className="rounded bg-slate-800 px-2 py-1" onClick={() => expansion.expandAll()}>
          Expand All
        </button>
        <button className="rounded bg-slate-800 px-2 py-1" onClick={() => expansion.collapseAll()}>
          Collapse All
        </button>
      </div>
      <ul className="flex flex-1 flex-col gap-2" role="group">
        {renderDropZone(null, 'before')}
        {tree.map((node) => renderNode(node))}
        {renderDropZone(null, 'after')}
      </ul>
      {dragMeta && (
        <div className="text-xs text-slate-400">Dragging {dragMeta.id}</div>
      )}
    </div>
  );
};

export default OutlineTreeView;
