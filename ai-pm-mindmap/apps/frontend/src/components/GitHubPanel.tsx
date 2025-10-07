import { MergeRequest } from '@ai-pm-mindmap/shared';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface GitHubPanelProps {
  mergeRequest: MergeRequest;
  onRefresh: (mr: MergeRequest) => Promise<void>;
}

dayjs.extend(relativeTime);

export default function GitHubPanel({ mergeRequest, onRefresh }: GitHubPanelProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    await onRefresh(mergeRequest);
    setLoading(false);
  };

  return (
    <section className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-2">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-200">{t('githubPanel')}</h2>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="text-xs bg-sky-500 hover:bg-sky-400 text-slate-900 rounded px-2 py-1"
        >
          {loading ? 'Refreshing...' : t('refresh')}
        </button>
      </header>
      <p className="text-xs text-slate-400">{mergeRequest.repository}</p>
      <p className="text-xs text-slate-400">Branch: {mergeRequest.branch}</p>
      <p className="text-xs text-slate-300">
        {t('drift')}: {mergeRequest.drift ? 'Yes' : 'No'}
      </p>
      <p className="text-xs text-slate-400">
        {t('lastSync')}: {mergeRequest.lastSyncAt ? dayjs(mergeRequest.lastSyncAt).fromNow() : 'Never'}
      </p>
    </section>
  );
}
