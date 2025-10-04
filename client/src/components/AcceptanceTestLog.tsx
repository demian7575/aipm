import { AcceptanceTestLogEntry } from '../types/mindmap';

interface AcceptanceTestLogProps {
  log: AcceptanceTestLogEntry[];
}

export function AcceptanceTestLog({ log }: AcceptanceTestLogProps) {
  if (!log.length) {
    return (
      <section className="panel">
        <h2 className="panel-title">Acceptance Test Activity</h2>
        <p className="panel-empty">No acceptance test executions recorded yet.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2 className="panel-title">Acceptance Test Activity</h2>
      <table className="activity-table">
        <thead>
          <tr>
            <th scope="col">Executed</th>
            <th scope="col">Tester</th>
            <th scope="col">Outcome</th>
            <th scope="col">Notes</th>
          </tr>
        </thead>
        <tbody>
          {log.map((entry) => (
            <tr key={entry.id}>
              <td>{new Date(entry.executedAt).toLocaleString()}</td>
              <td>{entry.tester}</td>
              <td>
                <span className={`badge badge--${entry.outcome}`}>{entry.outcome}</span>
              </td>
              <td>{entry.notes ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
