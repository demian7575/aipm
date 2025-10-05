import { memo } from 'react';
import type { NodeProps } from 'reactflow';
import './MindmapNode.css';

interface MindmapNodeData {
  label: string;
  status: string;
  kind: 'mergeRequest' | 'story' | 'acceptance';
  tone: string;
  referenceId: string;
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
    </div>
  );
});
