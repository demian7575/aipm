import { MergeRequest } from '@ai-pm-mindmap/shared';
import { useLocale } from '../i18n/context';

interface GitHubPanelProps {
  mergeRequest: MergeRequest | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const GitHubPanel = ({ mergeRequest, onRefresh, isRefreshing }: GitHubPanelProps) => {
  const { t } = useLocale();

  if (!mergeRequest) {
    return (
      <section className="rounded border border-slate-700/60 bg-slate-900/70 p-4 text-sm text-slate-300">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          {t('githubPanel')}
        </h3>
        <p>No merge request selected.</p>
      </section>
    );
  }

  return (
    <section className="rounded border border-slate-700/60 bg-slate-900/70 p-4 text-sm text-slate-300">
      <header className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          {t('githubPanel')}
        </h3>
        <button
          type="button"
          className="rounded bg-slate-800 px-2 py-1 text-xs"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? 'Refreshing…' : t('refresh')}
        </button>
      </header>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <dt className="text-slate-500">Repository</dt>
        <dd className="text-slate-200">{mergeRequest.repository}</dd>
        <dt className="text-slate-500">Branch</dt>
        <dd className="text-slate-200">{mergeRequest.branch}</dd>
        <dt className="text-slate-500">Status</dt>
        <dd className="text-slate-200">{mergeRequest.status}</dd>
        <dt className="text-slate-500">Sync</dt>
        <dd className={mergeRequest.drifted ? 'text-orange-400' : 'text-emerald-400'}>
          {mergeRequest.drifted ? t('drifted') : t('synced')}
        </dd>
        <dt className="text-slate-500">Last sync</dt>
        <dd className="text-slate-200">
          {mergeRequest.lastSyncAt ? new Date(mergeRequest.lastSyncAt).toLocaleString() : '—'}
        </dd>
      </dl>
    </section>
  );
};

export default GitHubPanel;
