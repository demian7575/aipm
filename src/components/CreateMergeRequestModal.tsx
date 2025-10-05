import { FormEvent, useState } from 'react';
import { Modal } from './Modal';
import { GuidanceSummary } from './GuidanceSummary';
import { evaluateMergeRequestDraft } from '../guidance/mergeRequestGuidance';
import type { GuidanceReport } from '../guidance/types';

interface CreateMergeRequestModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: { title: string; summary: string }) => void;
}

export function CreateMergeRequestModal({ open, onClose, onCreate }: CreateMergeRequestModalProps) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [report, setReport] = useState<GuidanceReport | null>(null);

  function handleEvaluate() {
    setReport(evaluateMergeRequestDraft({ title, summary }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!report || report.level === 'fail') return;
    onCreate({ title, summary });
    setTitle('');
    setSummary('');
    setReport(null);
    onClose();
  }

  return (
    <Modal title="Create Merge Request" open={open} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label>
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="AI Planning Launch" />
        </label>
        <label>
          Summary
          <textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="Describe the MR goal so stories can be generated."
          />
        </label>
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={handleEvaluate}>
            ChatGPT Guidance
          </button>
          <button type="submit" className="btn btn--primary" disabled={!report || report.level === 'fail'}>
            Create
          </button>
        </div>
      </form>
      <GuidanceSummary heading="Assistant review" report={report} />
    </Modal>
  );
}
