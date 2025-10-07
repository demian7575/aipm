import type { AcceptanceTest, UserStory } from '@ai-pm-mindmap/shared';
import { getStoryInsights, getTestInsights } from '../lib/validation';
import { t } from '../i18n';

interface DetailPanelProps {
  story: UserStory | null;
  tests: AcceptanceTest[];
  childCount: number;
}

export function DetailPanel({ story, tests, childCount }: DetailPanelProps) {
  if (!story) {
    return <div className="panel">{t('noStorySelected')}</div>;
  }

  const insights = getStoryInsights(story, childCount);

  return (
    <div className="panel" aria-live="polite">
      <section className="detail-section">
        <h3>{t('investStatus')}</h3>
        {insights.invest.compliant ? (
          <span className="badge success">Passes INVEST</span>
        ) : (
          <ul>
            {insights.invest.issues.map((issue) => (
              <li key={issue} className="badge warn">
                {issue}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="detail-section">
        <h3>{t('ambiguousFlags')}</h3>
        {insights.ambiguity.length === 0 ? (
          <span className="badge success">No ambiguity detected</span>
        ) : (
          <ul>
            {insights.ambiguity.map((flag, index) => (
              <li key={`${flag.text}-${index}`} className="badge warn">
                {flag.text} ({flag.reason})
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="detail-section">
        <h3>{t('tests')}</h3>
        {tests.length === 0 ? (
          <div className="badge">No tests yet</div>
        ) : (
          <ul>
            {tests.map((test) => {
              const analysis = getTestInsights(test);
              return (
                <li key={test.id}>
                  <div style={{ fontWeight: 600 }}>{test.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{test.status}</div>
                  {analysis.ambiguity.length > 0 && (
                    <div className="badge warn">
                      {analysis.ambiguity.map((flag) => flag.text).join(', ')}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
