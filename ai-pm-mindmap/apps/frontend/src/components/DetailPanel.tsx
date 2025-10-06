import { FormEvent, useEffect, useState } from 'react';
import { StoryNode } from '../utils/api';
import { useLocale } from '../i18n/context';

interface DetailPanelProps {
  story: StoryNode | null;
  onSave: (values: Partial<StoryNode>) => void;
  onAddTest: (storyId: string) => void;
}

const DetailPanel = ({ story, onSave, onAddTest }: DetailPanelProps) => {
  const { t } = useLocale();
  const [form, setForm] = useState({
    title: '',
    asA: '',
    iWant: '',
    soThat: '',
    estimateDays: '',
  });

  useEffect(() => {
    if (!story) return;
    setForm({
      title: story.title,
      asA: story.asA,
      iWant: story.iWant,
      soThat: story.soThat,
      estimateDays: story.estimateDays?.toString() ?? '',
    });
  }, [story]);

  if (!story) {
    return (
      <aside className="flex h-full flex-col gap-4 rounded border border-slate-700/60 bg-slate-900/70 p-4 text-sm text-slate-300">
        <p>Select a story to see details.</p>
      </aside>
    );
  }

  const investEntries = Object.entries(story.analysis.invest)
    .filter(([key]) => key !== 'summary')
    .map(([key, value]) => ({ key, value }));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      id: story.id,
      title: form.title,
      asA: form.asA,
      iWant: form.iWant,
      soThat: form.soThat,
      estimateDays: form.estimateDays ? Number(form.estimateDays) : null,
    } as Partial<StoryNode>);
  };

  return (
    <aside className="flex h-full flex-col gap-4 rounded border border-slate-700/60 bg-slate-900/70 p-4 text-sm text-slate-200">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">{story.title}</h2>
        <p className="text-xs text-slate-400">{story.asA}</p>
      </header>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <label className="block text-xs uppercase tracking-wider text-slate-400">
          Title
          <input
            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          />
        </label>
        <label className="block text-xs uppercase tracking-wider text-slate-400">
          As a
          <input
            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1"
            value={form.asA}
            onChange={(event) => setForm((prev) => ({ ...prev, asA: event.target.value }))}
          />
        </label>
        <label className="block text-xs uppercase tracking-wider text-slate-400">
          I want
          <textarea
            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1"
            value={form.iWant}
            onChange={(event) => setForm((prev) => ({ ...prev, iWant: event.target.value }))}
          />
        </label>
        <label className="block text-xs uppercase tracking-wider text-slate-400">
          So that
          <textarea
            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1"
            value={form.soThat}
            onChange={(event) => setForm((prev) => ({ ...prev, soThat: event.target.value }))}
          />
        </label>
        <label className="block text-xs uppercase tracking-wider text-slate-400">
          Estimate (days)
          <input
            type="number"
            min={0}
            step={0.5}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1"
            value={form.estimateDays}
            onChange={(event) => setForm((prev) => ({ ...prev, estimateDays: event.target.value }))}
          />
        </label>
        <button type="submit" className="w-full rounded bg-brand px-3 py-2 text-sm font-medium">
          Save Story
        </button>
      </form>
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          {t('investSummary')}
        </h3>
        <ul className="mt-2 space-y-1 text-xs">
          {investEntries.map(({ key, value }) => (
            <li key={key} className="flex items-center justify-between gap-2">
              <span className="capitalize">{key}</span>
              <span className={value.satisfied ? 'text-emerald-400' : 'text-orange-400'}>
                {value.satisfied ? 'Pass' : 'Improve'}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          {t('ambiguityFlags')}
        </h3>
        {story.analysis.ambiguity.hasIssues ? (
          <div className="space-y-2">
            {Object.entries(story.analysis.ambiguity.fields).map(([field, result]) => (
              <div key={field} className="rounded border border-orange-500/40 bg-orange-500/10 p-2">
                <p className="text-[11px] uppercase tracking-wide text-orange-300">{field}</p>
                {result.tokens.length > 0 && (
                  <p className="text-xs text-orange-200">
                    Ambiguous terms: {result.tokens.join(', ')}
                  </p>
                )}
                {result.missingMeasurement && (
                  <p className="text-xs text-orange-200">Include measurable units for numbers.</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">No ambiguity detected.</p>
        )}
      </section>
      <section className="flex flex-col gap-2">
        <header className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-400">
          <span>{t('tests')}</span>
          <button
            type="button"
            className="rounded bg-slate-800 px-2 py-1"
            onClick={() => onAddTest(story.id)}
          >
            {t('addTest')}
          </button>
        </header>
        <ul className="space-y-2 text-xs">
          {story.tests.map((test) => (
            <li key={test.id} className="rounded border border-slate-700/60 bg-slate-950/60 p-2">
              <h4 className="font-semibold text-slate-200">{test.title}</h4>
              <p className="text-slate-300">GIVEN {test.given}</p>
              <p className="text-slate-300">WHEN {test.when}</p>
              <p className="text-slate-300">THEN {test.then}</p>
              <span className="text-[10px] uppercase text-slate-500">{test.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
};

export default DetailPanel;
