import { randomUUID } from 'node:crypto';

const DEFAULT_CHATGPT_TASKS_URL = 'https://chatgpt.com/codex/api/tasks';

function isHtmlResponse(text) {
  if (!text) {
    return false;
  }
  const snippet = text.trim().slice(0, 200).toLowerCase();
  if (!snippet) {
    return false;
  }
  return (
    snippet.startsWith('<!doctype html') ||
    snippet.startsWith('<html') ||
    /<html[\s>]/i.test(snippet) ||
    /<body[\s>]/i.test(snippet)
  );
}

function summarizeHtml(text) {
  if (!text) {
    return '';
  }
  const withoutScripts = text.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  const withoutStyles = withoutScripts.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const withoutComments = withoutStyles.replace(/<!--([\s\S]*?)-->/g, ' ');
  const plain = withoutComments.replace(/<[^>]+>/g, ' ');
  const normalized = plain.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }
  const snippet = normalized.slice(0, 240).trim();
  const truncated = normalized.length > snippet.length;
  return `${snippet}${truncated ? '…' : ''}`;
}

function describeHtmlResponse(text) {
  const summary = summarizeHtml(text);
  if (summary) {
    return `ChatGPT Codex service returned HTML: ${summary}`;
  }
  return 'ChatGPT Codex service returned HTML content.';
}

function normalizeChatgptResponse(body, endpoint) {
  if (!body || typeof body !== 'object') {
    throw Object.assign(new Error('ChatGPT Codex service returned an invalid response'), {
      statusCode: 502,
    });
  }
  const idCandidates = [
    body.id,
    body.taskId,
    body.task_id,
    body.delegationId,
    body.delegation_id,
  ];
  const id = idCandidates.find((value) => typeof value === 'string' && value.trim());
  const urlCandidates = [
    body.url,
    body.taskUrl,
    body.task_url,
    body.htmlUrl,
    body.html_url,
    body.links?.html,
    body.links?.task,
    body.links?.self,
  ];
  const url = urlCandidates.find((value) => typeof value === 'string' && value.trim()) ?? '';
  const statusCandidates = [
    body.status,
    body.state,
    body.taskStatus,
    body.task_status,
    body.result?.status,
  ];
  const status = statusCandidates.find((value) => typeof value === 'string' && value.trim()) ?? 'Queued';
  const summaryCandidates = [body.summary, body.message, body.description, body.result?.summary];
  const summary = summaryCandidates.find((value) => typeof value === 'string' && value.trim()) ?? '';

  return {
    id: (id ? id.trim() : `chatgpt-${randomUUID()}`),
    url,
    status,
    summary,
    raw: body,
    endpoint,
  };
}

export function isChatgptCodexConfigured() {
  return Boolean(process.env.CODEX_CHATGPT_AUTH_TOKEN);
}

export async function createChatgptCodexTask(record) {
  if (!isChatgptCodexConfigured()) {
    return null;
  }
  if (typeof fetch !== 'function') {
    throw Object.assign(new Error('ChatGPT Codex integration requires global fetch support'), {
      statusCode: 500,
    });
  }
  const endpoint = process.env.CODEX_CHATGPT_TASKS_URL || DEFAULT_CHATGPT_TASKS_URL;
  const token = process.env.CODEX_CHATGPT_AUTH_TOKEN;
  const body = {
    title: record?.storyTitle || 'Untitled Story',
    summary: record?.summary || '',
    instructions: record?.instructions || '',
    metadata: {
      repositoryUrl: record?.repositoryUrl || '',
      branch: record?.branch || 'main',
      plan: record?.plan || 'personal-plus',
      storyId: record?.storyId ?? null,
      storyTitle: record?.storyTitle || 'Untitled Story',
    },
    links: {
      repository: record?.repositoryUrl || '',
      pullRequest: record?.prUrl || '',
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const htmlDetected = isHtmlResponse(text);
  let data = null;
  let parseError = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      parseError = error;
      if (response.ok && process.env.CODEX_CHATGPT_REQUIRE_SUCCESS !== '1') {
        data = {
          message: htmlDetected ? describeHtmlResponse(text) : text,
          rawText: text,
          ...(htmlDetected ? { html: true } : {}),
        };
      } else if (!response.ok) {
        data = {
          ...(htmlDetected ? { message: describeHtmlResponse(text), html: true } : {}),
          rawText: text,
        };
      } else {
        throw Object.assign(new Error('ChatGPT Codex service returned invalid JSON'), {
          statusCode: response.status || 502,
          cause: error,
          responseText: text,
        });
      }
    }
  }
  if (!response.ok) {
    const fallbackMessage =
      (data && typeof data.message === 'string' && data.message.trim()) ||
      (htmlDetected ? describeHtmlResponse(text) : null) ||
      (text && text.trim() ? text.trim() : null);
    const error = new Error(
      fallbackMessage || `ChatGPT Codex service responded with status ${response.status}`,
    );
    error.statusCode = response.status || 502;
    if (data) {
      error.details = data;
    } else if (text) {
      error.details = { rawText: text };
    }
    if (htmlDetected) {
      error.html = true;
    }
    throw error;
  }
  if (!data) {
    data = {};
  }
  if (typeof data === 'object') {
    if (text && typeof data.rawText !== 'string') {
      data.rawText = text;
    }
    if (parseError && typeof parseError?.message === 'string' && !data.parseError) {
      data.parseError = parseError.message;
    }
  }
  return normalizeChatgptResponse(data, endpoint);
}
