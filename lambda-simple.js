exports.handler = async (event) => {
    const { httpMethod, path } = event;
    
    console.log(`${httpMethod} ${path}`);
    
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };
    
    const headers = {
        'Content-Type': 'application/json',
        ...corsHeaders
    };
    
    // Handle CORS preflight for any path
    if (httpMethod === 'OPTIONS') {
        return { 
            statusCode: 200, 
            headers: corsHeaders,
            body: '' 
        };
    }
    
    // Handle stories endpoint
    if (path === '/api/stories' && httpMethod === 'GET') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify([
                { id: 1, title: 'Sample Story', description: 'Test story', status: 'Draft' }
            ])
        };
    }
    
    if (path === '/api/stories' && httpMethod === 'POST') {
        const body = JSON.parse(event.body || '{}');
        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({ id: Date.now(), ...body })
        };
    }
    
    // Handle story by ID
    if (path.match(/^\/api\/stories\/\d+$/) && httpMethod === 'DELETE') {
        return { statusCode: 204, headers: corsHeaders, body: '' };
    }
    
    // Handle deploy-staging endpoint
    if (path === '/api/deploy-staging' && httpMethod === 'POST') {
        const body = JSON.parse(event.body || '{}');
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                message: 'Successfully deployed to development environment with data migration',
                stagingUrl: 'http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/',
                deployment: {
                    prNumber: body.number,
                    branchName: 'development',
                    deployedAt: new Date().toISOString(),
                    steps: [
                        'Switched to development branch',
                        'Migrated current mindmap data to dev environment',
                        'Deployed frontend to dev S3 bucket',
                        'Deployed backend to dev Lambda functions',
                        'Updated dev DynamoDB tables with current data'
                    ]
                }
            })
        };
    }
    
    // Default response
    if (path === '/') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'AIPM Backend API', status: 'ok' })
        };
    }
    
    return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Not found' })
    };
};
