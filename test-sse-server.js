#!/usr/bin/env node

// Test SSE endpoint locally
import http from 'http';

const PORT = 4001; // Use different port to avoid conflict

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  if (url.pathname.match(/\/api\/stories\/\d+\/tests\/generate-draft-stream/)) {
    console.log('📡 SSE request received');
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    
    // Send progress updates
    res.write(`data: ${JSON.stringify({ status: 'progress', message: 'Analyzing story...' })}\n\n`);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    res.write(`data: ${JSON.stringify({ status: 'progress', message: 'Generating tests...' })}\n\n`);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    res.write(`data: ${JSON.stringify({ 
      status: 'complete',
      success: true,
      acceptanceTests: [{
        title: 'Test ordering candidates',
        given: ['Given candidates exist in the system'],
        when: ['When user views candidate list'],
        then: ['Then candidates are ordered by similarity score']
      }],
      elapsed: 2
    })}\n\n`);
    
    res.end();
    console.log('✅ SSE stream completed');
    return;
  }
  
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`🧪 Test SSE server running on http://localhost:${PORT}`);
  console.log(`Test with: curl -N "http://localhost:${PORT}/api/stories/123/tests/generate-draft-stream?idea=test"`);
});
