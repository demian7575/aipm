#!/usr/bin/env node

console.log('Environment variables test:');
console.log('STAGE:', process.env.STAGE);
console.log('PR_NUMBER:', process.env.PR_NUMBER);
console.log('COMMIT_SHA:', process.env.COMMIT_SHA);

const stage = process.env.STAGE || process.env.AWS_STAGE || 'prod';
console.log('Resolved stage:', stage);

if (stage === 'dev' || stage === 'development') {
  const prNumber = process.env.PR_NUMBER || '988';
  const commitSha = process.env.COMMIT_SHA || 'f38c6d';
  const version = `version-${prNumber}-${commitSha}`;
  console.log('Development version:', version);
} else {
  console.log('Production version: 4.0.0');
}
