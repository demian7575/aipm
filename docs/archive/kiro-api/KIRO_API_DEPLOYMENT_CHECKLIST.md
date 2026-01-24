# Kiro API Deployment Checklist

## ✅ Completed

- [x] Updated backend to call Kiro API instead of EC2 terminal server
- [x] Created deployment scripts
- [x] Created migration documentation
- [x] Committed and pushed changes to develop branch

## 🔄 Next Steps

### 1. Deploy Kiro API Server to EC2

```bash
# Option A: Automated deployment (recommended)
./scripts/deployment/deploy-kiro-api.sh

# Option B: Manual deployment
ssh ec2-user@3.92.96.67
cd ~/aipm
git pull origin develop
bash scripts/deployment/setup-kiro-api-service.sh
```

### 2. Verify Kiro API is Running

```bash
# Check health endpoint
curl http://3.92.96.67:8081/health

# Expected response:
# {"status":"running","activeRequests":0,"uptime":123.45}
```

### 3. Test the Full Flow

1. Start local backend: `npm run dev`
2. Open AIPM UI: http://localhost:4000
3. Select a story with acceptance tests
4. Click "Generate Code & PR"
5. Fill in form and submit
6. Verify:
   - PR is created on GitHub
   - Kiro API logs show activity: `ssh ec2-user@3.92.96.67 "tail -f /tmp/kiro-api-server.log"`
   - Code is generated and pushed to PR branch

### 4. Monitor and Debug

```bash
# Check service status
ssh ec2-user@3.92.96.67 "sudo systemctl status kiro-api-server"

# View logs
ssh ec2-user@3.92.96.67 "tail -f /tmp/kiro-api-server.log"

# Restart if needed
ssh ec2-user@3.92.96.67 "sudo systemctl restart kiro-api-server"
```

### 5. Deploy Backend to Development

Once verified locally:

```bash
# Deploy to development environment
./bin/deploy-dev

# Or manually update Lambda
cd apps/backend
zip -r function.zip .
aws lambda update-function-code \
  --function-name aipm-backend-dev \
  --zip-file fileb://function.zip \
  --region us-east-1
```

## 🔍 Verification Checklist

- [ ] Kiro API health check returns 200
- [ ] "Generate Code & PR" creates PR successfully
- [ ] Kiro API receives the request (check logs)
- [ ] Code is generated and pushed to PR branch
- [ ] No errors in backend logs
- [ ] No errors in Kiro API logs

## 🚨 Troubleshooting

### Kiro API not responding

```bash
# Check if service is running
ssh ec2-user@3.92.96.67 "sudo systemctl status kiro-api-server"

# Check logs for errors
ssh ec2-user@3.92.96.67 "tail -100 /tmp/kiro-api-server.log"

# Restart service
ssh ec2-user@3.92.96.67 "sudo systemctl restart kiro-api-server"
```

### Kiro CLI not found

```bash
# Verify PATH in service file
ssh ec2-user@3.92.96.67 "cat /etc/systemd/system/kiro-api-server.service | grep PATH"

# Should include: /home/ec2-user/.local/bin
```

### Code generation hangs

- Check Kiro API logs for timeout messages
- Verify prompt is clear and actionable
- Check if Kiro CLI is waiting for user input (should auto-approve)

## 📊 Success Metrics

- PR creation time: < 5 seconds
- Code generation time: 2-10 minutes (depending on complexity)
- Success rate: > 90%
- No manual intervention required

## 🔄 Rollback Plan

If issues occur:

1. Revert backend changes:
   ```bash
   git revert HEAD
   git push origin develop
   ```

2. Or manually change in `apps/backend/app.js`:
   ```javascript
   // Change from:
   const kiroApiUrl = process.env.KIRO_API_URL || 'http://3.92.96.67:8081';
   fetch(`${kiroApiUrl}/execute`, ...)
   
   // Back to:
   const ec2Url = process.env.EC2_TERMINAL_URL || 'http://3.92.96.67:8080';
   fetch(`${ec2Url}/generate-code`, ...)
   ```

3. Redeploy backend

## 📝 Notes

- Kiro API runs on port 8081 (EC2 terminal server was on 8080)
- Both can run simultaneously during migration
- Kiro API uses systemd for auto-restart on failure
- Logs are in `/tmp/kiro-api-server.log`
