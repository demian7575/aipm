import { useMemo } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RollupResult, validateStoryInvest } from '@ai-pm/shared';
import { useWorkspaceStore } from '../../state/useWorkspaceStore.js';

const storySchema = z.object({
  title: z.string().min(3),
  asA: z.string().min(3),
  iWant: z.string().min(3),
  soThat: z.string().min(3)
});

type StoryForm = z.infer<typeof storySchema>;

export default function DetailPanel() {
  const stories = useWorkspaceStore((state) => state.stories);
  const tree = useWorkspaceStore((state) => state.tree);
  const selectedStoryId = useWorkspaceStore((state) => state.selectedStoryId);
  const updateStory = useWorkspaceStore((state) => state.updateStory);
  const addTest = useWorkspaceStore((state) => state.addTest);

  const selectedStory = selectedStoryId ? stories[selectedStoryId] : undefined;
  const rollup = useMemo(() => findRollup(tree, selectedStoryId), [tree, selectedStoryId]);

  const invest = useMemo(() => {
    if (!selectedStory) return undefined;
    return validateStoryInvest(selectedStory, {
      tests: rollup?.tests ?? [],
      children: selectedStory.childrenIds.map((id) => stories[id]).filter(Boolean)
    });
  }, [rollup, selectedStory, stories]);

  const form = useForm<StoryForm>({
    resolver: zodResolver(storySchema),
    values: selectedStory
      ? {
          title: selectedStory.title,
          asA: selectedStory.asA,
          iWant: selectedStory.iWant,
          soThat: selectedStory.soThat
        }
      : undefined
  });

  if (!selectedStory) {
    return <p>Select a story to view details.</p>;
  }

  const submit = form.handleSubmit(async (values) => {
    await updateStory({ ...selectedStory, ...values });
  });

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold">{selectedStory.title}</h2>
        <p className="text-sm text-slate-400">Story ID: {selectedStory.id}</p>
      </header>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Title" name="title" form={form} />
        <Field label="As a" name="asA" form={form} />
        <Field label="I want" name="iWant" form={form} />
        <Field label="So that" name="soThat" form={form} />
        <button type="submit" className="px-3 py-2 bg-primary rounded text-white">
          Save Story
        </button>
      </form>
      {invest && (
        <section>
          <h3 className="font-semibold">INVEST</h3>
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(invest.checklist).map(([key, value]) => (
              <li key={key} className={`px-2 py-1 rounded ${value ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                {key.toUpperCase()}: {value ? 'Pass' : 'Fail'}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Acceptance Tests</h3>
          <button className="px-2 py-1 bg-slate-800 rounded" onClick={() => addTest(selectedStory.id)}>
            Add Test
          </button>
        </div>
        <ul className="space-y-3">
          {(rollup?.tests ?? []).map((test) => (
            <li key={test.id} className="border border-slate-700 rounded p-2 text-sm">
              <p className="font-semibold">{test.status}</p>
              <div>
                <h4 className="text-xs uppercase text-slate-400">Given</h4>
                <ul className="list-disc list-inside">{test.given.map((step) => <li key={step}>{step}</li>)}</ul>
              </div>
              <div>
                <h4 className="text-xs uppercase text-slate-400">When</h4>
                <ul className="list-disc list-inside">{test.when.map((step) => <li key={step}>{step}</li>)}</ul>
              </div>
              <div>
                <h4 className="text-xs uppercase text-slate-400">Then</h4>
                <ul className="list-disc list-inside">{test.then.map((step) => <li key={step}>{step}</li>)}</ul>
              </div>
              {test.ambiguityFlags.length > 0 && (
                <p className="text-amber-300">Ambiguity: {test.ambiguityFlags.join(', ')}</p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Field({ label, name, form }: { label: string; name: keyof StoryForm; form: UseFormReturn<StoryForm> }) {
  const {
    register,
    formState: { errors }
  } = form;
  const error = errors[name]?.message as string | undefined;
  return (
    <label className="block text-sm">
      <span className="text-slate-300">{label}</span>
      <input
        {...register(name)}
        className="mt-1 w-full rounded bg-slate-800 border border-slate-700 px-2 py-1 text-slate-100"
      />
      {error && <span className="text-xs text-amber-300">{error}</span>}
    </label>
  );
}

function findRollup(tree: RollupResult[], id?: string): RollupResult | undefined {
  for (const node of tree) {
    if (node.storyId === id) return node;
    const match = findRollup(node.children, id);
    if (match) return match;
  }
  return undefined;
}
