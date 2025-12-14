export const handler = async (event) => {
  try {
    const { taskTitle, objective, constraints, acceptanceCriteria } = JSON.parse(event.body);
    
    // Generate basic code template (fallback implementation)
    const functionName = taskTitle.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const fileName = taskTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    const code = `// ${taskTitle}
// ${objective}

/**
 * ${taskTitle}
 * ${objective}
 * 
 * Constraints: ${constraints}
 * Acceptance Criteria:
${acceptanceCriteria?.map(c => ` * - ${c}`).join('\n') || ' * - None specified'}
 */
function ${functionName}() {
  // TODO: Implement ${objective}
  console.log('${taskTitle} - ${objective}');
  
  // Basic implementation structure
  try {
    // Implementation goes here
    return {
      success: true,
      message: '${taskTitle} completed successfully'
    };
  } catch (error) {
    console.error('Error in ${functionName}:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default ${functionName};`;

    const result = {
      files: [{
        path: `${fileName}.js`,
        content: code
      }],
      summary: `Generated implementation template for: ${taskTitle}`,
      source: 'aws-lambda-template'
    };
    
    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Kiro Lambda error:', error);
    
    return {
      statusCode: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: error.message,
        files: [{
          path: 'fallback.js',
          content: '// Fallback implementation\nfunction fallback() {\n  return "Not implemented";\n}\n\nexport default fallback;'
        }],
        summary: 'Fallback implementation due to error'
      })
    };
  }
};
