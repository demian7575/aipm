#!/usr/bin/env node

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

async function migrateData(sourceStage, targetStage) {
    console.log(`Migrating data from ${sourceStage} to ${targetStage}...`);
    
    const sourceTables = {
        stories: `aipm-backend-${sourceStage}-stories`,
        tests: `aipm-backend-${sourceStage}-acceptance-tests`
    };
    
    const targetTables = {
        stories: `aipm-backend-${targetStage}-stories`,
        tests: `aipm-backend-${targetStage}-acceptance-tests`
    };
    
    try {
        // Clear target tables first
        console.log('Clearing target tables...');
        await clearTable(targetTables.stories);
        await clearTable(targetTables.tests);
        
        // Copy stories
        console.log('Copying stories...');
        const stories = await scanTable(sourceTables.stories);
        for (const story of stories) {
            await docClient.send(new PutCommand({
                TableName: targetTables.stories,
                Item: story
            }));
        }
        console.log(`Copied ${stories.length} stories`);
        
        // Copy acceptance tests
        console.log('Copying acceptance tests...');
        const tests = await scanTable(sourceTables.tests);
        for (const test of tests) {
            await docClient.send(new PutCommand({
                TableName: targetTables.tests,
                Item: test
            }));
        }
        console.log(`Copied ${tests.length} acceptance tests`);
        
        console.log('Data migration completed successfully!');
        return { storiesCount: stories.length, testsCount: tests.length };
        
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}

async function scanTable(tableName) {
    try {
        const result = await docClient.send(new ScanCommand({
            TableName: tableName
        }));
        return result.Items || [];
    } catch (error) {
        console.warn(`Could not scan table ${tableName}:`, error.message);
        return [];
    }
}

async function clearTable(tableName) {
    try {
        const items = await scanTable(tableName);
        for (const item of items) {
            await docClient.send(new DeleteCommand({
                TableName: tableName,
                Key: { id: item.id }
            }));
        }
        console.log(`Cleared ${items.length} items from ${tableName}`);
    } catch (error) {
        console.warn(`Could not clear table ${tableName}:`, error.message);
    }
}

// CLI usage
if (process.argv.length >= 4) {
    const sourceStage = process.argv[2];
    const targetStage = process.argv[3];
    
    migrateData(sourceStage, targetStage)
        .then(result => {
            console.log('Migration result:', result);
            process.exit(0);
        })
        .catch(error => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
} else {
    console.log('Usage: node migrate-data.js <source-stage> <target-stage>');
    console.log('Example: node migrate-data.js prod dev');
}

export { migrateData };
