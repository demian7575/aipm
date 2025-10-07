import { useMemo, type KeyboardEvent } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AcceptanceTest, UserStory } from '@ai-pm-mindmap/shared';
import { useStoryStore } from '../store/useStoryStore';
import { useTreeNavigation } from '../hooks/useTreeNavigation';
import { useQueryClient } from '@tanstack/react-query';
import { createStory, createTest, deleteStory, deleteTest, moveStory, updateStory } from '../lib/api';
import { evaluateInvest, evaluateStory, evaluateTest } from '../lib/validation';
import clsx from 'clsx';

interface OutlineTreeProps {
  stories: UserStory[];
  tests: AcceptanceTest[];
}

interface StoryTreeNode {
  story: UserStory;
  children: StoryTreeNode[];
  tests: AcceptanceTest[];
}

const DND_TYPE = 'STORY';

export default function OutlineTree({ stories, tests }: OutlineTreeProps) {
  const { expanded, toggleExpanded, selectStory, selectedStoryId } = useStoryStore();
  const tree = useMemo(() => buildTree(stories, tests), [stories, tests]);
  const flat = useMemo(() => flattenTree(tree, expanded), [tree, expanded]);
  const { onKeyDown } = useTreeNavigation(
    flat.map((node) => ({
      id: node.story.id,
      parentId: node.story.parentId,
      hasChildren: node.children.length > 0,
      isExpanded: expanded[node.story.id]
    }))
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <div role="tree" aria-label="User story tree" className="bg-slate-900 rounded-lg border border-slate-700">
        {flat.map((node) => (
          <StoryTreeItem
            key={node.story.id}
            node={node}
            depth={node.story.depth}
            expanded={!!expanded[node.story.id]}
            onToggle={(recursive) => handleToggle(node, recursive, !!expanded[node.story.id], toggleExpanded)}
            onKeyDown={onKeyDown}
            isSelected={selectedStoryId === node.story.id}
            onSelect={() => selectStory(node.story.id)}
          />
        ))}
      </div>
    </DndProvider>
  );
}

