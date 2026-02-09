# Complete Guide: EC2 Auto-Start/Stop with IP Update for AIPM Frontend

## Overview
This guide sets up:
1. EC2 automatically updates its IP to S3 when it starts
2. AIPM frontend reads current IP from S3
3. Frontend can trigger EC2 start via API Gateway
4. EC2 auto-sleeps after 30 minutes of inactivity

## Architecture
```
AIPM Frontend
  ↓
  ├─ Reads IP from S3: https://aipm-config.s3.amazonaws.com/config.json
  ↓
  └─ Calls Semantic API: http://{current-ip}:9000

EC2 Start Event
  ↓
  User Data Script runs
  ↓
  Updates S3 with new public IP
```

---

## Part 1: S3 Config Setup

### Step 1.1: Create S3 Bucket
```bash
aws s3 mb s3://aipm-config --region us-east-1
```

### Step 1.2: Enable Public Read Access
```bash
aws s3api put-bucket-policy --bucket aipm-config --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::aipm-config/config.json"
  }]
}'
```

### Step 1.3: Create Initial Config File
```bash
cat > config.json <<EOF
{
  "semanticApiUrl": "http://44.221.87.105:9000",
  "updatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "instanceId": "i-08c78da25af47b3cb",
  "status": "running"
}
EOF

aws s3 cp config.json s3://aipm-config/config.json \
  --region us-east-1 \
  --content-type application/json \
  --acl public-read
```

### Step 1.4: Verify Config is Accessible
```bash
curl https://aipm-config.s3.amazonaws.com/config.json
```

Expected output:
```json
{
  "semanticApiUrl": "http://44.221.87.105:9000",
  "updatedAt": "2026-02-09T09:48:00Z",
  "instanceId": "i-08c78da25af47b3cb",
  "status": "running"
}
```

---

## Part 2: EC2 IAM Role Setup

### Step 2.1: Create IAM Role for EC2
```bash
aws iam create-role \
  --role-name aipm-ec2-config-updater \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ec2.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }' \
  --region us-east-1
```

### Step 2.2: Attach S3 Write Policy
```bash
aws iam put-role-policy \
  --role-name aipm-ec2-config-updater \
  --policy-name s3-config-write \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::aipm-config/config.json"
    }]
  }'
```

### Step 2.3: Create Instance Profile
```bash
aws iam create-instance-profile \
  --instance-profile-name aipm-ec2-config-updater

aws iam add-role-to-instance-profile \
  --instance-profile-name aipm-ec2-config-updater \
  --role-name aipm-ec2-config-updater
```

### Step 2.4: Attach Instance Profile to EC2
```bash
# First, check if instance already has a profile
aws ec2 describe-instances \
  --instance-ids i-08c78da25af47b3cb \
  --query 'Reservations[0].Instances[0].IamInstanceProfile' \
  --region us-east-1

# If it has one, replace it. If not, associate new one.
aws ec2 associate-iam-instance-profile \
  --instance-id i-08c78da25af47b3cb \
  --iam-instance-profile Name=aipm-ec2-config-updater \
  --region us-east-1
```

---

## Part 3: EC2 User Data Script

### Step 3.1: Create User Data Script
```bash
cat > user-data.sh <<'EOF'
#!/bin/bash
# This script runs every time EC2 starts

# Log file
LOG_FILE=/var/log/ip-update.log
echo "=== IP Update Script Started: $(date) ===" >> $LOG_FILE

# Wait for network to be ready
sleep 10

# Get public IP from metadata service
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)

echo "Public IP: $PUBLIC_IP" >> $LOG_FILE
echo "Instance ID: $INSTANCE_ID" >> $LOG_FILE

# Create config JSON
cat > /tmp/config.json <<CONFIGEOF
{
  "semanticApiUrl": "http://${PUBLIC_IP}:9000",
  "updatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "instanceId": "${INSTANCE_ID}",
  "status": "running"
}
CONFIGEOF

# Upload to S3
aws s3 cp /tmp/config.json s3://aipm-config/config.json \
  --region us-east-1 \
  --content-type application/json \
  --acl public-read

if [ $? -eq 0 ]; then
  echo "Successfully updated S3 config with IP: $PUBLIC_IP" >> $LOG_FILE
else
  echo "Failed to update S3 config" >> $LOG_FILE
fi

echo "=== IP Update Script Completed: $(date) ===" >> $LOG_FILE
EOF
```

