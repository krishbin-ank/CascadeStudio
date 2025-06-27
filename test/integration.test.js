const request = require('supertest');
const app = require('../server');

describe('CascadeStudio Integrated API', () => {
  
  describe('Server Health', () => {
    test('GET /health should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.status).toBe('healthy');
      expect(response.body.services.webApp).toBe('running');
      expect(response.body.services.api).toBe('running');
    });

    test('GET /api/health should return API health', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.body.status).toBe('healthy');
      expect(response.body.api).toBe('running');
    });
  });

  describe('Web App Integration', () => {
    test('GET / should serve the main web application', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      expect(response.text).toContain('CascadeStudio');
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    test('Static files should be served correctly', async () => {
      const response = await request(app)
        .get('/js/CascadeStudioStandardLibrary.js')
        .expect(200);
      
      expect(response.headers['content-type']).toMatch(/application\/javascript/);
    });
  });

  describe('API Documentation', () => {
    test('GET /api should return API documentation', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);
      
      expect(response.body.name).toBe('CascadeStudio API');
      expect(response.body.integration).toBeDefined();
      expect(response.body.endpoints).toBeDefined();
    });

    test('GET /api/docs should return OpenAPI documentation', async () => {
      const response = await request(app)
        .get('/api/docs')
        .expect(200);
      
      expect(response.body.openapi).toBe('3.0.0');
      expect(response.body.info.title).toBe('CascadeStudio API');
    });
  });

  describe('Script Operations', () => {
    test('POST /api/scripts/validate should validate CascadeStudio syntax', async () => {
      const response = await request(app)
        .post('/api/scripts/validate')
        .send({
          code: 'Box(10, 10, 10);'
        })
        .expect(200);
      
      expect(response.body.valid).toBe(true);
      expect(response.body.usedFunctions).toContain('Box');
    });

    test('POST /api/scripts/compile should execute CascadeStudio code', async () => {
      const response = await request(app)
        .post('/api/scripts/compile')
        .send({
          code: 'Box(10, 10, 10);',
          guiState: {},
          meshResolution: 0.1
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.executionTime).toBeGreaterThan(0);
    });

    test('GET /api/scripts/library should return function library', async () => {
      const response = await request(app)
        .get('/api/scripts/library')
        .expect(200);
      
      expect(response.body.library).toBeDefined();
      expect(response.body.library.primitives.Box).toBeDefined();
      expect(response.body.totalFunctions).toBeGreaterThan(0);
    });

    test('GET /api/scripts/examples should return example scripts', async () => {
      const response = await request(app)
        .get('/api/scripts/examples')
        .expect(200);
      
      expect(response.body.examples).toBeDefined();
      expect(response.body.count).toBeGreaterThan(0);
    });
  });

  describe('File Operations', () => {
    test('GET /api/files/formats should return supported formats', async () => {
      const response = await request(app)
        .get('/api/files/formats')
        .expect(200);
      
      expect(response.body.import).toBeDefined();
      expect(response.body.export).toBeDefined();
      expect(response.body.import.step).toBeDefined();
      expect(response.body.export.stl).toBeDefined();
    });

    test('POST /api/files/export/step should export STEP file', async () => {
      const response = await request(app)
        .post('/api/files/export/step')
        .send({
          script: 'Box(10, 10, 10);',
          filename: 'test-box'
        })
        .expect(200);
      
      expect(response.headers['content-type']).toBe('application/step');
      expect(response.headers['content-disposition']).toContain('test-box.step');
    });

    test('POST /api/files/export/stl should export STL file', async () => {
      const response = await request(app)
        .post('/api/files/export/stl')
        .send({
          script: 'Sphere(5);',
          filename: 'test-sphere'
        })
        .expect(200);
      
      expect(response.headers['content-type']).toBe('application/sla');
      expect(response.headers['content-disposition']).toContain('test-sphere.stl');
    });
  });

  describe('Project Management', () => {
    let projectId;

    test('POST /api/projects should create new project', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({
          name: 'Integration Test Project',
          description: 'Created during integration testing',
          code: 'Box(10, 10, 10);',
          guiState: {}
        })
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.project.name).toBe('Integration Test Project');
      expect(response.body.project.id).toBeDefined();
      
      projectId = response.body.project.id;
    });

    test('GET /api/projects/:id should retrieve project', async () => {
      const response = await request(app)
        .get(`/api/projects/${projectId}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.project.name).toBe('Integration Test Project');
    });

    test('POST /api/projects/:id/gui should update GUI state', async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/gui`)
        .send({
          guiState: { size: 20, enabled: true }
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.guiState.size).toBe(20);
      expect(response.body.guiState.enabled).toBe(true);
    });

    test('GET /api/projects should list projects', async () => {
      const response = await request(app)
        .get('/api/projects')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.projects).toBeDefined();
      expect(response.body.pagination).toBeDefined();
      expect(response.body.projects.length).toBeGreaterThan(0);
    });

    test('DELETE /api/projects/:id should delete project', async () => {
      const response = await request(app)
        .delete(`/api/projects/${projectId}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('Should return 404 for non-existent API endpoints', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);
      
      expect(response.body.error).toBe('Not Found');
    });

    test('Should validate request bodies', async () => {
      const response = await request(app)
        .post('/api/scripts/compile')
        .send({
          // Missing required 'code' field
          guiState: {}
        })
        .expect(400);
      
      expect(response.body.error).toBe('Validation failed');
    });

    test('Should handle invalid project IDs', async () => {
      const response = await request(app)
        .get('/api/projects/invalid-id')
        .expect(400);
      
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('Integration Features', () => {
    test('API and web app should share the same worker system', async () => {
      // This test verifies that the API uses the same underlying system
      const apiResponse = await request(app)
        .post('/api/scripts/compile')
        .send({
          code: 'let result = Box(5, 5, 5); result;',
          guiState: {}
        })
        .expect(200);
      
      expect(apiResponse.body.success).toBe(true);
      expect(apiResponse.body.result.shapeCount).toBeGreaterThan(0);
    });

    test('GUI state manipulation should work correctly', async () => {
      const compileResponse = await request(app)
        .post('/api/scripts/compile')
        .send({
          code: 'let size = Slider("Size", 10, 5, 20); Box(size, size, size);',
          guiState: { Size: 15 }
        })
        .expect(200);
      
      expect(compileResponse.body.success).toBe(true);
      expect(compileResponse.body.result.guiState.Size).toBe(15);
    });
  });
});

// Clean up after tests
afterAll(async () => {
  // Close any open connections, workers, etc.
  if (app && app.close) {
    await app.close();
  }
});