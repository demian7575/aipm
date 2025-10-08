import { useQuery } from '@tanstack/react-query';
import type { StoryTreeNode } from '@ai-pm/shared/types';
import { fetchStory } from '../lib/api';
import { useI18n } from '../lib/i18n';

interface DetailPanelProps {
  storyId?: string;
  tree: StoryTreeNode[];
}

export default function DetailPanel({ storyId, tree }: DetailPanelProps) {
  const { t } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: ['story', storyId],
    queryFn: () => (storyId ? fetchStory(storyId) : Promise.resolve(undefined)),
    enabled: Boolean(storyId)
  });

  const storyNode = storyId ? findStory(tree, storyId) : null;
  const tests = storyNode?.acceptanceTests ?? [];

  return (
    <aside aria-live="polite" className="detail-panel">
      <h2>{t('details')}</h2>
      {isLoading && <p>Loading…</p>}
      {!storyId && <p>Select a story to see details.</p>}
      {storyId && data && (
        <div>
          <h3>{data.data.title}</h3>
          <dl>
            <dt>Role</dt>
            <dd>{data.data.role}</dd>
            <dt>Goal</dt>
            <dd>{data.data.goal}</dd>
            <dt>Benefit</dt>
            <dd>{data.data.benefit}</dd>
            <dt>Status</dt>
            <dd>{data.data.status}</dd>
          </dl>
          <section>
            <h4>{t('investWarnings')}</h4>
            <ul>
              {data.validation.errors.length === 0 && data.validation.warnings.length === 0 && (
                <li>No findings 🎉</li>
              )}
              {data.validation.errors.map((msg) => (
                <li key={`err-${msg.field}`} className="error">
                  {msg.message}
                </li>
              ))}
              {data.validation.warnings.map((msg, index) => (
                <li key={`warn-${index}`} className="warning">
                  {msg.message}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h4>Acceptance Tests</h4>
            {tests.length === 0 ? (
              <p>No tests linked.</p>
            ) : (
              <ul>
                {tests.map((test) => (
                  <li key={test.id}>
                    <strong>{test.id}</strong>
                    <p>
                      Given {test.given}
                      <br />
                      When {test.when}
                      <br />
                      Then {test.then}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </aside>
  );
}

function findStory(tree: StoryTreeNode[], id: string): StoryTreeNode | undefined {
  for (const node of tree) {
    if (node.story.id === id) return node;
    const found = findStory(node.children, id);
    if (found) return found;
  }
  return undefined;
}
