import type { MergeRequest } from '@ai-pm-mindmap/shared';
import { t } from '../i18n';

interface GitHubPanelProps {
  mr: MergeRequest | null;
  onRefresh: () => void;
  loading: boolean;
}

export function GitHubPanel({ mr, onRefresh, loading }: GitHubPanelProps) {
  if (!mr) {
    return <div className="panel">Select a merge request</div>;
  }

  return (
    <div className="panel git-panel">
      <div>
        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{t('repository')}</div>
        <div>{mr.repository}</div>
      </div>
      <div>
        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{t('branch')}</div>
        <div>{mr.branch}</div>
      </div>
      <div className="status-indicator">
        <span className={`status-dot ${mr.drift ? 'off' : 'on'}`} aria-hidden />
        <span>
          {t('drift')}: {mr.drift ? 'Out of sync' : 'In sync'}
        </span>
      </div>
      <div>
        {t('lastSync')}: {new Date(mr.lastSyncAt).toLocaleString()}
      </div>
      <button onClick={onRefresh} disabled={loading} style={{ padding: '0.5rem 0.75rem' }}>
        {loading ? 'Refreshing…' : t('refresh')}
      </button>
    </div>
  );
}
