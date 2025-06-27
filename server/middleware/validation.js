const Joi = require('joi');

// Validation schemas
const schemas = {
  script: Joi.object({
    code: Joi.string().required().min(1).max(100000),
    guiState: Joi.object().default({}),
    meshResolution: Joi.number().min(0.01).max(1.0).default(0.1),
    timeout: Joi.number().min(1000).max(60000).default(10000)
  }),

  export: Joi.object({
    script: Joi.string().required().min(1).max(100000),
    guiState: Joi.object().default({}),
    filename: Joi.string().pattern(/^[a-zA-Z0-9_-]+$/).max(100).default('export'),
    meshResolution: Joi.number().min(0.01).max(1.0).default(0.1)
  }),

  project: Joi.object({
    name: Joi.string().required().min(1).max(200),
    description: Joi.string().max(1000).default(''),
    code: Joi.string().required().min(1).max(100000),
    guiState: Joi.object().default({}),
    externalFiles: Joi.object().default({})
  }),

  projectUpdate: Joi.object({
    name: Joi.string().min(1).max(200),
    description: Joi.string().max(1000),
    code: Joi.string().min(1).max(100000),
    guiState: Joi.object(),
    externalFiles: Joi.object()
  }).min(1) // At least one field must be provided
};

// Validation middleware factory
function createValidator(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      return res.status(400).json({
        error: 'Validation failed',
        message: 'Request body contains invalid data',
        details: details
      });
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
}

// Export validation middleware functions
module.exports = {
  validateScript: createValidator(schemas.script),
  validateExport: createValidator(schemas.export),
  validateProject: createValidator(schemas.project),
  validateProjectUpdate: createValidator(schemas.projectUpdate),
  
  // Custom validation functions
  validateFileUpload: (req, res, next) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'No files provided for upload'
      });
    }

    // Validate file types and sizes
    const allowedExtensions = ['.step', '.stp', '.iges', '.igs', '.stl'];
    const maxFileSize = 50 * 1024 * 1024; // 50MB

    for (const file of req.files) {
      const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
      
      if (!allowedExtensions.includes(fileExtension)) {
        return res.status(400).json({
          error: 'Validation failed',
          message: `Unsupported file type: ${fileExtension}. Allowed types: ${allowedExtensions.join(', ')}`
        });
      }

      if (file.size > maxFileSize) {
        return res.status(400).json({
          error: 'Validation failed',
          message: `File ${file.originalname} exceeds maximum size of 50MB`
        });
      }
    }

    next();
  },

  validateProjectId: (req, res, next) => {
    const { id } = req.params;
    
    // Basic UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid project ID format'
      });
    }

    next();
  },

  // Sanitize code input to prevent potential security issues
  sanitizeCode: (req, res, next) => {
    if (req.body.code) {
      // Remove potentially dangerous patterns while preserving CascadeStudio functionality
      let code = req.body.code;
      
      // Remove require/import statements (not needed in CascadeStudio)
      code = code.replace(/require\s*\([^)]*\)/g, '');
      code = code.replace(/import\s+.*?from\s+['"][^'"]*['"]/g, '');
      
      // Remove eval and Function constructor calls
      code = code.replace(/eval\s*\(/g, '// eval(');
      code = code.replace(/new\s+Function\s*\(/g, '// new Function(');
      
      // Remove process and global references
      code = code.replace(/process\./g, '// process.');
      code = code.replace(/global\./g, '// global.');
      
      req.body.code = code;
    }
    
    next();
  }
};

// Error handling for validation
module.exports.handleValidationError = (error, req, res, next) => {
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      message: error.message,
      details: error.details || []
    });
  }
  
  next(error);
};