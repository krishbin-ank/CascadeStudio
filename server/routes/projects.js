const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { validateProject, validateProjectUpdate } = require('../middleware/validation');

// In-memory project storage (in production, use a database)
const projects = new Map();

// Create new project
router.post('/', validateProject, async (req, res) => {
  try {
    const { name, description = '', code, guiState = {}, externalFiles = {} } = req.body;

    const project = {
      id: uuidv4(),
      name: name,
      description: description,
      code: code,
      guiState: guiState,
      externalFiles: externalFiles,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    projects.set(project.id, project);

    res.status(201).json({
      success: true,
      project: project
    });
  } catch (error) {
    res.status(400).json({
      error: 'Project creation failed',
      message: error.message
    });
  }
});

// Get all projects (with pagination)
router.get('/', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const allProjects = Array.from(projects.values());
    const totalProjects = allProjects.length;
    const paginatedProjects = allProjects
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(offset, offset + limit);

    res.json({
      success: true,
      projects: paginatedProjects,
      pagination: {
        page: page,
        limit: limit,
        total: totalProjects,
        pages: Math.ceil(totalProjects / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve projects',
      message: error.message
    });
  }
});

// Get project by ID
router.get('/:id', (req, res) => {
  try {
    const project = projects.get(req.params.id);

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        message: `Project with ID ${req.params.id} does not exist`
      });
    }

    res.json({
      success: true,
      project: project
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve project',
      message: error.message
    });
  }
});

// Update project
router.put('/:id', validateProjectUpdate, (req, res) => {
  try {
    const project = projects.get(req.params.id);

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        message: `Project with ID ${req.params.id} does not exist`
      });
    }

    // Update allowed fields
    const allowedUpdates = ['name', 'description', 'code', 'guiState', 'externalFiles'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updatedProject = {
      ...project,
      ...updates,
      updatedAt: new Date().toISOString(),
      version: project.version + 1
    };

    projects.set(req.params.id, updatedProject);

    res.json({
      success: true,
      project: updatedProject
    });
  } catch (error) {
    res.status(400).json({
      error: 'Project update failed',
      message: error.message
    });
  }
});

// Delete project
router.delete('/:id', (req, res) => {
  try {
    const project = projects.get(req.params.id);

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        message: `Project with ID ${req.params.id} does not exist`
      });
    }

    projects.delete(req.params.id);

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Project deletion failed',
      message: error.message
    });
  }
});

// Update project GUI state
router.post('/:id/gui', (req, res) => {
  try {
    const project = projects.get(req.params.id);

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        message: `Project with ID ${req.params.id} does not exist`
      });
    }

    const { guiState } = req.body;

    if (!guiState || typeof guiState !== 'object') {
      return res.status(400).json({
        error: 'Invalid GUI state',
        message: 'GUI state must be a valid object'
      });
    }

    const updatedProject = {
      ...project,
      guiState: { ...project.guiState, ...guiState },
      updatedAt: new Date().toISOString(),
      version: project.version + 1
    };

    projects.set(req.params.id, updatedProject);

    res.json({
      success: true,
      guiState: updatedProject.guiState,
      message: 'GUI state updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      error: 'GUI state update failed',
      message: error.message
    });
  }
});

// Duplicate project
router.post('/:id/duplicate', (req, res) => {
  try {
    const originalProject = projects.get(req.params.id);

    if (!originalProject) {
      return res.status(404).json({
        error: 'Project not found',
        message: `Project with ID ${req.params.id} does not exist`
      });
    }

    const duplicatedProject = {
      ...originalProject,
      id: uuidv4(),
      name: `${originalProject.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    projects.set(duplicatedProject.id, duplicatedProject);

    res.status(201).json({
      success: true,
      project: duplicatedProject
    });
  } catch (error) {
    res.status(400).json({
      error: 'Project duplication failed',
      message: error.message
    });
  }
});

// Export project as JSON
router.get('/:id/export', (req, res) => {
  try {
    const project = projects.get(req.params.id);

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        message: `Project with ID ${req.params.id} does not exist`
      });
    }

    const exportData = {
      ...project,
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0'
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${project.name.replace(/[^a-z0-9]/gi, '_')}_export.json"`);
    res.json(exportData);
  } catch (error) {
    res.status(500).json({
      error: 'Project export failed',
      message: error.message
    });
  }
});

// Import project from JSON
router.post('/import', (req, res) => {
  try {
    const { projectData } = req.body;

    if (!projectData || typeof projectData !== 'object') {
      return res.status(400).json({
        error: 'Invalid project data',
        message: 'Project data must be a valid object'
      });
    }

    // Validate required fields
    const requiredFields = ['name', 'code'];
    for (const field of requiredFields) {
      if (!projectData[field]) {
        return res.status(400).json({
          error: 'Invalid project data',
          message: `Missing required field: ${field}`
        });
      }
    }

    const importedProject = {
      id: uuidv4(),
      name: projectData.name,
      description: projectData.description || '',
      code: projectData.code,
      guiState: projectData.guiState || {},
      externalFiles: projectData.externalFiles || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      importedFrom: projectData.id || null,
      importedAt: new Date().toISOString()
    };

    projects.set(importedProject.id, importedProject);

    res.status(201).json({
      success: true,
      project: importedProject
    });
  } catch (error) {
    res.status(400).json({
      error: 'Project import failed',
      message: error.message
    });
  }
});

// Get project statistics
router.get('/:id/stats', (req, res) => {
  try {
    const project = projects.get(req.params.id);

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        message: `Project with ID ${req.params.id} does not exist`
      });
    }

    const stats = {
      codeLines: project.code.split('\n').length,
      codeCharacters: project.code.length,
      guiControls: Object.keys(project.guiState).length,
      externalFiles: Object.keys(project.externalFiles).length,
      lastModified: project.updatedAt,
      version: project.version,
      age: {
        days: Math.floor((new Date() - new Date(project.createdAt)) / (1000 * 60 * 60 * 24)),
        created: project.createdAt
      }
    };

    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get project statistics',
      message: error.message
    });
  }
});

module.exports = router;