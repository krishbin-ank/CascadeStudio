const express = require('express');
const router = express.Router();
const CascadeService = require('../services/CascadeService');
const { validateScript } = require('../middleware/validation');

const cascadeService = new CascadeService();

// Compile and execute CascadeStudio script
router.post('/compile', validateScript, async (req, res) => {
  try {
    const { code, guiState = {}, meshResolution = 0.1, timeout = 10000 } = req.body;

    const result = await cascadeService.executeScript(code, guiState, meshResolution);

    res.json({
      success: true,
      result: result
    });
  } catch (error) {
    res.status(400).json({
      error: 'Compilation failed',
      message: error.message
    });
  }
});

// Validate script syntax
router.post('/validate', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Code is required'
      });
    }

    const result = await cascadeService.validateScript(code);

    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: 'Validation failed',
      message: error.message
    });
  }
});

// Get function library documentation
router.get('/library', (req, res) => {
  const library = {
    primitives: {
      Box: {
        description: 'Create a rectangular box',
        parameters: [
          { name: 'width', type: 'number', description: 'Width of the box' },
          { name: 'height', type: 'number', description: 'Height of the box' },
          { name: 'depth', type: 'number', description: 'Depth of the box' }
        ],
        example: 'Box(10, 20, 30)',
        returns: 'Shape object'
      },
      Sphere: {
        description: 'Create a sphere',
        parameters: [
          { name: 'radius', type: 'number', description: 'Radius of the sphere' }
        ],
        example: 'Sphere(15)',
        returns: 'Shape object'
      },
      Cylinder: {
        description: 'Create a cylinder',
        parameters: [
          { name: 'radius', type: 'number', description: 'Radius of the cylinder' },
          { name: 'height', type: 'number', description: 'Height of the cylinder' },
          { name: 'centered', type: 'boolean', description: 'Whether to center the cylinder', optional: true }
        ],
        example: 'Cylinder(5, 20)',
        returns: 'Shape object'
      },
      Cone: {
        description: 'Create a cone',
        parameters: [
          { name: 'radius1', type: 'number', description: 'Bottom radius' },
          { name: 'radius2', type: 'number', description: 'Top radius' },
          { name: 'height', type: 'number', description: 'Height of the cone' }
        ],
        example: 'Cone(10, 5, 15)',
        returns: 'Shape object'
      }
    },
    transformations: {
      Translate: {
        description: 'Move shapes by a vector',
        parameters: [
          { name: 'vector', type: 'array', description: 'Translation vector [x, y, z]' },
          { name: 'shapes', type: 'shape|array', description: 'Shape(s) to translate' }
        ],
        example: 'Translate([10, 0, 5], box)',
        returns: 'Transformed shape(s)'
      },
      Rotate: {
        description: 'Rotate shapes around an axis',
        parameters: [
          { name: 'axis', type: 'array', description: 'Rotation axis [x, y, z]' },
          { name: 'angle', type: 'number', description: 'Rotation angle in degrees' },
          { name: 'shapes', type: 'shape|array', description: 'Shape(s) to rotate' }
        ],
        example: 'Rotate([0, 0, 1], 45, box)',
        returns: 'Transformed shape(s)'
      },
      Scale: {
        description: 'Scale shapes by a factor',
        parameters: [
          { name: 'factor', type: 'number|array', description: 'Scale factor or [x, y, z] factors' },
          { name: 'shapes', type: 'shape|array', description: 'Shape(s) to scale' }
        ],
        example: 'Scale(2, box)',
        returns: 'Transformed shape(s)'
      },
      Mirror: {
        description: 'Mirror shapes across a plane',
        parameters: [
          { name: 'normal', type: 'array', description: 'Plane normal vector [x, y, z]' },
          { name: 'shapes', type: 'shape|array', description: 'Shape(s) to mirror' }
        ],
        example: 'Mirror([1, 0, 0], box)',
        returns: 'Transformed shape(s)'
      }
    },
    booleanOperations: {
      Union: {
        description: 'Combine multiple shapes into one',
        parameters: [
          { name: 'shapes', type: 'array', description: 'Array of shapes to combine' }
        ],
        example: 'Union([box1, box2, sphere])',
        returns: 'Combined shape'
      },
      Difference: {
        description: 'Subtract shapes from a base shape',
        parameters: [
          { name: 'base', type: 'shape', description: 'Base shape to subtract from' },
          { name: 'tools', type: 'shape|array', description: 'Shape(s) to subtract' }
        ],
        example: 'Difference(box, sphere)',
        returns: 'Resulting shape'
      },
      Intersection: {
        description: 'Find the intersection of multiple shapes',
        parameters: [
          { name: 'shapes', type: 'array', description: 'Array of shapes to intersect' }
        ],
        example: 'Intersection([box, sphere])',
        returns: 'Intersected shape'
      }
    },
    advancedOperations: {
      Extrude: {
        description: 'Extrude a 2D profile into 3D',
        parameters: [
          { name: 'profile', type: 'shape', description: '2D profile to extrude' },
          { name: 'height', type: 'number', description: 'Extrusion height' }
        ],
        example: 'Extrude(circle, 10)',
        returns: 'Extruded shape'
      },
      Revolve: {
        description: 'Revolve a profile around an axis',
        parameters: [
          { name: 'profile', type: 'shape', description: 'Profile to revolve' },
          { name: 'axis', type: 'array', description: 'Axis of revolution [x, y, z]' },
          { name: 'angle', type: 'number', description: 'Revolution angle in degrees' }
        ],
        example: 'Revolve(profile, [0, 0, 1], 360)',
        returns: 'Revolved shape'
      },
      FilletEdges: {
        description: 'Add rounded fillets to edges',
        parameters: [
          { name: 'shape', type: 'shape', description: 'Shape to fillet' },
          { name: 'radius', type: 'number', description: 'Fillet radius' }
        ],
        example: 'FilletEdges(box, 2)',
        returns: 'Filleted shape'
      },
      ChamferEdges: {
        description: 'Add chamfers to edges',
        parameters: [
          { name: 'shape', type: 'shape', description: 'Shape to chamfer' },
          { name: 'distance', type: 'number', description: 'Chamfer distance' }
        ],
        example: 'ChamferEdges(box, 1)',
        returns: 'Chamfered shape'
      }
    },
    guiControls: {
      Slider: {
        description: 'Create a slider control for interactive parameters',
        parameters: [
          { name: 'name', type: 'string', description: 'Name of the slider' },
          { name: 'defaultValue', type: 'number', description: 'Default value' },
          { name: 'min', type: 'number', description: 'Minimum value' },
          { name: 'max', type: 'number', description: 'Maximum value' }
        ],
        example: 'let size = Slider("Size", 10, 5, 20);',
        returns: 'Current slider value'
      },
      Checkbox: {
        description: 'Create a checkbox control',
        parameters: [
          { name: 'name', type: 'string', description: 'Name of the checkbox' },
          { name: 'defaultValue', type: 'boolean', description: 'Default checked state' }
        ],
        example: 'let enabled = Checkbox("Enabled", true);',
        returns: 'Current checkbox state'
      },
      TextInput: {
        description: 'Create a text input control',
        parameters: [
          { name: 'name', type: 'string', description: 'Name of the text input' },
          { name: 'defaultValue', type: 'string', description: 'Default text value' }
        ],
        example: 'let label = TextInput("Label", "Default");',
        returns: 'Current text value'
      },
      Dropdown: {
        description: 'Create a dropdown selection control',
        parameters: [
          { name: 'name', type: 'string', description: 'Name of the dropdown' },
          { name: 'options', type: 'array', description: 'Array of option strings' },
          { name: 'defaultIndex', type: 'number', description: 'Default selected index', optional: true }
        ],
        example: 'let material = Dropdown("Material", ["Steel", "Aluminum", "Plastic"], 0);',
        returns: 'Currently selected option'
      }
    }
  };

  const categories = Object.keys(library);
  const totalFunctions = categories.reduce((total, category) => {
    return total + Object.keys(library[category]).length;
  }, 0);

  res.json({
    library: library,
    categories: categories,
    totalFunctions: totalFunctions
  });
});

