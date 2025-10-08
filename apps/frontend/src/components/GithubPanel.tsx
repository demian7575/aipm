import { useMutation } from '@tanstack/react-query';
import type { MergeRequest } from '@ai-pm/shared/types';
import { updateBranch } from '../lib/api';
import { useI18n } from '../lib/i18n';

interface GithubPanelProps {
  mergeRequest?: MergeRequest;
}

export default function GithubPanel({ mergeRequest }: GithubPanelProps) {
  const { t } = useI18n();
  const mutation = useMutation({
    mutationFn: () => (mergeRequest ? updateBranch(mergeRequest.id) : Promise.resolve(undefined))
  });

  if (!mergeRequest) {
    return (
      <section className="github-panel">
        <h2>{t('github')}</h2>
        <p>No merge request selected.</p>
      </section>
    );
  }

  return (
    <section className="github-panel">
      <h2>{t('github')}</h2>
      <dl>
        <dt>Repository</dt>
        <dd>{mergeRequest.repo}</dd>
        <dt>Branch</dt>
        <dd>{mergeRequest.branch}</dd>
        <dt>Status</dt>
        <dd>{mergeRequest.status}</dd>
        <dt>{t('drift')}</dt>
        <dd>{mergeRequest.drift ? 'Yes' : 'No'}</dd>
        <dt>{t('lastSync')}</dt>
        <dd>{mergeRequest.lastSyncAt ?? 'n/a'}</dd>
      </dl>
      <button onClick={() => mutation.mutate()} disabled={mutation.isLoading}>
        {t('updateBranch')}
      </button>
      {mutation.isSuccess && <p>Branch updated.</p>}
    </section>
  );
}
