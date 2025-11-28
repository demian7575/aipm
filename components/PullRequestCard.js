import React from "react";

const PullRequestCard = ({ pr }) => {
  return (
    <div className="pr-card">
      <h3>{pr.title}</h3>
      <p>{pr.description}</p>
      <div className="actions">
        <button className="run-in-staging">Run in Staging</button>
      </div>
    </div>
  );
};

export default PullRequestCard;