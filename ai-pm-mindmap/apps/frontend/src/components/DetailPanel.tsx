import { useMemo } from 'react';
import { AcceptanceTest, UserStory } from '@ai-pm-mindmap/shared';
import { useStoryStore } from '../store/useStoryStore';
import { evaluateInvest, evaluateStory, evaluateTest } from '../lib/validation';
import { useTranslation } from 'react-i18next';

interface DetailPanelProps {
  stories: UserStory[];
  tests: AcceptanceTest[];
}

export default function DetailPanel({ stories, tests }: DetailPanelProps) {
  const { selectedStoryId } = useStoryStore();
  const { t } = useTranslation();
  const story = stories.find((item) => item.id === selectedStoryId) ?? null;
  const storyTests = useMemo(
    () => tests.filter((test) => test.storyId === selectedStoryId),
    [tests, selectedStoryId]
  );

  if (!story) {
    return (
      <section className="bg-slate-900 border border-slate-700 rounded-lg p-4 min-h-[240px]">
        <h2 className="text-lg font-semibold text-slate-200">{t('details')}</h2>
        <p className="text-sm text-slate-500 mt-2">Select a story to see validation insights.</p>
      </section>
    );
  }

  const narrative = evaluateStory(story);
  const invest = evaluateInvest(story, stories.filter((s) => s.parentId === story.id).length);

  return (
    <section className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-3">
      <header>
        <h2 className="text-lg font-semibold text-slate-200">{story.title}</h2>
        <p className="text-xs text-slate-400 uppercase tracking-wide">{story.status}</p>
      </header>
      <div>
        <h3 className="text-sm font-semibold text-slate-300">{t('investIssues')}</h3>
        {invest.passed ? (
          <p className="text-xs text-emerald-400">INVEST looks good!</p>
        ) : (
          <ul className="text-xs text-amber-300 list-disc pl-4 space-y-1">
            {invest.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-300">{t('ambiguityFlags')}</h3>
        {narrative.ambiguities.length === 0 ? (
          <p className="text-xs text-emerald-300">No ambiguous wording detected.</p>
        ) : (
          <ul className="text-xs text-rose-300 list-disc pl-4 space-y-1">
            {narrative.ambiguities.map((item) => (
              <li key={`${item.field}-${item.message}`}>
                <strong>{item.field}:</strong> {item.message}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-300">{t('measurableFlags')}</h3>
        {narrative.measurable.length === 0 ? (
          <p className="text-xs text-emerald-300">All statements are measurable.</p>
        ) : (
          <ul className="text-xs text-sky-200 list-disc pl-4 space-y-1">
            {narrative.measurable.map((item) => (
              <li key={`${item.field}-${item.message}`}>
                <strong>{item.field}:</strong> {item.message}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-300">{t('tests')}</h3>
        {storyTests.length === 0 ? (
          <p className="text-xs text-slate-400">No tests yet.</p>
        ) : (
          <ul className="text-xs space-y-1">
            {storyTests.map((test) => {
              const evaluation = evaluateTest(test);
              return (
                <li key={test.id} className="flex items-center gap-2 text-slate-200">
                  <span>🧪 {test.title}</span>
                  {evaluation.ambiguous.length > 0 && <span className="text-rose-300">AMB</span>}
                  {!evaluation.measurable && <span className="text-amber-300">MEASURE?</span>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
