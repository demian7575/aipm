# Amazon Q: Generate Code and Push to PR

## Simple 2-Command Process

### 1. Generate Code with Amazon Q
```bash
cd /repo/ebaejun/tools/aws/aipm

# Start Amazon Q
kiro-cli chat

# In Q chat, say:
/dev Create a hello.txt file with "Hello World"

# Q will generate the file
# Exit Q when done
```

### 2. Push to PR
```bash
./q-generate-and-pr.sh "Add hello.txt file"
```

That's it! PR created automatically.

---

## Full Example

```bash
# Step 1: Use Q to generate code
kiro-cli chat
> /dev Add a function to export stories as JSON in export.js
> [Q generates the code]
> exit

# Step 2: Create PR
./q-generate-and-pr.sh "Add JSON export function"
```

**Result:** PR created at https://github.com/demian7575/aipm/pulls

---

## Alternative: One-Line Command

```bash
# Generate and PR in one go
./q-generate-and-pr.sh "Your task" && echo "Done! Check PRs"
```

When prompted, use Amazon Q to generate the code, then press Enter.

---

## What Gets Automated

✅ Branch creation
✅ Git commit  
✅ Git push
✅ PR creation
✅ PR description

❌ Code generation (you use Q manually)

---

## Why This Works Best

1. **No Bedrock approval needed**
2. **You control code quality**
3. **Works immediately**
4. **Free (no API costs)**
5. **Better code (human oversight)**

---

## When Bedrock Gets Approved

The endpoint will work automatically:
```bash
curl -X POST https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod/api/generate-code \
  -H "Content-Type: application/json" \
  -d '{"taskDescription":"Your task"}'
```

But until then, use the manual approach above.
