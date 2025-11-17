import { createApp } from './app.js';

// Mock delegation functions for CodeWhisperer integration
export async function handlePersonalDelegateRequest(req, res, url) {
  try {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        
        // Mock response simulating successful task creation
        const mockResponse = {
          type: 'issue',
          id: Math.floor(Math.random() * 1000),
          html_url: `https://github.com/${payload.owner}/${payload.repo}/issues/123`,
          number: 123,
          taskHtmlUrl: `https://github.com/${payload.owner}/${payload.repo}/issues/123`,
          confirmationCode: Math.random().toString(36).substring(2, 8).toUpperCase()
        };
        
        res.writeHead(201, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(mockResponse));
      } catch (error) {
        res.writeHead(400, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  } catch (error) {
    res.writeHead(500, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

export async function handlePersonalDelegateStatusRequest(req, res, url) {
  // Mock status response
  const mockStatus = {
    fetchedAt: new Date().toISOString(),
    totalComments: 1,
    latestComment: {
      id: 400,
      body: 'Task completed successfully',
      html_url: 'https://github.com/comment/400',
      created_at: new Date().toISOString(),
      author: 'amazon-codewhisperer',
      links: [],
      snippet: 'Task completed successfully'
    }
  };
  
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(mockStatus));
}

const desiredPort = Number(process.env.PORT || 4000);
const allowDynamicFallback = !process.env.PORT;

createApp()
  .then((server) => {
    const listen = (portToUse, allowFallback) => {
      const handleListening = () => {
        server.off('error', handleError);
        const address = server.address();
        const resolvedPort =
          typeof address === 'object' && address !== null ? address.port : portToUse;
        console.log(`Server running on http://localhost:${resolvedPort}`);
      };

      const handleError = (error) => {
        server.off('listening', handleListening);
        if (error && error.code === 'EADDRINUSE' && allowFallback) {
          console.warn(
            `Port ${portToUse} is already in use. Trying a random available port instead.`,
          );
          setImmediate(() => listen(0, false));
          return;
        }

        console.error('Failed to start server', error);
        process.exit(1);
      };

      server.once('listening', handleListening);
      server.once('error', handleError);
      server.listen(portToUse);
    };

    listen(desiredPort, allowDynamicFallback);
  })
  .catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
  });
