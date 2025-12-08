# GitHub Secrets Setup for CI/CD

The CI/CD pipeline now requires AWS credentials to run deployment configuration tests.

## Required Secrets

Add these secrets to your GitHub repository:

1. **AWS_ACCESS_KEY_ID** - Your AWS access key
2. **AWS_SECRET_ACCESS_KEY** - Your AWS secret access key

## Setup Instructions

### 1. Create IAM User for CI/CD

```bash
aws iam create-user --user-name aipm-github-actions
```

### 2. Attach Required Policies

The user needs read access to:
- CloudFormation (describe stacks)
- Lambda (get function configuration)
- SSM Parameter Store (get parameters)
- API Gateway (for health checks via HTTPS)

```bash
aws iam attach-user-policy \
  --user-name aipm-github-actions \
  --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess
```

### 3. Create Access Keys

```bash
aws iam create-access-key --user-name aipm-github-actions
```

Save the output - you'll need the AccessKeyId and SecretAccessKey.

### 4. Add Secrets to GitHub

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add:
   - Name: `AWS_ACCESS_KEY_ID`
   - Value: (paste the AccessKeyId from step 3)
5. Click **Add secret**
6. Repeat for:
   - Name: `AWS_SECRET_ACCESS_KEY`
   - Value: (paste the SecretAccessKey from step 3)

## Verification

After adding the secrets, push a commit to trigger the CI/CD pipeline. The deployment configuration tests should now run successfully instead of being skipped.

## Security Notes

- Use ReadOnlyAccess policy to minimize permissions
- Rotate access keys regularly
- Never commit credentials to the repository
- Monitor CloudTrail for unexpected API calls from this user
