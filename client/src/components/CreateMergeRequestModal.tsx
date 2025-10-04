import { FormEvent, useEffect, useState } from 'react';
import { reviewMergeRequest } from '../utils/guidance';

interface MergeRequestForm {
  title: string;
  description: string;
  objective: string;
}

interface CreateMergeRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const initialState: MergeRequestForm = {
  title: '',
  description: '',
  objective: '',
};

export function CreateMergeRequestModal({ isOpen, onClose }: CreateMergeRequestModalProps) {
  const [formState, setFormState] = useState<MergeRequestForm>(() => initialState);
  const [review, setReview] = useState(() => reviewMergeRequest(initialState));
  const [hasReviewed, setHasReviewed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormState(initialState);
      setReview(reviewMergeRequest(initialState));
      setHasReviewed(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasReviewed || !review.ready) {
      return;
    }
    // eslint-disable-next-line no-alert
    alert('Merge request registered for backlog refinement (mock save).');
    setFormState(initialState);
    setReview(reviewMergeRequest(initialState));
    setHasReviewed(false);
    onClose();
  };

  const handleReview = () => {
    const nextReview = reviewMergeRequest(formState);
    setReview(nextReview);
    setHasReviewed(true);
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="create-mr-heading">
      <div className="modal__content">
        <header className="modal__header">
          <div>
            <h2 id="create-mr-heading">Create Merge Request</h2>
            <p className="modal__subtitle">Ensure the MR contains enough context for AI-guided planning.</p>
          </div>
          <button type="button" className="button button--secondary" onClick={onClose}>
            Close
          </button>
        </header>
        <form className="modal__body" onSubmit={handleSubmit}>
          <fieldset className="form-section">
            <legend>Merge request details</legend>
            <label>
              <span>Title</span>
              <input
                value={formState.title}
                onChange={(event) => {
                  setFormState((prev) => ({ ...prev, title: event.target.value }));
                  setHasReviewed(false);
                }}
                placeholder="MR: Describe the initiative"
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
                placeholder="Include context, constraints, and key stakeholders"
                required
              />
            </label>
            <label>
              <span>Business objective</span>
              <textarea
                value={formState.objective}
                onChange={(event) => {
                  setFormState((prev) => ({ ...prev, objective: event.target.value }));
                  setHasReviewed(false);
                }}
                placeholder="Explain the measurable outcome this MR must deliver"
                required
              />
            </label>
          </fieldset>

          <section className="form-section">
            <h3>ChatGPT Review</h3>
            <p className="form-hint">The reviewer checks clarity, context, and outcome articulation.</p>
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
            <button type="submit" className="button" disabled={!hasReviewed || !review.ready}>
              Create Merge Request
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