function StoryTreeItem({
  node,
  depth,
  expanded,
  onToggle,
  onKeyDown,
  isSelected,
  onSelect
}: {
  node: FlatTreeNode;
  depth: number;
  expanded: boolean;
  onToggle: (recursive: boolean) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>, id: string) => void;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const queryClient = useQueryClient();
  const invest = evaluateInvest(node.story, node.children.length);
  const narrative = evaluateStory(node.story);
  const dnd = useStoryDnd(node, queryClient);

  const handleKeyDown = async (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown(event, node.story.id);
    if (event.defaultPrevented) return;
    if (event.key === 'A') {
      event.preventDefault();
      await handleAddStory('child');
    }
    if (event.key === 'S') {
      event.preventDefault();
      await handleAddStory('sibling');
    }
    if (event.key === 'T') {
      event.preventDefault();
      await handleAddTest();
    }
    if (event.key === 'Delete') {
      event.preventDefault();
      if (window.confirm('Delete story and its children?')) {
        await deleteStory(node.story.id);
        await queryClient.invalidateQueries({ queryKey: ['stories'] });
      }
    }
    if (event.key === 'E') {
      event.preventDefault();
      await handleEditStory();
    }
  };

  const handleAddStory = async (mode: 'child' | 'sibling') => {
    const title = window.prompt('Enter story title (As a/I want/So that)');
    if (!title) return;
    const role = window.prompt('Role (As a ...)');
    const action = window.prompt('Action (I want ...)');
    const reason = window.prompt('Reason (So that ...)');
    const given = window.prompt('Given');
    const when = window.prompt('When');
    const then = window.prompt('Then (include measurable metric)');
    const estimate = Number(window.prompt('Estimate (days)') ?? '1');
    if (!role || !action || !reason || !given || !when || !then) {
      alert('All story fields are required.');
      return;
    }
    const payload = {
      id: `story-${Date.now()}`,
      mrId: node.story.mrId,
      parentId: mode === 'child' ? node.story.id : node.story.parentId,
      title,
      role,
      action,
      reason,
      gwt: { given, when, then },
      estimateDays: estimate,
      status: 'draft'
    } as Partial<UserStory>;
    try {
      await createStory(payload);
      await queryClient.invalidateQueries({ queryKey: ['stories'] });
    } catch (error: any) {
      alert(error?.response?.data?.message ?? 'Failed to create story');
    }
  };

  const handleAddTest = async () => {
    const title = window.prompt('Acceptance test title');
    if (!title) return;
    const stepsRaw = window.prompt('Steps (comma separated)') ?? '';
    const steps = stepsRaw.split(',').map((s) => s.trim()).filter(Boolean);
    if (steps.length === 0) {
      alert('At least one step required');
      return;
    }
    try {
      await createTest({
        id: `test-${Date.now()}`,
        storyId: node.story.id,
        title,
        steps,
        status: 'pending'
      });
      await queryClient.invalidateQueries({ queryKey: ['tests'] });
    } catch (error: any) {
      alert(error?.response?.data?.message ?? 'Failed to create test');
    }
  };

  const handleEditStory = async () => {
    const estimate = window.prompt('New estimate in days', String(node.story.estimateDays ?? 1));
    if (!estimate) return;
    const estimateValue = Number(estimate);
    if (Number.isNaN(estimateValue)) {
      alert('Estimate must be numeric');
      return;
    }
    try {
      await updateStory(node.story.id, { estimateDays: estimateValue });
      await queryClient.invalidateQueries({ queryKey: ['stories'] });
    } catch (error: any) {
      alert(error?.response?.data?.message ?? 'Unable to update story');
    }
  };

  return (
    <div
      role="treeitem"
      aria-expanded={node.children.length > 0 ? expanded : undefined}
      tabIndex={isSelected ? 0 : -1}
      data-tree-id={node.story.id}
      onKeyDown={handleKeyDown}
      className={clsx('flex flex-col border-b border-slate-800 focus:outline-none transition-colors', {
        'bg-slate-800/60': isSelected,
        'opacity-60': dnd.isDragging
      })}
      style={{ paddingLeft: depth * 24 }}
      onClick={(event) => {
        if (event.shiftKey) {
          onToggle(true);
        } else {
          onToggle(false);
        }
        onSelect();
      }}
      ref={dnd.ref}
    >
      <div className="flex items-center gap-3 py-2 px-3">
        {node.children.length > 0 ? (
          <button
            className="w-6 h-6 rounded bg-slate-800 text-slate-200"
            onClick={(event) => {
              event.stopPropagation();
              onToggle(event.shiftKey);
            }}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '-' : '+'}
          </button>
        ) : (
          <span className="w-6 h-6" aria-hidden />
        )}
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-100">{node.story.title}</p>
          <p className="text-xs text-slate-400">{node.story.status.toUpperCase()}</p>
        </div>
        {!invest.passed && <span className="text-xs text-amber-400">INVEST ⚠</span>}
        {narrative.ambiguities.length > 0 && <span className="text-xs text-rose-400">AMB ⚠</span>}
      </div>
      {expanded && node.children.length > 0 && (
        <div role="group">
          {/* children rendered in flat list */}
        </div>
      )}
      {expanded && node.tests.length > 0 && (
        <div className="pl-10 pb-3 flex flex-col gap-2">
          {node.tests.map((test) => {
            const evaluation = evaluateTest(test);
            return (
              <div
                key={test.id}
                className="text-xs text-slate-300 flex items-center gap-2"
                role="button"
                tabIndex={0}
                onKeyDown={async (event) => {
                  if (event.key === 'Delete') {
                    await deleteTest(test.id);
                    await queryClient.invalidateQueries({ queryKey: ['tests'] });
                  }
                }}
              >
                <span>🧪 {test.title}</span>
                {evaluation.ambiguous.length > 0 && <span className="text-rose-400">AMB</span>}
                {!evaluation.measurable && <span className="text-amber-400">MEASURE?</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function handleToggle(
  node: FlatTreeNode,
  recursive: boolean,
  currentlyExpanded: boolean,
  toggleExpanded: (id: string, value?: boolean) => void
) {
  if (!recursive) {
    toggleExpanded(node.story.id);
    return;
  }
  const ids = collectDescendantIds(node);
  ids.forEach((id) => toggleExpanded(id, !currentlyExpanded));
}

function collectDescendantIds(node: FlatTreeNode): string[] {
  const ids: string[] = [node.story.id];
  node.children.forEach((child) => {
    ids.push(...collectDescendantIds(child));
  });
  return ids;
}

function buildTree(stories: UserStory[], tests: AcceptanceTest[]): StoryTreeNode[] {
  const sorted = [...stories].sort((a, b) => a.order - b.order);
  const map = new Map<string, StoryTreeNode>();
  const roots: StoryTreeNode[] = [];
  const testMap = new Map<string, AcceptanceTest[]>();
  tests.forEach((test) => {
    const arr = testMap.get(test.storyId) ?? [];
    arr.push(test);
    testMap.set(test.storyId, arr);
  });
  sorted.forEach((story) => {
    map.set(story.id, { story, children: [], tests: testMap.get(story.id) ?? [] });
  });
  map.forEach((node) => {
    if (node.story.parentId) {
      const parent = map.get(node.story.parentId);
      parent?.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

interface FlatTreeNode extends StoryTreeNode {}

function flattenTree(nodes: StoryTreeNode[], expanded: Record<string, boolean>): FlatTreeNode[] {
  const result: FlatTreeNode[] = [];
  const walk = (node: StoryTreeNode) => {
    result.push(node);
    if (expanded[node.story.id]) {
      node.children.sort((a, b) => a.story.order - b.story.order).forEach(walk);
    }
  };
  nodes
    .sort((a, b) => a.story.order - b.story.order)
    .forEach((node) => {
      walk(node);
    });
  return result;
}

function useStoryDnd(node: FlatTreeNode, queryClient: ReturnType<typeof useQueryClient>) {
  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: DND_TYPE,
    item: { id: node.story.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }));
  const [, drop] = useDrop({
    accept: DND_TYPE,
    hover: async (item: { id: string }) => {
      if (item.id === node.story.id) return;
    },
    drop: async (item: { id: string }) => {
      if (item.id === node.story.id) return;
      try {
        await moveStory(item.id, node.story.parentId, node.story.order);
        await queryClient.invalidateQueries({ queryKey: ['stories'] });
      } catch (error: any) {
        alert(error?.response?.data?.message ?? 'Unable to move story');
      }
    }
  });

  const ref = (element: HTMLDivElement | null) => {
    if (!element) return;
    preview(drop(drag(element)));
  };

  return { ref, isDragging };
}
