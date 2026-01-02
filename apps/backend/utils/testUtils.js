// AIPM Backend Test Utilities
// Provides test utilities for backend API testing

export class APITestClient {
  constructor(baseUrl = 'http://localhost:8081') {
    this.baseUrl = baseUrl;
  }

  async makeRequest(method, path, data = null) {
    const url = `${this.baseUrl}${path}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    return {
      status: response.status,
      data: await response.json().catch(() => ({}))
    };
  }

  async testHealthCheck() {
    return await this.makeRequest('GET', '/health');
  }

  async testStoryCreation(storyData) {
    return await this.makeRequest('POST', '/api/draft-response', storyData);
  }

  async testStoryRetrieval() {
    return await this.makeRequest('GET', '/api/stories');
  }
}

export class TestValidator {
  static validateStoryStructure(story) {
    const required = ['title', 'description', 'asA', 'iWant', 'soThat'];
    for (const field of required) {
      if (!story[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    return true;
  }

  static validateTestReport(report) {
    if (!report.timestamp || !report.total || report.passed === undefined) {
      throw new Error('Invalid test report structure');
    }
    return true;
  }
}
