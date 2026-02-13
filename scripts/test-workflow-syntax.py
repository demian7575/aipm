#!/usr/bin/env python3
"""
Test GitHub Actions workflow files for bash syntax errors
Usage: python3 scripts/test-workflow-syntax.py
"""

import yaml
import subprocess
import sys
import tempfile
import os

def test_workflow_syntax(workflow_file):
    """Test all bash scripts in a workflow file for syntax errors"""
    
    with open(workflow_file) as f:
        workflow = yaml.safe_load(f)
    
    errors = []
    
    for job_name, job in workflow.get('jobs', {}).items():
        for step in job.get('steps', []):
            if 'run' not in step:
                continue
            
            step_name = step.get('name', 'unnamed')
            script = step['run']
            
            # Replace GitHub Actions variables with dummy values for syntax check
            script = script.replace('${{ env.', '${')
            script = script.replace(' }}', '}')
            script = script.replace('${{ secrets.', '${')
            script = script.replace('${{ inputs.', '${')
            
            # Write to temp file and check syntax
            with tempfile.NamedTemporaryFile(mode='w', suffix='.sh', delete=False) as tf:
                tf.write(script)
                temp_file = tf.name
            
            try:
                result = subprocess.run(
                    ['bash', '-n', temp_file],
                    capture_output=True,
                    text=True
                )
                
                if result.returncode != 0:
                    errors.append({
                        'job': job_name,
                        'step': step_name,
                        'error': result.stderr
                    })
            finally:
                os.unlink(temp_file)
    
    return errors

if __name__ == '__main__':
    workflow_files = [
        '.github/workflows/deploy-to-prod.yml'
    ]
    
    all_errors = []
    
    for wf in workflow_files:
        if not os.path.exists(wf):
            print(f'⚠️  Workflow file not found: {wf}')
            continue
        
        print(f'🔍 Testing {wf}...')
        errors = test_workflow_syntax(wf)
        
        if errors:
            all_errors.extend(errors)
            for err in errors:
                print(f'❌ Syntax error in {err["job"]} -> {err["step"]}')
                print(f'   {err["error"]}')
        else:
            print(f'✅ {wf} - all bash scripts valid')
    
    if all_errors:
        print(f'\n❌ Found {len(all_errors)} syntax error(s)')
        sys.exit(1)
    else:
        print('\n✅ All workflow bash scripts have valid syntax')
        sys.exit(0)
