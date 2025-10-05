import { FormEvent, useEffect, useState } from 'react';
import { Modal } from './Modal';
import { GuidanceSummary } from './GuidanceSummary';
import { evaluateStoryDraft } from '../guidance/storyGuidance';
import type { GuidanceReport } from '../guidance/types';

interface CreateStoryModalProps {
  open: boolean;
  onClose: () => void;
  parentPersona?: string;
  onCreate: (payload: { asA: string; iWant: string; soThat: string; notes?: string }) => void;
}

export function CreateStoryModal({ open, onClose, onCreate, parentPersona }: CreateStoryModalProps) {
  const [asA, setAsA] = useState('');
  const [iWant, setIWant] = useState('');
  const [soThat, setSoThat] = useState('');
  const [notes, setNotes] = useState('');
  const [report, setReport] = useState<GuidanceReport | null>(null);

  useEffect(() => {
    if (open && parentPersona && !asA) {
      setAsA(`As a ${parentPersona.toLowerCase()}`);
    }
  }, [open, parentPersona, asA]);

  function handleEvaluate() {
    setReport(evaluateStoryDraft({ asA, iWant, soThat, notes }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!report || report.level === 'fail') return;
    onCreate({ asA, iWant, soThat, notes });
    setAsA('');
    setIWant('');
    setSoThat('');
    setNotes('');
    setReport(null);
    onClose();
  }

  return (
    <Modal title="Create User Story" open={open} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label>
          As a
          <input value={asA} onChange={(event) => setAsA(event.target.value)} placeholder="As a delivery lead" />
        </label>
        <label>
          I want
          <textarea value={iWant} onChange={(event) => setIWant(event.target.value)} placeholder="I want to ..." />
        </label>
        <label>
          So that
          <textarea value={soThat} onChange={(event) => setSoThat(event.target.value)} placeholder="So that ..." />
        </label>
        <label>
          Notes (optional)
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Any additional context" />
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
      <GuidanceSummary heading="INVEST review" report={report} />
    </Modal>
  );
}
