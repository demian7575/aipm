import './GuidanceSummary.css';
import type { GuidanceReport } from '../guidance/types';

interface GuidanceSummaryProps {
  report: GuidanceReport | null;
  heading: string;
}

export function GuidanceSummary({ report, heading }: GuidanceSummaryProps) {
  if (!report) {
    return (
      <div className="guidance-summary guidance-summary--idle">
        <h4>{heading}</h4>
        <p>Run the assistant to validate the draft before creating.</p>
      </div>
    );
  }

  return (
    <div className={`guidance-summary guidance-summary--${report.level}`}>
      <h4>{heading}</h4>
      <p className="guidance-summary__summary">{report.summary}</p>
      <ul>
        {report.checks.map((check) => (
          <li key={check.id} className={`guidance-summary__check guidance-summary__check--${check.level}`}>
            <strong>{check.label}:</strong> {check.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
