# AIPM Web Service Deployment

## 🚀 One-Command Deployment

This PR enables complete AWS deployment of the AIPM web service with a single command:

```bash
./deploy.sh
```

## 🌐 Live Service

- **Frontend**: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/
- **Backend**: AWS Lambda + API Gateway (auto-configured)

## 📋 What's Included

### Deployment Infrastructure
- [x] One-command deployment script (`./deploy.sh`)
- [x] Serverless Framework configuration
- [x] AWS Lambda handler with error handling
- [x] GitHub Actions CI/CD workflow
- [x] Comprehensive documentation

### AWS Services
- [x] **S3 Static Website Hosting** - Frontend
- [x] **AWS Lambda** - Backend API
- [x] **API Gateway** - REST endpoints
- [x] **CloudWatch** - Logging and monitoring

### Features
- [x] Auto-scaling backend
- [x] CORS-enabled API
- [x] Health check endpoints
- [x] Production error handling
- [x] Cost-optimized configuration

## 🛠️ Quick Start

1. **Prerequisites**: AWS CLI configured, Node.js 18+
2. **Deploy**: Run `./deploy.sh`
3. **Access**: Visit the live URL above

## 📖 Documentation

- [`DEPLOYMENT.md`](DEPLOYMENT.md) - Complete deployment guide
- [`README.md`](README.md) - Updated with deployment instructions
- [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) - CI/CD pipeline

## 🧪 Testing

The deployment includes:
- Health check endpoints
- CORS validation
- Error handling tests
- Automated deployment verification

## 💰 Cost

AWS Free Tier eligible:
- Lambda: 1M requests/month free
- S3: 5GB storage free
- API Gateway: 1M requests/month free

## 🔧 Available Commands

```bash
npm run deploy          # Full deployment
npm run deploy:backend  # Backend only
npm run deploy:frontend # Frontend only
npm run logs           # View Lambda logs
npm run remove         # Cleanup resources
```

---

**Ready to merge**: This PR provides a complete, production-ready deployment system for the AIPM web service.
