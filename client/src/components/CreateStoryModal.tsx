import { FormEvent, useEffect, useMemo, useState } from 'react';
import { MergeRequestRoot, UserStoryNode } from '../types/mindmap';
import { evaluateInvest } from '../utils/invest';
import { reviewAcceptanceTestStructure } from '../utils/guidance';

interface StoryDraftForm {
  title: string;
  asA: string;
  iWant: string;
  soThat: string;
  given: string;
  when: string;
  then: string;
}

export interface ParentReference {
  type: 'mr' | 'userStory';
  node: MergeRequestRoot | UserStoryNode;
}

interface CreateStoryModalProps {
  parent: ParentReference;
  isOpen: boolean;
  onClose: () => void;
}

const initialState: StoryDraftForm = {
  title: '',
  asA: '',
  iWant: '',
  soThat: '',
  given: '',
  when: '',
  then: '',
};

export function CreateStoryModal({ parent, isOpen, onClose }: CreateStoryModalProps) {
  const [formState, setFormState] = useState<StoryDraftForm>(() => initialState);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [gherkinReview, setGherkinReview] = useState(() => reviewAcceptanceTestStructure(initialState));

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const hintSubject = parent.node.title.toLowerCase();
    const sharedPersona = 'project manager';
    const defaultPersona = parent.type === 'userStory' ? (parent.node as UserStoryNode).asA : sharedPersona;

    setFormState({
      title: `Extend ${parent.node.title}`,
      asA: defaultPersona,
      iWant: `to build on ${hintSubject} with a focused capability`,
      soThat: parent.type === 'userStory'
        ? (parent.node as UserStoryNode).soThat
        : 'stakeholders can track progress toward the merge request goals',
      given: `Given the context of "${parent.node.title}"`,
      when: 'When a collaborator initiates the new capability',
      then: 'Then the system records observable evidence that the outcome succeeded',
    });
    setHasReviewed(false);
    setGherkinReview(reviewAcceptanceTestStructure(initialState));
  }, [isOpen, parent]);

  const investResult = useMemo(() => evaluateInvest(formState), [formState]);
  const personaPlaceholder = parent.type === 'userStory' ? (parent.node as UserStoryNode).asA : 'project manager';

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasReviewed) {
      return;
    }
    // Mock persistence — in a full implementation this would call the API.
    // eslint-disable-next-line no-alert
    alert('ChatGPT-approved user story drafted (mock save).');
    setFormState(initialState);
    onClose();
  };

  const handleReview = () => {
    setGherkinReview(reviewAcceptanceTestStructure(formState));
    setHasReviewed(true);
  };

  const reviewPassed =
    hasReviewed && investResult.items.every((item) => item.passed) && gherkinReview.items.every((item) => item.passed);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="create-story-heading">
      <div className="modal__content">
        <header className="modal__header">
          <div>
            <h2 id="create-story-heading">Create User Story</h2>
            <p className="modal__subtitle">
              Parent {parent.type === 'mr' ? 'MR' : 'User Story'}: {parent.node.title}
            </p>
          </div>
          <button type="button" className="button button--secondary" onClick={onClose}>
            Close
          </button>
        </header>
        <form className="modal__body" onSubmit={handleSubmit}>
          <fieldset className="form-section">
            <legend>Story framing</legend>
            <label>
              <span>Story title</span>
              <input
                value={formState.title}
                onChange={(event) => {
                  setFormState((prev) => ({ ...prev, title: event.target.value }));
                  setHasReviewed(false);
                }}
                placeholder={`Outcome for ${parent.node.title}`}
                required
              />
            </label>
            <label>
              <span>As a</span>
              <input
                value={formState.asA}
                onChange={(event) => {
                  setFormState((prev) => ({ ...prev, asA: event.target.value }));
                  setHasReviewed(false);
                }}
                placeholder={`E.g. ${personaPlaceholder}`}
                required
              />
            </label>
            <label>
              <span>I want</span>
              <input
                value={formState.iWant}
                onChange={(event) => {
                  setFormState((prev) => ({ ...prev, iWant: event.target.value }));
                  setHasReviewed(false);
                }}
                placeholder={`Deliver value building on "${parent.node.title}"`}
                required
              />
            </label>
            <label>
              <span>So that</span>
              <input
                value={formState.soThat}
                onChange={(event) => {
                  setFormState((prev) => ({ ...prev, soThat: event.target.value }));
                  setHasReviewed(false);
                }}
                placeholder="Outcome focused on stakeholder value"
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
                onChange={(event) => {
                  setFormState((prev) => ({ ...prev, given: event.target.value }));
                  setHasReviewed(false);
                }}
                placeholder="Given the application state..."
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
                placeholder="When a user performs..."
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
                placeholder="Then the system responds..."
                required
              />
            </label>
          </fieldset>

          <section className="form-section">
            <h3>ChatGPT Review</h3>
            <p className="form-hint">
              The virtual reviewer checks INVEST qualities and Given/When/Then testability. Update the draft and re-run the
              review until all items pass.
            </p>
            <div className="review-grid">
              <div>
                <h4>INVEST Checklist</h4>
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
              </div>
              <div>
                <h4>Acceptance Test Heuristics</h4>
                <ul className="invest-checklist">
                  {gherkinReview.items.map((item) => (
                    <li key={item.label} className={item.passed ? 'is-passed' : 'is-failed'}>
                      <strong>{item.label}:</strong> {item.message}
                    </li>
                  ))}
                </ul>
                <p className="invest-summary" role="status">
                  {gherkinReview.summary}
                </p>
              </div>
            </div>
          </section>

          <footer className="modal__footer modal__footer--inline">
            <button type="button" className="button button--secondary" onClick={handleReview}>
              Run ChatGPT Review
            </button>
            <button type="submit" className="button" disabled={!reviewPassed}>
              Create User Story
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
