/**
 * Lambda function to auto-start EC2 and proxy requests
 * Deploy this to AWS Lambda with API Gateway trigger
 */

const { EC2Client, DescribeInstancesCommand, StartInstancesCommand } = require('@aws-sdk/client-ec2');
const https = require('https');
const http = require('http');

const INSTANCE_ID = 'i-016241c7a18884e80';
const REGION = 'us-east-1';
const MAX_WAIT_TIME = 120000; // 2 minutes
const POLL_INTERVAL = 5000; // 5 seconds

const ec2Client = new EC2Client({ region: REGION });

async function getInstanceStatus() {
  const command = new DescribeInstancesCommand({
    InstanceIds: [INSTANCE_ID]
  });
  
  const response = await ec2Client.send(command);
  const instance = response.Reservations[0].Instances[0];
  
  return {
    state: instance.State.Name,
    ip: instance.PublicIpAddress
  };
}

async function startInstance() {
  console.log('Starting EC2 instance...');
  const command = new StartInstancesCommand({
    InstanceIds: [INSTANCE_ID]
  });
  
  await ec2Client.send(command);
}

async function waitForInstance() {
  const startTime = Date.now();
  
  while (Date.now() - startTime < MAX_WAIT_TIME) {
    const status = await getInstanceStatus();
    
    if (status.state === 'running' && status.ip) {
      // Wait additional 30 seconds for services to start
      console.log('Instance running, waiting for services...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      return status.ip;
    }
    
    console.log(`Instance state: ${status.state}, waiting...`);
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }
  
  throw new Error('Timeout waiting for instance to start');
}

async function proxyRequest(ip, event) {
  const path = event.path || event.rawPath || '/';
  const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
  const headers = event.headers || {};
  const body = event.body || '';
  
  // Determine port based on path
  let port = 4000; // Default backend
  if (path.startsWith('/aipm/')) {
    port = 8083; // Semantic API
  }
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: ip,
      port: port,
      path: path,
      method: method,
      headers: {
        ...headers,
        'Host': ip
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(body);
    }
    
    req.end();
  });
}

exports.handler = async (event) => {
  try {
    console.log('Request received:', JSON.stringify(event, null, 2));
    
    // Check instance status
    let status = await getInstanceStatus();
    console.log('Instance status:', status);
    
    // Start if stopped
    if (status.state === 'stopped') {
      await startInstance();
      const ip = await waitForInstance();
      status = { state: 'running', ip };
    } else if (status.state === 'stopping') {
      // Wait for it to stop, then start
      console.log('Instance is stopping, waiting...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      await startInstance();
      const ip = await waitForInstance();
      status = { state: 'running', ip };
    } else if (status.state === 'pending' || status.state === 'running') {
      // Wait for it to be fully running
      if (!status.ip) {
        const ip = await waitForInstance();
        status = { state: 'running', ip };
      }
    }
    
    // Proxy the request
    console.log('Proxying request to:', status.ip);
    const response = await proxyRequest(status.ip, event);
    
    return {
      statusCode: response.statusCode,
      headers: {
        ...response.headers,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Use-Dev-Tables'
      },
      body: response.body
    };
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: error.message,
        message: 'Failed to start EC2 or proxy request'
      })
    };
  }
};
