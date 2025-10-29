import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';

function buildPullRequestUrl(repositoryUrl, number) {
  if (!repositoryUrl) {
    return `https://example.local/mock-pr/${number}`;
  }

  try {
    const parsed = new URL(repositoryUrl);
    const normalizedPath = parsed.pathname
      .replace(/\/+$/, '')
      .replace(/\.git$/i, '');
    return `${parsed.origin}${normalizedPath}/pull/${number}`;
  } catch {
    const sanitized = String(repositoryUrl)
      .replace(/\/+$/, '')
      .replace(/\.git$/i, '');
    return `${sanitized}/pull/${number}`;
  }
}

export async function startLocalCodexDelegationServer(options = {}) {
  const { host = '127.0.0.1', port = 0 } = options;

  const server = createServer((req, res) => {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          message: 'Method Not Allowed. Retry using POST.',
        }),
      );
      return;
    }

    if (!req.url || !req.url.startsWith('/personal-delegate')) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: 'Not Found' }));
      return;
    }

    let payload = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      payload += chunk;
    });

    req.on('end', () => {
      let body = null;
      if (payload) {
        try {
          body = JSON.parse(payload);
        } catch {
          body = { raw: payload };
        }
      }

      const number = Math.floor(Math.random() * 9000) + 1000;
      const identifier = randomUUID();
      const repositoryUrl = body?.repository?.url || '';
      const prUrl = buildPullRequestUrl(repositoryUrl, number);

      const response = {
        status: 'submitted',
        pullRequest: {
          url: prUrl,
          status: 'open',
          identifier,
          number,
        },
        task: {
          status: 'In Progress',
        },
      };

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(response));
    });
  });

  return await new Promise((resolve, reject) => {
    const handleError = (error) => {
      cleanup();
      reject(error);
    };

    const handleListening = () => {
      cleanup();
      const address = server.address();
      const actualPort = typeof address === 'object' && address !== null ? address.port : port;
      resolve({
        server,
        host,
        port: actualPort,
        url: `http://${host}:${actualPort}/personal-delegate`,
        close: () =>
          new Promise((closeResolve, closeReject) => {
            server.close((error) => {
              if (error) closeReject(error);
              else closeResolve();
            });
          }),
      });
    };

    const cleanup = () => {
      server.off('error', handleError);
      server.off('listening', handleListening);
    };

    server.on('error', handleError);
    server.on('listening', handleListening);
    server.listen(port, host);
  });
}

export default startLocalCodexDelegationServer;
