# EC2 Auto-Start/Stop System

Automatically start EC2 instances when AIPM loads and stop them after 30 minutes of inactivity to save costs.

## Architecture

```
User Opens AIPM
  ↓
Frontend checks EC2 status (Lambda)
  ↓
If stopped → Start EC2
  ↓
EC2 starts → User data updates S3 with new IP
  ↓
Frontend polls S3 for new IP
  ↓
Frontend connects to EC2
  ↓
Backend tracks activity on every request
  ↓
Cron job checks activity every 5 min
  ↓
If idle >30 min → Stop EC2
```

## Components

### 1. Lambda Function (`aipm-ec2-controller`)
- **Purpose**: Start/stop/status EC2 instances
- **Endpoints**:
  - `?action=status&env=prod` - Get EC2 status
  - `?action=start&env=prod` - Start EC2
  - `?action=stop&env=prod` - Stop EC2
- **API Gateway**: https://nger6kll11.execute-api.us-east-1.amazonaws.com

### 2. S3 Config Bucket (`aipm-ec2-config`)
- **Purpose**: Store current EC2 IPs
- **Files**:
  - `prod-config.json` - Production EC2 config
  - `dev-config.json` - Development EC2 config
- **URLs**:
  - https://aipm-ec2-config.s3.amazonaws.com/prod-config.json
  - https://aipm-ec2-config.s3.amazonaws.com/dev-config.json

### 3. EC2 User Data Script
- **Purpose**: Update S3 with new IP on EC2 start
- **Location**: EC2 instance user data
- **Logs**: `/var/log/aipm-ip-update.log`

### 4. Auto-Stop Monitor
- **Purpose**: Stop EC2 after 30 min idle
- **Location**: `/home/ec2-user/auto-stop-monitor.sh`
- **Schedule**: Every 5 minutes (cron)
- **Logs**: `/var/log/aipm-auto-stop.log`

### 5. Backend Activity Tracker
- **Purpose**: Track last API request time
- **Location**: `apps/backend/app.js` (middleware)
- **File**: `/tmp/aipm-last-activity`

### 6. Frontend EC2 Manager
- **Purpose**: Handle EC2 lifecycle from frontend
- **Location**: `apps/frontend/public/ec2-manager.js`
- **Functions**:
  - `EC2Manager.getStatus(env)` - Get EC2 status
  - `EC2Manager.start(env)` - Start EC2
  - `EC2Manager.stop(env)` - Stop EC2
  - `EC2Manager.ensureRunning(env)` - Auto-start if needed
  - `EC2Manager.getConfig(env)` - Get current IP config

## Installation

### Prerequisites
- AWS CLI configured
- SSH access to both EC2 instances
- IAM permissions for Lambda, EC2, S3

### Deploy

```bash
cd /repo/ebaejun/tools/aws/aipm
chmod +x /tmp/deploy-auto-stop.sh
/tmp/deploy-auto-stop.sh
```

This will:
1. ✅ Create Lambda function
2. ✅ Create API Gateway
3. ✅ Create S3 bucket
4. ✅ Install monitoring scripts on both EC2s
5. ✅ Update EC2 user data
6. ✅ Restart both EC2s

## Usage

### Frontend Integration

Add to `apps/frontend/public/index.html`:

```html
<script src="ec2-manager.js"></script>
<script>
// Auto-start EC2 on page load
document.addEventListener('DOMContentLoaded', async () => {
  const env = 'prod'; // or 'dev'
  
  try {
    console.log('Checking EC2 status...');
    const config = await EC2Manager.ensureRunning(env);
    console.log('EC2 ready:', config);
    
    // Update API base URL
    window.CONFIG.API_BASE_URL = config.apiBaseUrl;
    window.CONFIG.SEMANTIC_API_URL = config.semanticApiUrl;
    
    // Initialize app
    initializeApp();
  } catch (error) {
    console.error('Failed to start EC2:', error);
    alert('Failed to start backend. Please try again.');
  }
});
</script>
```

### Manual Control

```javascript
// Check status
const status = await EC2Manager.getStatus('prod');
console.log(status); // {state: 'running', publicIp: '...'}

// Start EC2
await EC2Manager.start('prod');

// Stop EC2
await EC2Manager.stop('prod');

// Get current config
const config = await EC2Manager.getConfig('prod');
console.log(config.apiBaseUrl); // http://3.80.123.45:4000
```

### API Testing

```bash
# Check status
curl 'https://nger6kll11.execute-api.us-east-1.amazonaws.com?action=status&env=prod'

# Start EC2
curl 'https://nger6kll11.execute-api.us-east-1.amazonaws.com?action=start&env=prod'

# Stop EC2
curl 'https://nger6kll11.execute-api.us-east-1.amazonaws.com?action=stop&env=prod'

# Check config
curl 'https://aipm-ec2-config.s3.amazonaws.com/prod-config.json'
```

