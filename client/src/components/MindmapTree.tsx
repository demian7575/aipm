import { useMemo } from 'react';
import { UserStoryNode } from '../types/mindmap';

interface MindmapTreeProps {
  userStories: UserStoryNode[];
  onSelectStory: (story: UserStoryNode) => void;
  selectedId?: string;
}

export function MindmapTree({ userStories, onSelectStory, selectedId }: MindmapTreeProps) {
  const orderedStories = useMemo(
    () =>
      [...userStories].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })),
    [userStories],
  );

  return (
    <div className="mindmap-tree" aria-label="Mindmap navigation">
      <h2 className="panel-title">Mindmap Overview</h2>
      <ul className="mindmap-tree__list">
        {orderedStories.map((story) => (
          <TreeNode
            key={story.id}
            story={story}
            level={0}
            onSelectStory={onSelectStory}
            isSelected={story.id === selectedId}
            selectedId={selectedId}
          />
        ))}
      </ul>
    </div>
  );
}

interface TreeNodeProps {
  story: UserStoryNode;
  level: number;
  onSelectStory: (story: UserStoryNode) => void;
  isSelected: boolean;
  selectedId?: string;
}

function TreeNode({ story, level, onSelectStory, isSelected, selectedId }: TreeNodeProps) {
  return (
    <li className={`mindmap-tree__node mindmap-tree__node--level-${level}`}>
      <button
        type="button"
        className={`mindmap-tree__node-button ${isSelected ? 'is-selected' : ''}`}
        onClick={() => onSelectStory(story)}
      >
        <span className={`status-dot status-dot--${story.status}`}></span>
        <span className="mindmap-tree__node-title">{story.title}</span>
        <span className="mindmap-tree__node-meta">{story.acceptanceTests.length} acceptance tests</span>
      </button>
      {story.children.length > 0 && (
        <ul className="mindmap-tree__children">
          {story.children.map((child) => (
            <TreeNode
              key={child.id}
              story={child}
              level={level + 1}
              onSelectStory={onSelectStory}
              isSelected={child.id === selectedId}
              selectedId={selectedId}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