// Get example scripts
router.get('/examples', (req, res) => {
  const examples = {
    basic: {
      name: 'Basic Shapes',
      description: 'Simple primitive shapes',
      code: `// Basic shapes example
let size = Slider("Size", 10, 5, 20);
let box = Box(size, size, size);
Translate([0, 0, size/2], box);`
    },
    parametric: {
      name: 'Parametric Design',
      description: 'Using GUI controls for parametric modeling',
      code: `// Parametric box with controls
let width = Slider("Width", 20, 10, 30);
let height = Slider("Height", 15, 10, 25);
let depth = Slider("Depth", 10, 5, 20);
let filletRadius = Slider("Fillet", 2, 0, 5);
let addHole = Checkbox("Add Hole", false);

let box = Box(width, height, depth);
let filletedBox = FilletEdges(box, filletRadius);

if (addHole) {
  let hole = Cylinder(3, depth + 1);
  filletedBox = Difference(filletedBox, hole);
}

Translate([0, 0, depth/2], filletedBox);`
    },
    boolean: {
      name: 'Boolean Operations',
      description: 'Combining shapes with boolean operations',
      code: `// Boolean operations example
let box = Box(20, 20, 20);
let sphere = Sphere(15);
let cylinder = Cylinder(5, 30);

// Create a complex shape
let base = Union([box, Translate([0, 0, 20], sphere)]);
let result = Difference(base, cylinder);

Translate([0, 0, 10], result);`
    },
    advanced: {
      name: 'Advanced Modeling',
      description: 'Complex shapes with transformations',
      code: `// Advanced modeling example
let segments = Slider("Segments", 8, 6, 12);
let radius = Slider("Radius", 15, 10, 25);
let height = Slider("Height", 30, 20, 40);

let shapes = [];
for (let i = 0; i < segments; i++) {
  let angle = (i / segments) * 360;
  let x = radius * Math.cos(angle * Math.PI / 180);
  let y = radius * Math.sin(angle * Math.PI / 180);
  
  let pillar = Cylinder(2, height);
  shapes.push(Translate([x, y, 0], pillar));
}

let center = Cylinder(5, height);
shapes.push(center);

let structure = Union(shapes);
Translate([0, 0, height/2], structure);`
    }
  };

  res.json({
    examples: examples,
    count: Object.keys(examples).length
  });
});

module.exports = router;