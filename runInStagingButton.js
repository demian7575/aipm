import React from "react";
import { Button } from "@material-ui/core";

const RunInStagingButton = ({ pullRequestId }) => {
  const handleRunInStaging = () => {
    // Code to deploy pull request to staging environment
    fetchDeployToStaging(pullRequestId);
  };

  return (
    <Button variant="contained" color="primary" onClick={handleRunInStaging}>
      Run In Staging
    </Button>
  );
};

export default RunInStagingButton;