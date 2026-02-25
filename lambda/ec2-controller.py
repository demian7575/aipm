import json
import boto3
import os

ec2 = boto3.client('ec2', region_name='us-east-1')

# EC2 Instance IDs
INSTANCES = {
    'prod': 'i-09971cca92b9bf3a9',
    'dev': 'i-08c78da25af47b3cb',
    'semantic-api': 'i-08c78da25af47b3cb'  # Same instance as dev
}

def lambda_handler(event, context):
    """
    Handle EC2 start/stop/status requests
    
    Query params:
    - action: start|stop|status
    - env: prod|dev
    """
    
    # Parse request
    params = event.get('queryStringParameters', {}) or {}
    action = params.get('action', 'status')
    env = params.get('env', 'prod')
    
    # Validate
    if env not in INSTANCES:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Invalid env: {env}. Must be prod or dev'})
        }
    
    instance_id = INSTANCES[env]
    
    try:
        if action == 'start':
            return start_instance(instance_id, env)
        elif action == 'stop':
            return stop_instance(instance_id, env)
        elif action == 'status':
            return get_status(instance_id, env)
        else:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': f'Invalid action: {action}'})
            }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }

def start_instance(instance_id, env):
    """Start EC2 instance"""
    response = ec2.start_instances(InstanceIds=[instance_id])
    
    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'message': 'Instance starting',
            'instanceId': instance_id,
            'env': env,
            'state': 'starting'
        })
    }

def stop_instance(instance_id, env):
    """Stop EC2 instance"""
    response = ec2.stop_instances(InstanceIds=[instance_id])
    
    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'message': 'Instance stopping',
            'instanceId': instance_id,
            'env': env,
            'state': 'stopping'
        })
    }

def get_status(instance_id, env):
    """Get EC2 instance status"""
    response = ec2.describe_instances(InstanceIds=[instance_id])
    instance = response['Reservations'][0]['Instances'][0]
    
    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'instanceId': instance_id,
            'env': env,
            'state': instance['State']['Name'],
            'publicIp': instance.get('PublicIpAddress'),
            'privateIp': instance.get('PrivateIpAddress')
        })
    }
