import { formatDistanceToNow } from 'date-fns';
import { useWorkspaceStore } from '../../state/useWorkspaceStore.js';

export default function GithubPanel() {
  const mergeRequests = useWorkspaceStore((state) => state.mergeRequests);
  const selectedMrId = useWorkspaceStore((state) => state.selectedMrId);
  const updateBranch = useWorkspaceStore((state) => state.updateBranch);
  const mr = mergeRequests.find((item) => item.id === selectedMrId) ?? mergeRequests[0];

  if (!mr) {
    return <div className="text-sm text-slate-400">No merge requests</div>;
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm space-y-1 w-72">
      <p className="font-semibold">{mr.title}</p>
      <p>Branch: {mr.branch}</p>
      <p>Status: {mr.status}</p>
      <p>
        Drift: <span className={mr.drift ? 'text-amber-300' : 'text-emerald-300'}>{mr.drift ? 'Yes' : 'No'}</span>
      </p>
      <p>Last sync: {formatDistanceToNow(new Date(mr.lastSyncAt), { addSuffix: true })}</p>
      <button className="px-3 py-1 bg-primary text-white rounded" onClick={() => updateBranch()}>
        Update Branch
      </button>
    </div>
  );
}
