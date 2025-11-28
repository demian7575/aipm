import React from 'react';

const PullRequestCard = ({ pr }) => {
  const handleRunInStaging = () => {
    // Logic to deploy PR to staging environment
  };

  return (
    <div className="pr-card">
      <h3>{pr.title}</h3>
      <p>{pr.description}</p>
      <button onClick={handleRunInStaging}>Run in Staging</button>
    </div>
  );
};

export default PullRequestCard;