# EC2 Auto-Stop Configuration

## Auto-Stop After 30 Minutes Idle

The EC2 instance automatically stops after 30 minutes of inactivity to save costs.

### How It Works

- Cron job runs every minute: `/home/ec2-user/ec2-idle-monitor.sh`
- Checks if Kiro session pool is busy or has queued requests
- If idle for 30 consecutive minutes, runs `shutdown -h now`
- Idle counter resets whenever there's activity

### Monitor Idle Status

```bash
# Check current idle time
ssh ec2-user@100.48.102.121 "cat /tmp/ec2-idle-state"

# View monitor logs
ssh ec2-user@100.48.102.121 "tail -f /tmp/ec2-idle-monitor.log"
```

## Manual Start/Stop

### Start Instance

```bash
# From local machine
aws ec2 start-instances --instance-ids i-016241c7a18884e80 --region us-east-1

# Wait for it to start
aws ec2 wait instance-running --instance-ids i-016241c7a18884e80 --region us-east-1

# Get new IP
aws ec2 describe-instances --instance-ids i-016241c7a18884e80 --region us-east-1 \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
```

### Stop Instance

```bash
aws ec2 stop-instances --instance-ids i-016241c7a18884e80 --region us-east-1
```

## Disable Auto-Stop

```bash
# Remove cron job
ssh ec2-user@100.48.102.121 "crontab -r"
```

## Future: Auto-Start on Request

To implement auto-start when requests arrive, you need:

1. **API Gateway** in front of your services
2. **Lambda function** that:
   - Checks if EC2 is running
   - Starts it if stopped
   - Waits for services to be ready
   - Proxies the request
3. **Update frontend** to use API Gateway URL instead of direct EC2 IP

This requires additional AWS infrastructure and is not currently implemented.
