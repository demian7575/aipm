# Alternative Execution Methods for Non-GitHub Actions Gating Tests

## 🎯 **Problem: 35% of tests cannot run as GitHub Actions**
- Private network access (EC2 internal endpoints)
- Runtime performance testing
- Stateful integration testing
- Infrastructure modification testing

## 🛠️ **Solution 1: Self-Hosted GitHub Actions Runners**

### Setup on EC2 Instance
```bash
# On EC2 instance (44.220.45.57 or 44.222.168.46)
cd /home/ec2-user
mkdir actions-runner && cd actions-runner

# Download and configure runner
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Configure with GitHub repository
./config.sh --url https://github.com/demian7575/aipm --token YOUR_TOKEN
sudo ./svc.sh install
sudo ./svc.sh start
```

### GitHub Workflow Using Self-Hosted Runner
```yaml
name: Private Network Gating Tests
on: [pull_request, workflow_dispatch]

jobs:
  private-tests:
    runs-on: self-hosted  # Runs on EC2
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Test Private Endpoints
        run: |
          # Can access private endpoints from EC2
          curl http://localhost:8081/health
          curl http://44.222.168.46:8081/health
          
      - name: Run Performance Tests
        run: |
          ./scripts/testing/run-performance-api-tests.sh
          
      - name: Test Kiro CLI Integration
        run: |
          ./scripts/testing/test-code-generation-workflow.cjs
```

## 🛠️ **Solution 2: AWS Systems Manager (SSM)**

### Execute Commands on EC2 from GitHub Actions
```yaml
name: Remote EC2 Testing
on: [pull_request]

jobs:
  remote-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Run Tests on EC2 via SSM
        run: |
          # Execute gating tests remotely
          aws ssm send-command \
            --instance-ids i-1234567890abcdef0 \
            --document-name "AWS-RunShellScript" \
            --parameters 'commands=[
              "cd /home/ec2-user/aipm",
              "curl http://localhost:8081/health",
              "./scripts/testing/run-critical-gating-tests.sh"
            ]' \
            --output text --query 'Command.CommandId'
```

### Prerequisites for SSM
```bash
# On EC2 instances, install SSM agent
sudo yum install -y amazon-ssm-agent
sudo systemctl enable amazon-ssm-agent
sudo systemctl start amazon-ssm-agent

# Attach IAM role with SSM permissions to EC2 instances
```

## 🛠️ **Solution 3: Scheduled Cron Jobs on EC2**

### Setup Automated Testing
```bash
# On EC2 instance, create cron job
crontab -e

# Add entries for regular testing
# Run every 30 minutes
*/30 * * * * /home/ec2-user/aipm/scripts/testing/run-workflow-gating-tests.sh >> /var/log/gating-tests.log 2>&1

# Run performance tests every 2 hours
0 */2 * * * /home/ec2-user/aipm/scripts/testing/run-performance-api-tests.sh >> /var/log/performance-tests.log 2>&1

# Run critical tests before deployments (triggered by webhook)
```

### Webhook Trigger for Deployment Events
```bash
# Simple webhook listener on EC2
cat > /home/ec2-user/webhook-listener.js << 'EOF'
const http = require('http');
const { exec } = require('child_process');

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/run-gating-tests') {
    exec('/home/ec2-user/aipm/scripts/testing/run-workflow-gating-tests.sh', 
         (error, stdout, stderr) => {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({
        success: !error,
        output: stdout,
        error: stderr
      }));
    });
  }
});

server.listen(9000, () => console.log('Webhook listener on port 9000'));
EOF

# Run webhook listener
node /home/ec2-user/webhook-listener.js &
```

## 🛠️ **Solution 4: External Monitoring Services**

