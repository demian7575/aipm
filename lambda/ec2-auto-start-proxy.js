/**
 * Lambda function to auto-start EC2 and proxy requests
 * Deploy this to AWS Lambda with API Gateway trigger
 */

const { EC2Client, DescribeInstancesCommand, StartInstancesCommand } = require('@aws-sdk/client-ec2');
const https = require('https');
const http = require('http');

const INSTANCE_IDS = {
  prod: 'i-09971cca92b9bf3a9',
  dev: 'i-08c78da25af47b3cb'
};
const REGION = 'us-east-1';
const MAX_WAIT_TIME = 120000; // 2 minutes
const POLL_INTERVAL = 5000; // 5 seconds

const ec2Client = new EC2Client({ region: REGION });

function getEnvironment(event) {
  // Check X-Environment header
  const headers = event.headers || {};
  const envHeader = headers['x-environment'] || headers['X-Environment'];
  if (envHeader && INSTANCE_IDS[envHeader]) {
    return envHeader;
  }
  
  // Check query parameter
  const queryParams = event.queryStringParameters || {};
  if (queryParams.env && INSTANCE_IDS[queryParams.env]) {
    return queryParams.env;
  }
  
  // Default to prod
  return 'prod';
}

async function getInstanceStatus(instanceId) {
  const command = new DescribeInstancesCommand({
    InstanceIds: [instanceId]
  });
  
  const response = await ec2Client.send(command);
  const instance = response.Reservations[0].Instances[0];
  
  return {
    state: instance.State.Name,
    ip: instance.PublicIpAddress
  };
}

async function startInstance(instanceId) {
  console.log('Starting EC2 instance:', instanceId);
  const command = new StartInstancesCommand({
    InstanceIds: [instanceId]
  });
  
  await ec2Client.send(command);
}

async function waitForInstance(instanceId) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < MAX_WAIT_TIME) {
    const status = await getInstanceStatus(instanceId);
    
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
  const queryString = event.rawQueryString || '';
  const fullPath = queryString ? `${path}?${queryString}` : path;
  const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
  const headers = event.headers || {};
  const body = event.body || '';
  
  // Determine port based on path
  let port;
  if (path.startsWith('/aipm/')) {
    port = 8083; // AIPM's embedded semantic API
  } else if (path.match(/^\/(weather|templates|template\/|callback\/)/)) {
    port = 9000; // Standalone semantic API
  } else {
    port = 4000; // Default backend (includes /health, /api/*)
  }
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: ip,
      port: port,
      path: fullPath,
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
    
    // Determine environment
    const env = getEnvironment(event);
    const instanceId = INSTANCE_IDS[env];
    console.log(`Environment: ${env}, Instance: ${instanceId}`);
    
    // Check instance status
    let status = await getInstanceStatus(instanceId);
    console.log('Instance status:', status);
    
    // Start if stopped
    if (status.state === 'stopped') {
      await startInstance(instanceId);
      const ip = await waitForInstance(instanceId);
      status = { state: 'running', ip };
    } else if (status.state === 'stopping') {
      // Wait for it to stop, then start
      console.log('Instance is stopping, waiting...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      await startInstance(instanceId);
      const ip = await waitForInstance(instanceId);
      status = { state: 'running', ip };
    } else if (status.state === 'pending' || status.state === 'running') {
      // Wait for it to be fully running
      if (!status.ip) {
        const ip = await waitForInstance(instanceId);
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
        'Access-Control-Allow-Headers': 'Content-Type, X-Use-Dev-Tables, X-Environment'
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
