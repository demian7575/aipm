import { FormEvent, useState } from 'react';
import { Modal } from './Modal';
import { GuidanceSummary } from './GuidanceSummary';
import { evaluateAcceptanceDraft } from '../guidance/acceptanceGuidance';
import type { GuidanceReport } from '../guidance/types';

interface CreateAcceptanceTestModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: { title: string; given: string; when: string; then: string; notes?: string }) => void;
}

export function CreateAcceptanceTestModal({ open, onClose, onCreate }: CreateAcceptanceTestModalProps) {
  const [title, setTitle] = useState('');
  const [given, setGiven] = useState('Given ');
  const [when, setWhen] = useState('When ');
  const [then, setThen] = useState('Then ');
  const [notes, setNotes] = useState('');
  const [report, setReport] = useState<GuidanceReport | null>(null);

  function handleEvaluate() {
    setReport(evaluateAcceptanceDraft({ title, given, when, then, notes }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!report || report.level === 'fail') return;
    onCreate({ title, given, when, then, notes });
    setTitle('');
    setGiven('Given ');
    setWhen('When ');
    setThen('Then ');
    setNotes('');
    setReport(null);
    onClose();
  }

  return (
    <Modal title="Attach Acceptance Test" open={open} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label>
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Acceptance test title" />
        </label>
        <label>
          Given
          <textarea value={given} onChange={(event) => setGiven(event.target.value)} />
        </label>
        <label>
          When
          <textarea value={when} onChange={(event) => setWhen(event.target.value)} />
        </label>
        <label>
          Then
          <textarea value={then} onChange={(event) => setThen(event.target.value)} />
        </label>
        <label>
          Notes (optional)
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
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
      <GuidanceSummary heading="Given / When / Then review" report={report} />
    </Modal>
  );
}
