# Kiro API Functional Requirements

## FR-1: Execute Endpoint

### FR-1.1: Accept Valid Request
**Given:** Kiro API server is running  
**When:** POST /execute with valid JSON `{"prompt": "test"}`  
**Then:** Returns 200 with `{"success": true, "output": "..."}`

### FR-1.2: Reject Missing Prompt
**Given:** Kiro API server is running  
**When:** POST /execute with `{"context": "test"}` (no prompt)  
**Then:** Returns 400 with `{"error": "prompt required"}`

### FR-1.3: Handle Timeout
**Given:** Kiro API server is running  
**When:** POST /execute with `{"prompt": "sleep 100", "timeoutMs": 5000}`  
**Then:** Returns 200 with `{"success": false, "error": "Timeout"}`

### FR-1.4: Auto-Approve Permissions
**Given:** Kiro CLI prompts for permission `[y/n/t]`  
**When:** Prompt is detected in output  
**Then:** Automatically sends 't' to approve

### FR-1.5: Track Git Commit
**Given:** Kiro CLI outputs "git commit" or "committed"  
**When:** Output is processed  
**Then:** Sets `hasGitCommit = true` in response

### FR-1.6: Track Git Push
**Given:** Kiro CLI outputs "git push" or "pushed"  
**When:** Output is processed  
**Then:** Sets `hasGitPush = true` in response

### FR-1.7: Complete After Git Operations
**Given:** Both git commit and push detected  
**When:** 10 seconds of idle time passes  
**Then:** Completes and returns response

### FR-1.8: Complete After Time Marker
**Given:** Output contains "▸ Time: XXXms"  
**When:** 20 seconds of idle time passes  
**Then:** Completes and returns response

### FR-1.9: Complete On Explicit Marker
**Given:** Output contains "[KIRO_COMPLETE]"  
**When:** Marker is detected  
**Then:** Completes immediately

## FR-2: Health Endpoint

### FR-2.1: Return Health Status
**Given:** Kiro API server is running  
**When:** GET /health  
**Then:** Returns 200 with `{"status": "running", "activeRequests": N, "queuedRequests": M, "maxConcurrent": 2, "uptime": X}`

### FR-2.2: Show Active Requests
**Given:** 1 request is executing  
**When:** GET /health  
**Then:** Returns `"activeRequests": 1`

### FR-2.3: Show Queued Requests
**Given:** 3 requests are queued  
**When:** GET /health  
**Then:** Returns `"queuedRequests": 3`

## FR-3: Request Queue

### FR-3.1: Execute Immediately When Available
**Given:** 0 active requests (< MAX_CONCURRENT)  
**When:** POST /execute received  
**Then:** Executes immediately without queuing

### FR-3.2: Queue When At Capacity
**Given:** 2 active requests (= MAX_CONCURRENT)  
**When:** POST /execute received  
**Then:** Adds to queue and waits

### FR-3.3: Process Queue On Completion
**Given:** 2 active requests and 1 queued  
**When:** 1 active request completes  
**Then:** Queued request starts executing

### FR-3.4: Maintain Queue Order
**Given:** Requests A, B, C queued in order  
**When:** Capacity becomes available  
**Then:** Processes in order: A, then B, then C

## FR-4: CORS Support

### FR-4.1: Handle OPTIONS Request
**Given:** Kiro API server is running  
**When:** OPTIONS request to any endpoint  
**Then:** Returns 204 with CORS headers

### FR-4.2: Allow All Origins
**Given:** Request from any origin  
**When:** Request is processed  
**Then:** Returns `Access-Control-Allow-Origin: *`

## FR-5: Error Handling

### FR-5.1: Handle Invalid JSON
**Given:** Kiro API server is running  
**When:** POST /execute with invalid JSON body  
**Then:** Returns 500 with error message

### FR-5.2: Handle Kiro CLI Not Found
**Given:** Kiro CLI not in PATH  
**When:** POST /execute  
**Then:** Returns 500 with error about kiro-cli

### FR-5.3: Handle Repository Not Found
**Given:** REPO_PATH doesn't exist  
**When:** POST /execute  
**Then:** Returns 500 with error about repository

## FR-6: Concurrency Control

### FR-6.1: Limit Concurrent Sessions
**Given:** MAX_CONCURRENT = 2  
**When:** 3 requests arrive simultaneously  
**Then:** Only 2 execute, 1 queues

### FR-6.2: Track Active Count
**Given:** Requests starting and completing  
**When:** activeCount is checked  
**Then:** Accurately reflects current executing requests

### FR-6.3: Decrement On Completion
**Given:** Request completes (success or failure)  
**When:** Exit handler runs  
**Then:** Decrements activeCount and processes queue

## FR-7: Output Capture

### FR-7.1: Capture stdout
**Given:** Kiro CLI writes to stdout  
**When:** Output is produced  
**Then:** Appends to output string in response

### FR-7.2: Capture stderr
**Given:** Kiro CLI writes to stderr  
**When:** Output is produced  
**Then:** Appends to output string in response

### FR-7.3: Update Last Output Time
**Given:** Any output received  
**When:** stdout or stderr data arrives  
**Then:** Updates lastOutputTime to current time

## FR-8: Context Handling

### FR-8.1: Include Context In Prompt
**Given:** Request with `{"prompt": "test", "context": "working on X"}`  
**When:** Prompt is sent to Kiro  
**Then:** Sends "working on X\n\ntest\n\nWhen completely done, output: [KIRO_COMPLETE]"

### FR-8.2: Handle Missing Context
**Given:** Request with `{"prompt": "test"}` (no context)  
**When:** Prompt is sent to Kiro  
**Then:** Sends "test\n\nWhen completely done, output: [KIRO_COMPLETE]"

## FR-9: Completion Instruction

### FR-9.1: Add Completion Instruction
**Given:** Any request  
**When:** Prompt is constructed  
**Then:** Appends "\n\nWhen completely done, output: [KIRO_COMPLETE]"

## FR-10: Process Management

### FR-10.1: Spawn Kiro CLI
**Given:** Request to execute  
**When:** executeKiro is called  
**Then:** Spawns `bash -lc 'kiro-cli chat'` in REPO_PATH

### FR-10.2: Set Working Directory
**Given:** REPO_PATH = /home/ec2-user/aipm  
**When:** Kiro CLI is spawned  
**Then:** Sets cwd to /home/ec2-user/aipm

### FR-10.3: Set PATH Environment
**Given:** Kiro CLI in ~/.local/bin  
**When:** Process is spawned  
**Then:** Includes ~/.local/bin in PATH

### FR-10.4: Kill On Timeout
**Given:** Request with timeoutMs = 5000  
**When:** 5 seconds pass  
**Then:** Kills Kiro process with SIGKILL

### FR-10.5: Kill On Completion
**Given:** Completion detected  
**When:** checkCompletion returns true  
**Then:** Kills Kiro process with SIGKILL
