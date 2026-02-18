// Simple config loader - reads from environments.yaml and AWS API
import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Detect environment
const ENV = process.env.ENVIRONMENT || process.env.NODE_ENV || 'prod';
const envKey = ENV === 'development' ? 'dev' : 'prod';

// Load YAML
const yamlPath = join(__dirname, '../../config/environments.yaml');
const yamlContent = readFileSync(yamlPath, 'utf8');
const config = load(yamlContent);
const envConfig = config[envKey];

// Fetch current EC2 IP from AWS
const ec2Client = new EC2Client({ region: 'us-east-1' });
let currentIP = envConfig.ec2_ip; // fallback

try {
  const command = new DescribeInstancesCommand({
    InstanceIds: [envConfig.instance_id]
  });
  const response = await ec2Client.send(command);
  const instance = response.Reservations?.[0]?.Instances?.[0];
  if (instance?.PublicIpAddress) {
    currentIP = instance.PublicIpAddress;
    console.log(`✅ Fetched current EC2 IP from AWS: ${currentIP}`);
  }
} catch (error) {
  console.warn(`⚠️  Could not fetch EC2 IP from AWS, using config value: ${currentIP}`);
}

// Export as environment variables
export default {
  ENVIRONMENT: ENV,
  AWS_REGION: 'us-east-1',
  
  // DynamoDB
  STORIES_TABLE: envConfig.dynamodb_stories_table,
  ACCEPTANCE_TESTS_TABLE: envConfig.dynamodb_tests_table,
  PRS_TABLE: envConfig.dynamodb_prs_table,
  
  // Service URLs (localhost since all on same EC2)
  EC2_IP: currentIP,
  API_PORT: envConfig.api_port,
  SESSION_POOL_PORT: envConfig.session_pool_port,
  SESSION_POOL_URL: `http://localhost:${envConfig.session_pool_port}`,
  SEMANTIC_API_PORT: envConfig.semantic_api_port,
  SEMANTIC_API_URL: `http://localhost:${envConfig.semantic_api_port}`,
  TERMINAL_PORT: envConfig.terminal_port,
  
  // S3
  S3_BUCKET: envConfig.s3_bucket,
  S3_URL: envConfig.s3_url
};