### Step 3.2: Stop EC2 Instance
```bash
aws ec2 stop-instances \
  --instance-ids i-08c78da25af47b3cb \
  --region us-east-1

# Wait for instance to stop
aws ec2 wait instance-stopped \
  --instance-ids i-08c78da25af47b3cb \
  --region us-east-1

echo "Instance stopped"
```

### Step 3.3: Add User Data to EC2
```bash
# Encode user data to base64
USER_DATA_BASE64=$(base64 -w 0 user-data.sh)

# Update instance user data
aws ec2 modify-instance-attribute \
  --instance-id i-08c78da25af47b3cb \
  --user-data file://user-data.sh \
  --region us-east-1

echo "User data updated"
```

### Step 3.4: Start EC2 Instance
```bash
aws ec2 start-instances \
  --instance-ids i-08c78da25af47b3cb \
  --region us-east-1

# Wait for instance to start
aws ec2 wait instance-running \
  --instance-ids i-08c78da25af47b3cb \
  --region us-east-1

echo "Instance started"

# Wait 30 seconds for user data script to complete
sleep 30
```

### Step 3.5: Verify Config Was Updated
```bash
curl https://aipm-config.s3.amazonaws.com/config.json

# Should show new IP address
```

### Step 3.6: Check User Data Script Logs (via SSH)
```bash
ssh -i ~/.ssh/semantic-api-key ec2-user@$(curl -s https://aipm-config.s3.amazonaws.com/config.json | jq -r '.semanticApiUrl' | sed 's|http://||' | sed 's|:9000||') \
  "sudo cat /var/log/ip-update.log"
```

---

## Part 4: Frontend Integration

### Step 4.1: Update AIPM Frontend Code

Add this to your frontend JavaScript (e.g., `app.js` or `config.js`):

```javascript
// Configuration
const CONFIG_URL = 'https://aipm-config.s3.amazonaws.com/config.json';
let cachedApiUrl = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute

/**
 * Get current Semantic API URL from S3 config
 * Caches result for 1 minute to avoid excessive S3 requests
 */
async function getSemanticApiUrl() {
  const now = Date.now();
  
  // Return cached URL if still valid
  if (cachedApiUrl && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedApiUrl;
  }
  
  try {
    console.log('Fetching Semantic API config from S3...');
    const response = await fetch(CONFIG_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const config = await response.json();
    cachedApiUrl = config.semanticApiUrl;
    lastFetchTime = now;
    
    console.log('Semantic API URL:', cachedApiUrl);
    console.log('Config updated at:', config.updatedAt);
    
    return cachedApiUrl;
  } catch (error) {
    console.error('Failed to load Semantic API config:', error);
    
    // Fallback to cached URL if available
    if (cachedApiUrl) {
      console.warn('Using cached URL:', cachedApiUrl);
      return cachedApiUrl;
    }
    
    // Last resort: hardcoded fallback
    console.warn('Using fallback URL');
    return 'http://44.221.87.105:9000';
  }
}

/**
 * Call Semantic API endpoint
 * @param {string} endpoint - API endpoint (e.g., '/weather')
 * @param {object} params - Query parameters
 * @returns {Promise<object>} API response
 */
async function callSemanticApi(endpoint, params = {}) {
  const baseUrl = await getSemanticApiUrl();
  const queryString = new URLSearchParams(params).toString();
  const url = `${baseUrl}${endpoint}${queryString ? '?' + queryString : ''}`;
  
  console.log('Calling Semantic API:', url);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Semantic API error:', error);
    throw error;
  }
}

/**
 * Force refresh of API URL (call after EC2 restart)
 */
function refreshSemanticApiUrl() {
  cachedApiUrl = null;
  lastFetchTime = 0;
  return getSemanticApiUrl();
}

// Export functions (if using modules)
// export { getSemanticApiUrl, callSemanticApi, refreshSemanticApiUrl };
```

