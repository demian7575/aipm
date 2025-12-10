const AWS = require('aws-sdk');

const ecs = new AWS.ECS({ region: process.env.AWS_REGION || 'us-east-1' });

const ECS_CONFIG = {
  cluster: 'aipm-cluster',
  taskDefinition: 'aipm-amazon-q-worker',
  subnets: process.env.ECS_SUBNETS ? process.env.ECS_SUBNETS.split(',') : [],
  securityGroup: process.env.ECS_SECURITY_GROUP || ''
};

async function triggerECSWorker(task) {
  const params = {
    cluster: ECS_CONFIG.cluster,
    taskDefinition: ECS_CONFIG.taskDefinition,
    launchType: 'FARGATE',
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets: ECS_CONFIG.subnets,
        securityGroups: [ECS_CONFIG.securityGroup],
        assignPublicIp: 'ENABLED'
      }
    },
    overrides: {
      containerOverrides: [{
        name: 'amazon-q-worker',
        environment: [
          { name: 'TASK_ID', value: task.id },
          { name: 'TASK_TITLE', value: task.title },
          { name: 'TASK_DETAILS', value: task.details },
          { name: 'BRANCH_NAME', value: `feature/task-${task.id}` }
        ]
      }]
    }
  };

  try {
    const result = await ecs.runTask(params).promise();
    console.log('ECS task started:', result.tasks[0].taskArn);
    return result.tasks[0].taskArn;
  } catch (error) {
    console.error('Failed to start ECS task:', error);
    throw error;
  }
}

module.exports = { triggerECSWorker };
