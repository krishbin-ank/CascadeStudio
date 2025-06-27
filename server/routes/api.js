const express = require('express');
const router = express.Router();

// Import route modules
const filesRouter = require('./files');
const scriptsRouter = require('./scripts');
const projectsRouter = require('./projects');

// Mount route modules
router.use('/files', filesRouter);
router.use('/scripts', scriptsRouter);
router.use('/projects', projectsRouter);

// API root endpoint - documentation
router.get('/', (req, res) => {
  res.json({
    name: 'CascadeStudio API',
    version: '1.0.0',
    description: 'Integrated API for CascadeStudio CAD operations',
    endpoints: {
      files: {
        'POST /api/files/import': 'Import STEP/IGES/STL files',
        'POST /api/files/export/step': 'Export current model as STEP file',
        'POST /api/files/export/stl': 'Export current model as STL file',
        'POST /api/files/export/obj': 'Export current model as OBJ file',
        'GET /api/files/formats': 'Get supported file formats'
      },
      scripts: {
        'POST /api/scripts/compile': 'Compile and execute CascadeStudio script',
        'POST /api/scripts/validate': 'Validate CascadeStudio script syntax',
        'GET /api/scripts/library': 'Get available functions and documentation',
        'GET /api/scripts/examples': 'Get example scripts'
      },
      projects: {
        'POST /api/projects': 'Create new project',
        'GET /api/projects': 'List all projects',
        'GET /api/projects/:id': 'Get project by ID',
        'PUT /api/projects/:id': 'Update project',
        'DELETE /api/projects/:id': 'Delete project',
        'POST /api/projects/:id/gui': 'Update project GUI state',
        'POST /api/projects/:id/duplicate': 'Duplicate project',
        'GET /api/projects/:id/export': 'Export project as JSON'
      }
    },
    integration: {
      webApp: 'Shares the same worker system as the web interface',
      realtime: 'Changes made via API are reflected in the web interface',
      compatibility: 'Fully compatible with existing CascadeStudio functionality'
    }
  });
});

// API documentation endpoint
router.get('/docs', (req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'CascadeStudio API',
      version: '1.0.0',
      description: 'Integrated API for CascadeStudio CAD operations'
    },
    servers: [
      {
        url: `${req.protocol}://${req.get('host')}/api`,
        description: 'Current server'
      }
    ],
    paths: {
      '/files/import': {
        post: {
          summary: 'Import CAD files',
          description: 'Import STEP, IGES, or STL files into the current session',
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    files: {
                      type: 'array',
                      items: {
                        type: 'string',
                        format: 'binary'
                      }
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Files imported successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      results: { type: 'array' },
                      importedShapes: { type: 'array' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/scripts/compile': {
        post: {
          summary: 'Compile CascadeStudio script',
          description: 'Execute a CascadeStudio script and return mesh data',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'string' },
                    guiState: { type: 'object' },
                    meshResolution: { type: 'number', minimum: 0.01, maximum: 1.0 }
                  },
                  required: ['code']
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Script compiled successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      result: {
                        type: 'object',
                        properties: {
                          meshData: { type: 'object' },
                          logs: { type: 'array' },
                          executionTime: { type: 'number' },
                          shapeCount: { type: 'number' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });
});

// Health check for API
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    api: 'running',
    worker: 'available'
  });
});

module.exports = router;