import { useMemo } from 'react';
import { AcceptanceTest, UserStory } from '@ai-pm-mindmap/shared';
import * as d3 from 'd3';
import clsx from 'clsx';
import { evaluateInvest } from '../lib/validation';

interface MindmapViewProps {
  stories: UserStory[];
  tests: AcceptanceTest[];
}

interface MindmapNode extends d3.HierarchyPointNode<UserStory> {
  tests: AcceptanceTest[];
}

export default function MindmapView({ stories, tests }: MindmapViewProps) {
  const root = useMemo(() => buildHierarchy(stories, tests), [stories, tests]);
  if (!root) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 text-sm text-slate-400">
        No stories yet. Add stories from the outline view.
      </div>
    );
  }
  const radius = 260;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 overflow-auto" aria-label="Mindmap view">
      <svg width={radius * 2 + 40} height={radius * 2 + 40} className="mx-auto block">
        <g transform={`translate(${radius + 20},${radius + 20})`}>
          {root.links().map((link) => (
            <path
              key={`${link.source.data.id}-${link.target.data.id}`}
              d={d3.linkRadial()({
                source: [link.source.x, link.source.y],
                target: [link.target.x, link.target.y]
              }) as string}
              className="fill-none stroke-slate-700"
            />
          ))}
          {root.descendants().map((node) => (
            <MindmapNodeBubble key={node.data.id} node={node as MindmapNode} />
          ))}
        </g>
      </svg>
    </div>
  );
}

function MindmapNodeBubble({ node }: { node: MindmapNode }) {
  const invest = evaluateInvest(node.data, node.children?.length ?? 0);
  const angle = node.x - Math.PI / 2;
  const x = node.y * Math.cos(angle);
  const y = node.y * Math.sin(angle);
  return (
    <g transform={`translate(${x},${y})`}>
      <circle
        r={32}
        className={clsx('fill-slate-800 stroke-2', {
          'stroke-sky-400': invest.passed,
          'stroke-amber-400': !invest.passed
        })}
      />
      <text
        textAnchor="middle"
        alignmentBaseline="middle"
        className="fill-slate-100 text-xs"
        style={{ pointerEvents: 'none' }}
      >
        {node.data.title.slice(0, 20)}
      </text>
      <text textAnchor="middle" alignmentBaseline="hanging" dy={24} className="fill-slate-400 text-[10px]">
        {node.data.status}
      </text>
      {node.tests.length > 0 && (
        <text textAnchor="middle" alignmentBaseline="hanging" dy={36} className="fill-emerald-400 text-[10px]">
          🧪 {node.tests.length}
        </text>
      )}
    </g>
  );
}

function buildHierarchy(stories: UserStory[], tests: AcceptanceTest[]) {
  if (stories.length === 0) {
    return null;
  }
  const tree = d3
    .stratify<UserStory>()
    .id((d) => d.id)
    .parentId((d) => d.parentId ?? undefined)(stories);

  const radial = d3.tree<UserStory>().size([2 * Math.PI, 260]);
  const root = radial(tree);
  root.each((node) => {
    (node as MindmapNode).tests = tests.filter((test) => test.storyId === node.data.id);
  });
  return root as MindmapNode;
}
