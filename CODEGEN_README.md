# AIPM Test Code Generation

## Overview
Enhanced test code generation system integrated with AIPM's architecture and testing framework.

## Features
- **AIPM Integration**: Generates tests compatible with AIPM's test framework
- **Story Testing**: Automated test generation for user stories
- **API Testing**: Endpoint validation test generation
- **Test Suites**: Comprehensive test suite generation

## Components

### 1. AIPMCodeGenerator (`test-code-gen.js`)
- **Test Templates**: Unit tests, story tests, API tests
- **AIPM Integration**: Compatible with existing test framework
- **Flexible Options**: Customizable test generation

### 2. Enhanced CLI (`generate-cli.js`)
- **Multiple Types**: test, story-test, api-test
- **Easy Usage**: Simple command-line interface
- **File Generation**: Automatic test file creation

### 3. AIPM Test Generator (`aipm-test-generator.js`)
- **Story Integration**: Generates tests for user stories
- **API Coverage**: Tests for all AIPM endpoints
- **Suite Generation**: Complete test suite creation

## Usage

### Generate Individual Tests
```bash
# Generate unit test
node generate-cli.js test UserValidation

# Generate story test
node generate-cli.js story-test 123

# Generate API test
node generate-cli.js api-test /api/stories GET
```

### Generate AIPM Test Suite
```bash
node aipm-test-generator.js
```

## Generated Test Types

### Unit Tests
- Basic functionality validation
- Error handling tests
- Integration with AIPM test framework

### Story Tests
- User story validation
- Acceptance criteria testing
- Status verification

### API Tests
- Endpoint availability
- Response validation
- Error handling

## Integration with AIPM
- Uses existing `AIPMTestFramework`
- Compatible with DynamoDB testing
- Supports AIPM's ES module architecture
- Integrates with existing test infrastructure
