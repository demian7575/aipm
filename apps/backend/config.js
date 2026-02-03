// Simple config loader - reads from environments.yaml
import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

// Export as environment variables
export default {
  ENVIRONMENT: ENV,
  AWS_REGION: 'us-east-1',
  
  // DynamoDB
  STORIES_TABLE: envConfig.dynamodb_stories_table,
  ACCEPTANCE_TESTS_TABLE: envConfig.dynamodb_tests_table,
  PRS_TABLE: envConfig.dynamodb_prs_table,
  
  // Service URLs (localhost since all on same EC2)
  EC2_IP: envConfig.ec2_ip,
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