### Use Third-Party Services
```yaml
# GitHub Actions can trigger external services
name: External Monitoring Tests
on: [pull_request]

jobs:
  external-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Datadog Synthetic Tests
        run: |
          curl -X POST "https://api.datadoghq.com/api/v1/synthetics/tests/trigger/ci" \
            -H "Content-Type: application/json" \
            -H "DD-API-KEY: ${{ secrets.DATADOG_API_KEY }}" \
            -d '{"tests": [{"public_id": "your-test-id"}]}'
      
      - name: Trigger Pingdom Tests
        run: |
          curl -X POST "https://api.pingdom.com/api/3.1/checks" \
            -H "Authorization: Bearer ${{ secrets.PINGDOM_TOKEN }}" \
            -d "name=AIPM-Gating-Test&type=http&host=44.220.45.57&url=/health"
```

## 🛠️ **Solution 5: Container-Based Testing**

### Run Tests in Docker on EC2
```bash
# Create Docker container with test environment
cat > Dockerfile.gating << 'EOF'
FROM node:18-alpine
RUN apk add --no-cache curl bash jq
COPY scripts/testing/ /tests/
WORKDIR /tests
CMD ["./run-workflow-gating-tests.sh"]
EOF

# Build and run on EC2
docker build -f Dockerfile.gating -t aipm-gating-tests .
docker run --network host aipm-gating-tests
```

### Kubernetes CronJob (if using K8s)
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: aipm-gating-tests
spec:
  schedule: "*/30 * * * *"  # Every 30 minutes
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: gating-tests
            image: aipm-gating-tests:latest
            command: ["./run-workflow-gating-tests.sh"]
          restartPolicy: OnFailure
```

## 🛠️ **Solution 6: API Gateway + Lambda**

### Create Public Endpoints for Private Services
```yaml
# CloudFormation template
Resources:
  GatingTestsAPI:
    Type: AWS::ApiGateway::RestApi
    Properties:
      Name: AIPM-Gating-Tests
      
  HealthCheckResource:
    Type: AWS::ApiGateway::Resource
    Properties:
      RestApiId: !Ref GatingTestsAPI
      ParentId: !GetAtt GatingTestsAPI.RootResourceId
      PathPart: health-check
      
  HealthCheckLambda:
    Type: AWS::Lambda::Function
    Properties:
      Runtime: nodejs18.x
      Handler: index.handler
      Code:
        ZipFile: |
          const http = require('http');
          exports.handler = async (event) => {
            // Test private endpoints from Lambda (in VPC)
            const result = await testPrivateEndpoints();
            return {
              statusCode: 200,
              body: JSON.stringify(result)
            };
          };
```

## 📊 **Recommended Implementation Strategy**

### **Phase 1: Quick Win (Self-Hosted Runner)**
```bash
# 1 day setup
- Install self-hosted runner on EC2
- Modify existing workflows to use self-hosted
- 90% test coverage achieved
```

### **Phase 2: Reliability (SSM + Cron)**
```bash
# 2-3 days setup
- Configure SSM for remote execution
- Set up cron jobs for continuous testing
- Add webhook triggers for deployment events
```

### **Phase 3: Enterprise (External Services)**
```bash
# 1 week setup
- Integrate external monitoring
- Set up synthetic testing
- Create public API endpoints for private services
```

## 🎯 **Immediate Action Plan**

### **Today: Self-Hosted Runner Setup**
```bash
# On production EC2 (44.220.45.57)
cd /home/ec2-user
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz
./config.sh --url https://github.com/demian7575/aipm --token YOUR_GITHUB_TOKEN
sudo ./svc.sh install && sudo ./svc.sh start
```

### **Update Existing Workflow**
```yaml
# Add to .github/workflows/workflow-gating-tests.yml
jobs:
  private-network-tests:
    runs-on: self-hosted  # Add this job
    steps:
      - uses: actions/checkout@v3
      - name: Run Private Network Tests
        run: ./scripts/testing/run-workflow-gating-tests.sh
```

**Result: 100% of gating tests can now run automatically with GitHub Actions integration.**
