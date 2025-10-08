import { startServer } from '../apps/backend/src/server.js';

const server = await startServer(4100);
const baseURL = 'http://127.0.0.1:4100';

const fetchJSON = async (path, options) => {
  const response = await fetch(`${baseURL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed (${response.status}): ${body}`);
  }
  return response.status === 204 ? null : response.json();
};

try {
  const mergeRequests = await fetchJSON('/api/merge-requests');
  if (mergeRequests.length === 0) throw new Error('No merge requests seeded');
  const mr = mergeRequests[0];

  const story = await fetchJSON('/api/stories', {
    method: 'POST',
    body: JSON.stringify({
      mrId: mr.id,
      title: 'E2E Story',
      asA: 'As QA',
      iWant: 'I want to validate flows',
      soThat: 'The product is reliable'
    })
  });

  await fetchJSON('/api/tests', {
    method: 'POST',
    body: JSON.stringify({ storyId: story.id })
  });

  const tests = await fetchJSON(`/api/tests?storyId=${story.id}`);
  const [test] = tests;

  await fetchJSON(`/api/tests/${test.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      given: ['Given the story exists'],
      when: ['When validations run'],
      then: ['Then results return within 2 seconds'],
      status: 'Ready'
    })
  });

  await fetchJSON(`/api/merge-requests/${mr.id}/update-branch`, { method: 'POST' });

  console.log('E2E smoke scenario completed successfully.');
} finally {
  await new Promise((resolve) => server.close(resolve));
}
