#!/bin/bash
# Extract deployment tests from phase1-security-data-safety.sh

# Run deployment safety tests only
source ./scripts/testing/phase1-security-data-safety.sh
test_deployment_safety
