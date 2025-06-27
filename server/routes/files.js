const express = require('express');
const multer = require('multer');
const router = express.Router();
const CascadeService = require('../services/CascadeService');
const { validateExport } = require('../middleware/validation');

const cascadeService = new CascadeService();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    // Check file extensions
    const allowedExtensions = ['.step', '.stp', '.iges', '.igs', '.stl'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${fileExtension}. Allowed types: ${allowedExtensions.join(', ')}`));
    }
  }
});

// Import CAD files
router.post('/import', upload.array('files'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files provided',
        message: 'Please upload at least one file'
      });
    }

    const results = [];
    const importedShapes = [];

    for (const file of req.files) {
      try {
        const result = await cascadeService.importFile(file.originalname, file.buffer);
        results.push({
          filename: file.originalname,
          success: true,
          shapeId: result.shapeId,
          message: result.message
        });
        importedShapes.push(result.shapeId);
      } catch (error) {
        results.push({
          filename: file.originalname,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Processed ${req.files.length} file(s)`,
      results: results,
      importedShapes: importedShapes
    });
  } catch (error) {
    res.status(400).json({
      error: 'Import failed',
      message: error.message
    });
  }
});

// Export as STEP file
router.post('/export/step', validateExport, async (req, res) => {
  try {
    const { script, guiState = {}, filename = 'export', meshResolution = 0.1 } = req.body;

    const result = await cascadeService.exportSTEP(script, guiState, meshResolution);

    res.setHeader('Content-Type', 'application/step');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.step"`);
    res.send(result.content);
  } catch (error) {
    res.status(400).json({
      error: 'STEP export failed',
      message: error.message
    });
  }
});

// Export as STL file
router.post('/export/stl', validateExport, async (req, res) => {
  try {
    const { script, guiState = {}, filename = 'export', meshResolution = 0.1 } = req.body;

    const result = await cascadeService.exportSTL(script, guiState, meshResolution);

    res.setHeader('Content-Type', 'application/sla');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.stl"`);
    res.send(result.content);
  } catch (error) {
    res.status(400).json({
      error: 'STL export failed',
      message: error.message
    });
  }
});

// Export as OBJ file
router.post('/export/obj', validateExport, async (req, res) => {
  try {
    const { script, guiState = {}, filename = 'export', meshResolution = 0.1 } = req.body;

    const result = await cascadeService.exportOBJ(script, guiState, meshResolution);

    res.setHeader('Content-Type', 'application/obj');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.obj"`);
    res.send(result.content);
  } catch (error) {
    res.status(400).json({
      error: 'OBJ export failed',
      message: error.message
    });
  }
});

// Get supported file formats
router.get('/formats', (req, res) => {
  const formats = {
    import: {
      step: {
        extensions: ['.step', '.stp'],
        description: 'Standard for the Exchange of Product Data',
        mimeType: 'application/step',
        features: ['3D geometry', 'Assembly data', 'Material properties']
      },
      iges: {
        extensions: ['.iges', '.igs'],
        description: 'Initial Graphics Exchange Specification',
        mimeType: 'application/iges',
        features: ['3D geometry', 'Curves and surfaces', 'Legacy CAD support']
      },
      stl: {
        extensions: ['.stl'],
        description: 'STereoLithography format (ASCII only)',
        mimeType: 'application/sla',
        features: ['Mesh data', '3D printing', 'Triangulated surfaces']
      }
    },
    export: {
      step: {
        extensions: ['.step'],
        description: 'Standard for the Exchange of Product Data',
        mimeType: 'application/step',
        features: ['Precise geometry', 'CAD compatibility', 'Industry standard']
      },
      stl: {
        extensions: ['.stl'],
        description: 'STereoLithography format',
        mimeType: 'application/sla',
        features: ['3D printing', 'Mesh export', 'Wide compatibility']
      },
      obj: {
        extensions: ['.obj'],
        description: 'Wavefront OBJ format',
        mimeType: 'application/obj',
        features: ['3D graphics', 'Mesh data', 'Texture support']
      }
    }
  };

  res.json(formats);
});

// Handle multer errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'File size exceeds 50MB limit'
      });
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        message: 'Maximum 10 files allowed per request'
      });
    }
  }
  
  res.status(400).json({
    error: 'File upload error',
    message: error.message
  });
});

module.exports = router;