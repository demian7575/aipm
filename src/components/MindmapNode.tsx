import { memo } from 'react';
import type { NodeProps } from 'reactflow';
import './MindmapNode.css';

export interface MindmapNodeData {
  label: string;
  status: string;
  kind: 'mergeRequest' | 'story' | 'acceptance';
  tone: string;
  referenceId: string;
  meta?: {
    hiddenStoryChildren: number;
    hiddenAcceptanceTests: number;
  };
  controls?: {
    storyChildrenCollapsed: boolean;
    storyChildCount: number;
    acceptanceCollapsed: boolean;
    acceptanceCount: number;
  };
  onToggleChildStories?: () => void;
  onToggleAcceptance?: () => void;
}

export const MindmapNode = memo(({ data, selected }: NodeProps<MindmapNodeData>) => {
  const labelLines = data.label.split('/').map((line) => line.trim());

  return (
    <div className={`mindmap-node ${data.tone} ${selected ? 'mindmap-node--selected' : ''}`}>
      <header>
        <span className={`mindmap-node__kind mindmap-node__kind--${data.kind}`}>{data.kind}</span>
        <span className="mindmap-node__status">{data.status}</span>
      </header>
      <div className="mindmap-node__body">
        {labelLines.map((line, index) => (
          <p key={`${data.referenceId}-${index}`}>{line}</p>
        ))}
      </div>
      {data.controls && (data.controls.storyChildCount > 0 || data.controls.acceptanceCount > 0) ? (
        <div className="mindmap-node__toggles">
          {data.controls.storyChildCount > 0 && data.onToggleChildStories ? (
            <button
              type="button"
              className={`mindmap-node__toggle ${
                data.controls.storyChildrenCollapsed ? 'mindmap-node__toggle--collapsed' : 'mindmap-node__toggle--expanded'
              }`}
              onClick={data.onToggleChildStories}
              aria-pressed={!data.controls.storyChildrenCollapsed}
            >
              {data.controls.storyChildrenCollapsed
                ? `Expand child stories (${data.controls.storyChildCount})`
                : 'Collapse child stories'}
            </button>
          ) : null}
          {data.controls.acceptanceCount > 0 && data.onToggleAcceptance ? (
            <button
              type="button"
              className={`mindmap-node__toggle ${
                data.controls.acceptanceCollapsed ? 'mindmap-node__toggle--collapsed' : 'mindmap-node__toggle--expanded'
              }`}
              onClick={data.onToggleAcceptance}
              aria-pressed={!data.controls.acceptanceCollapsed}
            >
              {data.controls.acceptanceCollapsed
                ? `Expand acceptance tests (${data.controls.acceptanceCount})`
                : 'Collapse acceptance tests'}
            </button>
          ) : null}
        </div>
      ) : null}
      {data.meta && (data.meta.hiddenStoryChildren > 0 || data.meta.hiddenAcceptanceTests > 0) ? (
        <footer className="mindmap-node__meta">
          {data.meta.hiddenStoryChildren > 0 ? (
            <span className="mindmap-node__meta-chip" aria-label={`${data.meta.hiddenStoryChildren} child stories hidden`}>
              +{data.meta.hiddenStoryChildren} stories
            </span>
          ) : null}
          {data.meta.hiddenAcceptanceTests > 0 ? (
            <span className="mindmap-node__meta-chip" aria-label={`${data.meta.hiddenAcceptanceTests} acceptance tests hidden`}>
              +{data.meta.hiddenAcceptanceTests} tests
            </span>
          ) : null}
        </footer>
      ) : null}
    </div>
  );
});
