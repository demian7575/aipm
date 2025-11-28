import React from 'react';

const PullRequestCard = ({ pullRequest }) => {
  const handleRunInStaging = () => {
    // Logic to deploy PR to staging environment
  };

  return (
    <div className="pr-card">
      <h3>{pullRequest.title}</h3>
      <p>{pullRequest.description}</p>
      <button onClick={handleRunInStaging}>Run in Staging</button>
    </div>
  );
};

export default PullRequestCard;