#!/usr/bin/env node

/**
 * CascadeStudio Integrated API Client Example
 * 
 * This example demonstrates how to use the integrated CascadeStudio API
 * that runs alongside the web application.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// API Configuration - same server as web app
const API_BASE_URL = 'http://localhost:12000/api';

class CascadeStudioClient {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Check if both web app and API are running
   */
  async checkHealth() {
    try {
      // Check overall server health
      const serverHealth = await axios.get('http://localhost:12000/health');
      console.log('🌐 Server Health:', serverHealth.data);
      
      // Check API-specific health
      const apiHealth = await this.client.get('/health');
      console.log('🔌 API Health:', apiHealth.data);
      
      return true;
    } catch (error) {
      console.error('❌ Health Check Failed:', error.message);
      throw error;
    }
  }

  /**
   * Create a new project
   */
  async createProject(projectData) {
    try {
      const response = await this.client.post('/projects', projectData);
      console.log('✅ Project Created:', response.data.project.id);
      console.log(`   Name: ${response.data.project.name}`);
      return response.data.project;
    } catch (error) {
      console.error('❌ Project Creation Failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Compile a CascadeStudio script
   */
  async compileScript(code, guiState = {}, meshResolution = 0.1) {
    try {
      const response = await this.client.post('/scripts/compile', {
        code,
        guiState,
        meshResolution
      });
      console.log('✅ Script Compiled Successfully');
      console.log(`   Execution Time: ${response.data.result.executionTime}ms`);
      console.log(`   Shape Count: ${response.data.result.shapeCount}`);
      return response.data.result;
    } catch (error) {
      console.error('❌ Script Compilation Failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Validate script syntax
   */
  async validateScript(code) {
    try {
      const response = await this.client.post('/scripts/validate', { code });
      console.log('✅ Script Validation:', response.data.valid ? 'VALID' : 'INVALID');
      if (response.data.errors.length > 0) {
        console.log('   Errors:', response.data.errors);
      }
      console.log('   Used Functions:', response.data.usedFunctions);
      return response.data;
    } catch (error) {
      console.error('❌ Script Validation Failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get function library documentation
   */
  async getFunctionLibrary() {
    try {
      const response = await this.client.get('/scripts/library');
      console.log('✅ Function Library Retrieved');
      console.log(`   Total Functions: ${response.data.totalFunctions}`);
      console.log(`   Categories: ${response.data.categories.join(', ')}`);
      return response.data.library;
    } catch (error) {
      console.error('❌ Failed to get function library:', error.response?.data || error.message);
      throw error;
    }
  }
}

// Example usage demonstrating integration features
async function runIntegrationExamples() {
  console.log('🚀 CascadeStudio Integrated API Example\n');

  const client = new CascadeStudioClient();

  try {
    // 1. Check that both web app and API are running
    await client.checkHealth();
    console.log();

    // 2. Get function library (shared with web app)
    await client.getFunctionLibrary();
    console.log();

    // 3. Create a simple project
    const simpleScript = `
      let size = 10;
      let box = Box(size, size, size);
      Translate([0, 0, size/2], box);
    `;

    const project = await client.createProject({
      name: 'Simple Box Example',
      description: 'Basic API integration example',
      code: simpleScript,
      guiState: {}
    });
    console.log();

    // 4. Validate and compile the script
    await client.validateScript(simpleScript);
    console.log();

    await client.compileScript(simpleScript);
    console.log();

    console.log('✅ Integration example completed successfully!');
    console.log('\n🌐 You can now:');
    console.log('   - Open http://localhost:12000 to see the web interface');
    console.log('   - Use the API programmatically as demonstrated');

  } catch (error) {
    console.error('❌ Integration example failed:', error.message);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runIntegrationExamples().catch(console.error);
}

module.exports = CascadeStudioClient;