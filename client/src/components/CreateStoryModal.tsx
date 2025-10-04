import { FormEvent, useEffect, useMemo, useState } from 'react';
import { UserStoryNode } from '../types/mindmap';
import { evaluateInvest } from '../utils/invest';

interface CreateStoryModalProps {
  parent: UserStoryNode;
  isOpen: boolean;
  onClose: () => void;
}

export interface StoryDraftForm {
  asA: string;
  iWant: string;
  soThat: string;
  given: string;
  when: string;
  then: string;
}

const initialState: StoryDraftForm = {
  asA: '',
  iWant: '',
  soThat: '',
  given: '',
  when: '',
  then: '',
};

export function CreateStoryModal({ parent, isOpen, onClose }: CreateStoryModalProps) {
  const [formState, setFormState] = useState<StoryDraftForm>(() => initialState);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const hintSubject = parent.title.toLowerCase();
    setFormState({
      asA: parent.asA,
      iWant: `to extend ${hintSubject} with a focused capability`,
      soThat: parent.soThat,
      given: `Given the existing workflow for "${parent.title}"`,
      when: 'When a collaborator initiates the new capability',
      then: 'Then the system records observable evidence that the outcome succeeded',
    });
  }, [isOpen, parent]);

  const investResult = useMemo(() => evaluateInvest(formState), [formState]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Mock persistence — in a full implementation this would call the API.
    // eslint-disable-next-line no-alert
    alert('Draft saved to backlog (mock).');
    setFormState(initialState);
    onClose();
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="create-story-heading">
      <div className="modal__content">
        <header className="modal__header">
          <div>
            <h2 id="create-story-heading">Draft child story</h2>
            <p className="modal__subtitle">Extending parent: {parent.title}</p>
          </div>
          <button type="button" className="button button--secondary" onClick={onClose}>
            Close
          </button>
        </header>
        <form className="modal__body" onSubmit={handleSubmit}>
          <fieldset className="form-section">
            <legend>Story framing</legend>
            <label>
              <span>As a</span>
              <input
                value={formState.asA}
                onChange={(event) => setFormState((prev) => ({ ...prev, asA: event.target.value }))}
                placeholder={`E.g. ${parent.asA}`}
                required
              />
            </label>
            <label>
              <span>I want</span>
              <input
                value={formState.iWant}
                onChange={(event) => setFormState((prev) => ({ ...prev, iWant: event.target.value }))}
                placeholder={`Deliver value building on "${parent.iWant}"`}
                required
              />
            </label>
            <label>
              <span>So that</span>
              <input
                value={formState.soThat}
                onChange={(event) => setFormState((prev) => ({ ...prev, soThat: event.target.value }))}
                placeholder={`Outcome aligned with "${parent.soThat}"`}
                required
              />
            </label>
          </fieldset>

          <fieldset className="form-section">
            <legend>Acceptance test draft</legend>
            <label>
              <span>Given</span>
              <textarea
                value={formState.given}
                onChange={(event) => setFormState((prev) => ({ ...prev, given: event.target.value }))}
                placeholder="Given the application state..."
                required
              />
            </label>
            <label>
              <span>When</span>
              <textarea
                value={formState.when}
                onChange={(event) => setFormState((prev) => ({ ...prev, when: event.target.value }))}
                placeholder="When a user performs..."
                required
              />
            </label>
            <label>
              <span>Then</span>
              <textarea
                value={formState.then}
                onChange={(event) => setFormState((prev) => ({ ...prev, then: event.target.value }))}
                placeholder="Then the system responds..."
                required
              />
            </label>
          </fieldset>

          <section className="form-section">
            <h3>INVEST Review</h3>
            <ul className="invest-checklist">
              {investResult.items.map((item) => (
                <li key={item.key} className={item.passed ? 'is-passed' : 'is-failed'}>
                  <strong>{item.label}:</strong> {item.message}
                </li>
              ))}
            </ul>
            <p className="invest-summary" role="status">
              {investResult.summary}
            </p>
          </section>

          <footer className="modal__footer">
            <button type="submit" className="button">
              Save draft
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
