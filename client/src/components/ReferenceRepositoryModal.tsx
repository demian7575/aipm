import { FormEvent, useEffect, useState } from 'react';
import { ReferenceRepositoryConfig } from '../types/mindmap';

interface ReferenceRepositoryModalProps {
  isOpen: boolean;
  initialValue?: ReferenceRepositoryConfig | null;
  onClose: () => void;
  onSave: (config: ReferenceRepositoryConfig) => void;
}

interface RepositoryFormState {
  label: string;
  url: string;
  description: string;
}

const emptyForm: RepositoryFormState = {
  label: '',
  url: '',
  description: '',
};

export function ReferenceRepositoryModal({ isOpen, initialValue, onClose, onSave }: ReferenceRepositoryModalProps) {
  const [formState, setFormState] = useState<RepositoryFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormState({
      label: initialValue?.label ?? '',
      url: initialValue?.url ?? '',
      description: initialValue?.description ?? '',
    });
    setError(null);
  }, [initialValue, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState.label.trim()) {
      setError('Provide a short label to help teammates recognise the repository.');
      return;
    }

    try {
      // eslint-disable-next-line no-new
      new URL(formState.url);
    } catch (err) {
      setError('Enter a valid repository URL, including the protocol (https://…).');
      return;
    }

    onSave({
      label: formState.label.trim(),
      url: formState.url.trim(),
      description: formState.description.trim() || undefined,
    });
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="reference-repo-heading">
      <div className="modal__content">
        <header className="modal__header">
          <div>
            <h2 id="reference-repo-heading">Configure reference documents</h2>
            <p className="modal__subtitle">
              Link a repository that stores personas, requirement briefs, or acceptance test catalogues.
            </p>
          </div>
          <button type="button" className="button button--secondary" onClick={onClose}>
            Close
          </button>
        </header>
        <form className="modal__body" onSubmit={handleSubmit}>
          <fieldset className="form-section">
            <legend>Repository details</legend>
            <label>
              <span>Display label</span>
              <input
                value={formState.label}
                onChange={(event) => setFormState((prev) => ({ ...prev, label: event.target.value }))}
                placeholder="e.g. AI PM Reference Docs"
                required
              />
            </label>
            <label>
              <span>Repository URL</span>
              <input
                value={formState.url}
                onChange={(event) => setFormState((prev) => ({ ...prev, url: event.target.value }))}
                placeholder="https://github.com/org/reference-docs"
                required
              />
            </label>
            <label>
              <span>Notes (optional)</span>
              <textarea
                value={formState.description}
                onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Describe the artefacts available in this repository"
              />
            </label>
          </fieldset>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <footer className="modal__footer modal__footer--inline">
            <span className="modal__hint">ChatGPT validates the repository URL format before saving.</span>
            <button type="submit" className="button">
              Save reference repository
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default ReferenceRepositoryModal;
