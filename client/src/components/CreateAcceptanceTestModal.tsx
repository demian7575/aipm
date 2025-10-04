import { FormEvent, useEffect, useState } from 'react';
import { UserStoryNode } from '../types/mindmap';
import { reviewAcceptanceTestStructure } from '../utils/guidance';

interface AcceptanceTestForm {
  name: string;
  description: string;
  given: string;
  when: string;
  then: string;
}

interface CreateAcceptanceTestModalProps {
  story: UserStoryNode;
  isOpen: boolean;
  onClose: () => void;
}

const initialState: AcceptanceTestForm = {
  name: '',
  description: '',
  given: '',
  when: '',
  then: '',
};

export function CreateAcceptanceTestModal({ story, isOpen, onClose }: CreateAcceptanceTestModalProps) {
  const [formState, setFormState] = useState<AcceptanceTestForm>(() => initialState);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [review, setReview] = useState(() => reviewAcceptanceTestStructure(initialState));

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormState({
      name: `Validate ${story.title}`,
      description: `Ensure ${story.iWant} succeeds for ${story.asA}.`,
      given: `Given the user story "${story.title}" is in scope`,
      when: 'When the scenario is executed end-to-end',
      then: 'Then observable artefacts confirm the acceptance criteria',
    });
    setReview(reviewAcceptanceTestStructure(initialState));
    setHasReviewed(false);
  }, [isOpen, story]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasReviewed) {
      return;
    }
    // eslint-disable-next-line no-alert
    alert('Acceptance test queued for implementation (mock save).');
    setFormState(initialState);
    onClose();
  };

  const handleReview = () => {
    setReview(reviewAcceptanceTestStructure(formState));
    setHasReviewed(true);
  };

  const ready = hasReviewed && review.items.every((item) => item.passed);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="create-acceptance-test-heading">
      <div className="modal__content">
        <header className="modal__header">
          <div>
            <h2 id="create-acceptance-test-heading">Attach Acceptance Test</h2>
            <p className="modal__subtitle">Target user story: {story.title}</p>
          </div>
          <button type="button" className="button button--secondary" onClick={onClose}>
            Close
          </button>
        </header>
        <form className="modal__body" onSubmit={handleSubmit}>
          <fieldset className="form-section">
            <legend>Test summary</legend>
            <label>
              <span>Test name</span>
              <input
                value={formState.name}
                onChange={(event) => {
                  setFormState((prev) => ({ ...prev, name: event.target.value }));
                  setHasReviewed(false);
                }}
                placeholder={`Validate ${story.title}`}
                required
              />
            </label>
            <label>
              <span>Description</span>
              <textarea
                value={formState.description}
                onChange={(event) => {
                  setFormState((prev) => ({ ...prev, description: event.target.value }));
                  setHasReviewed(false);
                }}
                placeholder="Outline the observable behaviour this test confirms"
                required
              />
            </label>
          </fieldset>

          <fieldset className="form-section">
            <legend>Given / When / Then</legend>
            <label>
              <span>Given</span>
              <textarea
                value={formState.given}
                onChange={(event) => {
                  setFormState((prev) => ({ ...prev, given: event.target.value }));
                  setHasReviewed(false);
                }}
                required
              />
            </label>
            <label>
              <span>When</span>
              <textarea
                value={formState.when}
                onChange={(event) => {
                  setFormState((prev) => ({ ...prev, when: event.target.value }));
                  setHasReviewed(false);
                }}
                required
              />
            </label>
            <label>
              <span>Then</span>
              <textarea
                value={formState.then}
                onChange={(event) => {
                  setFormState((prev) => ({ ...prev, then: event.target.value }));
                  setHasReviewed(false);
                }}
                required
              />
            </label>
          </fieldset>

          <section className="form-section">
            <h3>ChatGPT Review</h3>
            <p className="form-hint">Review ensures the test steps follow Given/When/Then conventions and remain testable.</p>
            <ul className="invest-checklist">
              {review.items.map((item) => (
                <li key={item.label} className={item.passed ? 'is-passed' : 'is-failed'}>
                  <strong>{item.label}:</strong> {item.message}
                </li>
              ))}
            </ul>
            <p className="invest-summary" role="status">
              {review.summary}
            </p>
          </section>

          <footer className="modal__footer modal__footer--inline">
            <button type="button" className="button button--secondary" onClick={handleReview}>
              Run ChatGPT Review
            </button>
            <button type="submit" className="button" disabled={!ready}>
              Create Acceptance Test
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