### Step 4.2: Usage Examples

```javascript
// Example 1: Get weather
async function getWeather(city) {
  try {
    const result = await callSemanticApi('/weather', { city });
    console.log('Weather:', result);
    return result;
  } catch (error) {
    alert('Failed to get weather: ' + error.message);
  }
}

// Example 2: Generate story draft
async function generateStoryDraft(title, description) {
  try {
    const result = await callSemanticApi('/aipm/story-draft', {
      title,
      description
    });
    console.log('Story draft:', result);
    return result;
  } catch (error) {
    alert('Failed to generate story: ' + error.message);
  }
}

// Example 3: Health check
async function checkSemanticApiHealth() {
  try {
    const result = await callSemanticApi('/health');
    console.log('Health:', result);
    return result.status === 'healthy';
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

// Example 4: Refresh URL after EC2 restart
async function handleEc2Restart() {
  console.log('EC2 restarted, refreshing API URL...');
  await refreshSemanticApiUrl();
  const isHealthy = await checkSemanticApiHealth();
  if (isHealthy) {
    console.log('Semantic API is ready!');
  } else {
    console.warn('Semantic API not responding yet, retrying in 10s...');
    setTimeout(handleEc2Restart, 10000);
  }
}
```

### Step 4.3: Add to HTML (if not using modules)

```html
<!-- In your AIPM frontend HTML -->
<script src="semantic-api-client.js"></script>
<script>
  // Test on page load
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('Testing Semantic API connection...');
    const isHealthy = await checkSemanticApiHealth();
    if (isHealthy) {
      console.log('✅ Semantic API is ready');
    } else {
      console.warn('⚠️ Semantic API is not responding');
    }
  });
</script>
```

---

## Part 5: Testing

### Test 5.1: Verify S3 Config
```bash
curl https://aipm-config.s3.amazonaws.com/config.json
```

Expected:
```json
{
  "semanticApiUrl": "http://3.80.123.45:9000",
  "updatedAt": "2026-02-09T09:50:00Z",
  "instanceId": "i-08c78da25af47b3cb",
  "status": "running"
}
```

### Test 5.2: Test Semantic API
```bash
# Get URL from config
API_URL=$(curl -s https://aipm-config.s3.amazonaws.com/config.json | jq -r '.semanticApiUrl')

# Test health
curl "$API_URL/health"

# Test weather
curl "$API_URL/weather?city=Seoul"
```

### Test 5.3: Test Stop/Start Cycle
```bash
# Stop instance
aws ec2 stop-instances --instance-ids i-08c78da25af47b3cb --region us-east-1
aws ec2 wait instance-stopped --instance-ids i-08c78da25af47b3cb --region us-east-1

# Start instance
aws ec2 start-instances --instance-ids i-08c78da25af47b3cb --region us-east-1
aws ec2 wait instance-running --instance-ids i-08c78da25af47b3cb --region us-east-1

# Wait for user data script
sleep 30

# Check if config was updated with new IP
curl https://aipm-config.s3.amazonaws.com/config.json

# Test new IP
NEW_API_URL=$(curl -s https://aipm-config.s3.amazonaws.com/config.json | jq -r '.semanticApiUrl')
curl "$NEW_API_URL/health"
```

### Test 5.4: Test Frontend Integration
```javascript
// In browser console on AIPM frontend
(async () => {
  console.log('Testing Semantic API integration...');
  
  // Get current URL
  const url = await getSemanticApiUrl();
  console.log('API URL:', url);
  
  // Test health
  const health = await callSemanticApi('/health');
  console.log('Health:', health);
  
  // Test weather
  const weather = await callSemanticApi('/weather', { city: 'Seoul' });
  console.log('Weather:', weather);
})();
```

---

## Part 6: Troubleshooting

