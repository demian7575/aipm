import { createKiroTerminal } from '../components/kiro-terminal.js';

const params = new URLSearchParams(window.location.search);
const prNumber = params.get('pr') || params.get('prNumber');
const branchName = params.get('branch') || params.get('branchName');
const taskTitle = params.get('title') || params.get('taskTitle');
const stateEntry = window.history.state?.prEntry || window.history.state?.pr || null;

const appRoot = document.getElementById('app');

(async () => {
  const { element, destroy } = await createKiroTerminal({
    prEntry: stateEntry,
    prNumber,
    branch: branchName,
    taskTitle
  });

  appRoot.appendChild(element);

  window.addEventListener('beforeunload', destroy, { once: true });
})();