## Monitoring

### Check Auto-Stop Logs

```bash
# Production
ssh ec2-user@100.53.112.192 "sudo cat /var/log/aipm-auto-stop.log"

# Development
ssh ec2-user@44.221.87.105 "sudo cat /var/log/aipm-auto-stop.log"
```

### Check IP Update Logs

```bash
# Production
ssh ec2-user@100.53.112.192 "sudo cat /var/log/aipm-ip-update.log"

# Development
ssh ec2-user@44.221.87.105 "sudo cat /var/log/aipm-ip-update.log"
```

### Check Activity Tracking

```bash
# Production
ssh ec2-user@100.53.112.192 "cat /tmp/aipm-last-activity"

# Development
ssh ec2-user@44.221.87.105 "cat /tmp/aipm-last-activity"
```

### Check Cron Jobs

```bash
# Production
ssh ec2-user@100.53.112.192 "crontab -l"

# Development
ssh ec2-user@44.221.87.105 "crontab -l"
```

## Cost Savings

### Before (24/7 Running)
- 2 x t3.small instances
- 730 hours/month each
- ~$30/month total

### After (Auto-Stop)
- Average usage: 50 hours/month per instance
- 100 hours/month total
- ~$7/month total
- **Savings: $23/month (77%)**

### Additional Costs
- Lambda: ~$0.20/month (1M requests free tier)
- S3: ~$0.01/month (negligible)
- API Gateway: ~$1/month (1M requests free tier)
- **Total: ~$8/month**
- **Net Savings: $22/month (73%)**

## Troubleshooting

### EC2 Won't Start

```bash
# Check Lambda logs
aws logs tail /aws/lambda/aipm-ec2-controller --follow --region us-east-1

# Check EC2 status
aws ec2 describe-instances --instance-ids i-016241c7a18884e80 --region us-east-1
```

### Config Not Updating

```bash
# Check user data logs
ssh ec2-user@100.53.112.192 "sudo cat /var/log/cloud-init-output.log | grep -A 20 'IP Update'"

# Manually trigger update
ssh ec2-user@100.53.112.192 "sudo bash /var/lib/cloud/instance/user-data.txt"
```

### Auto-Stop Not Working

```bash
# Check cron job
ssh ec2-user@100.53.112.192 "crontab -l"

# Check activity file
ssh ec2-user@100.53.112.192 "cat /tmp/aipm-last-activity"

# Check logs
ssh ec2-user@100.53.112.192 "sudo cat /var/log/aipm-auto-stop.log"

# Manually run monitor
ssh ec2-user@100.53.112.192 "/home/ec2-user/auto-stop-monitor.sh"
```

### Frontend Can't Connect

```javascript
// In browser console
const config = await EC2Manager.getConfig('prod');
console.log(config);

// Test API
fetch(config.apiBaseUrl + '/api/version')
  .then(r => r.json())
  .then(console.log);
```

## Configuration

### Change Idle Timeout

Edit `/home/ec2-user/auto-stop-monitor.sh` on EC2:

```bash
IDLE_THRESHOLD=1800  # 30 minutes (change this)
```

### Change Check Interval

Edit crontab on EC2:

```bash
crontab -e

# Change from every 5 minutes to every 10 minutes
*/10 * * * * /home/ec2-user/auto-stop-monitor.sh
```

### Disable Auto-Stop

```bash
# Remove cron job
ssh ec2-user@100.53.112.192 "crontab -r"
ssh ec2-user@44.221.87.105 "crontab -r"
```

## Files Created

- `/tmp/lambda_function.py` - Lambda function code
- `/tmp/ec2-user-data.sh` - EC2 startup script
- `/tmp/auto-stop-monitor.sh` - Auto-stop monitoring script
- `/tmp/deploy-auto-stop.sh` - Deployment script
- `apps/frontend/public/ec2-manager.js` - Frontend integration
- `apps/backend/app.js` - Activity tracking (modified)

## AWS Resources

- Lambda: `aipm-ec2-controller`
- IAM Role: `aipm-ec2-controller-lambda`
- API Gateway: `aipm-ec2-control`
- S3 Bucket: `aipm-ec2-config`
- API Endpoint: https://nger6kll11.execute-api.us-east-1.amazonaws.com

## Next Steps

1. ✅ Test EC2 start/stop via API
2. ✅ Integrate frontend with EC2Manager
3. ✅ Add status indicator to UI
4. ✅ Test auto-stop after 30 min
5. ✅ Monitor cost savings

## Support

For issues:
1. Check Lambda logs: `aws logs tail /aws/lambda/aipm-ec2-controller --follow`
2. Check EC2 logs: `/var/log/aipm-*.log`
3. Test API manually with curl
4. Verify IAM permissions