### Issue 6.1: Config Not Updating
```bash
# Check EC2 IAM role
aws ec2 describe-instances \
  --instance-ids i-08c78da25af47b3cb \
  --query 'Reservations[0].Instances[0].IamInstanceProfile' \
  --region us-east-1

# Check user data script logs
ssh -i ~/.ssh/semantic-api-key ec2-user@<current-ip> \
  "sudo cat /var/log/ip-update.log"

# Check cloud-init logs
ssh -i ~/.ssh/semantic-api-key ec2-user@<current-ip> \
  "sudo cat /var/log/cloud-init-output.log | grep -A 20 'IP Update'"
```

### Issue 6.2: S3 Access Denied
```bash
# Verify bucket policy
aws s3api get-bucket-policy --bucket aipm-config --region us-east-1

# Test public access
curl -I https://aipm-config.s3.amazonaws.com/config.json
# Should return 200 OK
```

### Issue 6.3: Frontend Can't Read Config
```javascript
// In browser console
fetch('https://aipm-config.s3.amazonaws.com/config.json')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// Check CORS if needed
```

### Issue 6.4: User Data Not Running
```bash
# Check if user data is set
aws ec2 describe-instance-attribute \
  --instance-id i-08c78da25af47b3cb \
  --attribute userData \
  --query 'UserData.Value' \
  --output text \
  --region us-east-1 | base64 -d

# Should show your user-data.sh script
```

---

## Part 7: Cost Estimate

| Resource | Cost |
|----------|------|
| S3 bucket | $0.023/GB/month (negligible for 1 file) |
| S3 requests | $0.0004/1000 GET requests |
| EC2 running (50h/week) | ~$7/month |
| EC2 stopped | $0 |
| **Total** | **~$7/month** |

**Savings vs 24/7:** $30 - $7 = **$23/month (77% savings)**

---

## Part 8: Next Steps (Optional)

### Option A: Add Auto-Sleep (30 min idle)
See: `on-demand-ec2-setup.md`

### Option B: Add Elastic IP (permanent IP)
```bash
# Allocate Elastic IP
aws ec2 allocate-address --domain vpc --region us-east-1

# Associate with instance
aws ec2 associate-address \
  --instance-id i-08c78da25af47b3cb \
  --allocation-id <eipalloc-xxx> \
  --region us-east-1

# Cost: $1.80/month when stopped
```

### Option C: Add API Gateway (no IP changes)
See: `setup-api-gateway.md`

---

## Summary

✅ **What you have now:**
- EC2 automatically updates S3 config with new IP on start
- AIPM frontend reads current IP from S3
- Works with manual stop/start
- 77% cost savings with manual management

✅ **What you can add:**
- Auto-sleep after 30 min idle (see other guide)
- Elastic IP for permanent address
- API Gateway for frontend-triggered start

---

## Quick Reference Commands

```bash
# Get current Semantic API URL
curl -s https://aipm-config.s3.amazonaws.com/config.json | jq -r '.semanticApiUrl'

# Stop EC2
aws ec2 stop-instances --instance-ids i-08c78da25af47b3cb --region us-east-1

# Start EC2
aws ec2 start-instances --instance-ids i-08c78da25af47b3cb --region us-east-1

# Check EC2 status
aws ec2 describe-instances --instance-ids i-08c78da25af47b3cb \
  --query 'Reservations[0].Instances[0].State.Name' --output text --region us-east-1

# Test Semantic API
curl "$(curl -s https://aipm-config.s3.amazonaws.com/config.json | jq -r '.semanticApiUrl')/health"
```

---

## Files Created

- `user-data.sh` - EC2 startup script
- `config.json` - Initial S3 config
- `semantic-api-client.js` - Frontend integration code (add to your AIPM frontend)

---

## Support

If you encounter issues:
1. Check logs: `/var/log/ip-update.log` on EC2
2. Verify IAM role is attached to EC2
3. Verify S3 bucket policy allows public read
4. Test S3 config URL in browser: https://aipm-config.s3.amazonaws.com/config.json
