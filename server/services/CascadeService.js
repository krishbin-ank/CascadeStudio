const { Worker } = require('worker_threads');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Service to interface with CascadeStudio's existing worker system
 * This service creates Node.js workers that can execute the same
 * CascadeStudio code that runs in the browser
 */
class CascadeService {
  constructor() {
    this.activeWorkers = new Map();
    this.maxWorkers = 4;
    this.workerTimeout = 30000; // 30 seconds
  }

  /**
   * Create a new worker instance that can run CascadeStudio code
   */
  async createWorker() {
    const workerId = uuidv4();
    
    // Create worker that loads the CascadeStudio environment
    const worker = new Worker(path.join(__dirname, '../workers/CascadeWorker.js'));
    
    const workerInfo = {
      worker: worker,
      id: workerId,
      createdAt: Date.now(),
      busy: false
    };

    this.activeWorkers.set(workerId, workerInfo);

    // Auto-cleanup after timeout
    setTimeout(() => {
      this.terminateWorker(workerId);
    }, this.workerTimeout);

    return workerInfo;
  }

  /**
   * Send a message to a worker and wait for response
   */
  async sendWorkerMessage(workerInfo, message, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Worker operation timed out'));
      }, timeout);

      const messageHandler = (response) => {
        clearTimeout(timeoutId);
        workerInfo.worker.off('message', messageHandler);
        workerInfo.worker.off('error', errorHandler);
        
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      };

      const errorHandler = (error) => {
        clearTimeout(timeoutId);
        workerInfo.worker.off('message', messageHandler);
        workerInfo.worker.off('error', errorHandler);
        reject(error);
      };

      workerInfo.worker.on('message', messageHandler);
      workerInfo.worker.on('error', errorHandler);
      workerInfo.worker.postMessage(message);
    });
  }

  /**
   * Execute CascadeStudio code using the existing worker system
   */
  async executeScript(code, guiState = {}, meshResolution = 0.1) {
    const workerInfo = await this.createWorker();
    
    try {
      workerInfo.busy = true;
      
      const startTime = Date.now();
      
      // Send the same message format that the web worker expects
      const result = await this.sendWorkerMessage(workerInfo, {
        type: 'Evaluate',
        payload: {
          code: code,
          GUIState: guiState
        }
      });

      // Request mesh generation
      const meshResult = await this.sendWorkerMessage(workerInfo, {
        type: 'combineAndRenderShapes',
        payload: {
          maxDeviation: meshResolution
        }
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        meshData: meshResult.meshData,
        logs: result.logs || [],
        executionTime: executionTime,
        shapeCount: meshResult.shapeCount || 0,
        guiState: result.guiState || guiState
      };
    } finally {
      this.terminateWorker(workerInfo.id);
    }
  }

  /**
   * Import a file using the existing file import system
   */
  async importFile(filename, content) {
    const workerInfo = await this.createWorker();
    
    try {
      workerInfo.busy = true;
      
      const result = await this.sendWorkerMessage(workerInfo, {
        type: 'loadFiles',
        payload: [{
          name: filename,
          content: content
        }]
      });

      return {
        success: true,
        shapeId: result.shapeId || filename,
        message: `Successfully imported ${filename}`
      };
    } finally {
      this.terminateWorker(workerInfo.id);
    }
  }

  /**
   * Export current shape as STEP file
   */
  async exportSTEP(code, guiState = {}, meshResolution = 0.1) {
    const workerInfo = await this.createWorker();
    
    try {
      workerInfo.busy = true;
      
      // First execute the script to generate the shape
      await this.sendWorkerMessage(workerInfo, {
        type: 'Evaluate',
        payload: {
          code: code,
          GUIState: guiState
        }
      });

      // Then export as STEP
      const result = await this.sendWorkerMessage(workerInfo, {
        type: 'saveShapeSTEP',
        payload: {}
      });

      return {
        content: result.content || result,
        filename: 'export.step'
      };
    } finally {
      this.terminateWorker(workerInfo.id);
    }
  }

  /**
   * Export as STL by generating mesh and converting
   */
  async exportSTL(code, guiState = {}, meshResolution = 0.1) {
    const workerInfo = await this.createWorker();
    
    try {
      workerInfo.busy = true;
      
      // Execute script and generate mesh
      await this.sendWorkerMessage(workerInfo, {
        type: 'Evaluate',
        payload: {
          code: code,
          GUIState: guiState
        }
      });

      const meshResult = await this.sendWorkerMessage(workerInfo, {
        type: 'combineAndRenderShapes',
        payload: {
          maxDeviation: meshResolution
        }
      });

      // Convert mesh to STL format
      const stlContent = this.meshToSTL(meshResult.meshData);

      return {
        content: stlContent,
        filename: 'export.stl'
      };
    } finally {
      this.terminateWorker(workerInfo.id);
    }
  }

  /**
   * Export as OBJ by generating mesh and converting
   */
  async exportOBJ(code, guiState = {}, meshResolution = 0.1) {
    const workerInfo = await this.createWorker();
    
    try {
      workerInfo.busy = true;
      
      // Execute script and generate mesh
      await this.sendWorkerMessage(workerInfo, {
        type: 'Evaluate',
        payload: {
          code: code,
          GUIState: guiState
        }
      });

      const meshResult = await this.sendWorkerMessage(workerInfo, {
        type: 'combineAndRenderShapes',
        payload: {
          maxDeviation: meshResolution
        }
      });

      // Convert mesh to OBJ format
      const objContent = this.meshToOBJ(meshResult.meshData);

      return {
        content: objContent,
        filename: 'export.obj'
      };
    } finally {
      this.terminateWorker(workerInfo.id);
    }
  }

  /**
   * Validate script syntax
   */
  async validateScript(code) {
    try {
      const errors = [];
      const warnings = [];
      const usedFunctions = [];

      // Basic syntax validation
      try {
        // Check for CascadeStudio function usage
        const functionRegex = /(Box|Sphere|Cylinder|Cone|Union|Difference|Intersection|Translate|Rotate|Scale|Mirror|Extrude|Revolve|FilletEdges|ChamferEdges|Slider|Checkbox|TextInput|Dropdown)\s*\(/g;
        let match;
        while ((match = functionRegex.exec(code)) !== null) {
          if (!usedFunctions.includes(match[1])) {
            usedFunctions.push(match[1]);
          }
        }

        // Basic JavaScript syntax check
        new Function(code);

      } catch (syntaxError) {
        errors.push({
          message: syntaxError.message,
          line: syntaxError.lineNumber || null,
          column: syntaxError.columnNumber || null
        });
      }

      return {
        valid: errors.length === 0,
        errors: errors,
        warnings: warnings,
        usedFunctions: usedFunctions
      };
    } catch (error) {
      throw new Error(`Script validation failed: ${error.message}`);
    }
  }

  /**
   * Convert mesh data to STL format
   */
  meshToSTL(meshData) {
    if (!meshData || !meshData.vertices || !meshData.indices) {
      throw new Error('Invalid mesh data for STL export');
    }

    let stl = 'solid CascadeStudioExport\n';
    
    const vertices = meshData.vertices;
    const indices = meshData.indices;
    const normals = meshData.normals || [];

    for (let i = 0; i < indices.length; i += 3) {
      const i1 = indices[i] * 3;
      const i2 = indices[i + 1] * 3;
      const i3 = indices[i + 2] * 3;

      // Calculate normal if not provided
      let normal = [0, 0, 1];
      if (normals.length > i1) {
        normal = [normals[i1], normals[i1 + 1], normals[i1 + 2]];
      }

      stl += `  facet normal ${normal[0]} ${normal[1]} ${normal[2]}\n`;
      stl += '    outer loop\n';
      stl += `      vertex ${vertices[i1]} ${vertices[i1 + 1]} ${vertices[i1 + 2]}\n`;
      stl += `      vertex ${vertices[i2]} ${vertices[i2 + 1]} ${vertices[i2 + 2]}\n`;
      stl += `      vertex ${vertices[i3]} ${vertices[i3 + 1]} ${vertices[i3 + 2]}\n`;
      stl += '    endloop\n';
      stl += '  endfacet\n';
    }

    stl += 'endsolid CascadeStudioExport\n';
    return stl;
  }

  /**
   * Convert mesh data to OBJ format
   */
  meshToOBJ(meshData) {
    if (!meshData || !meshData.vertices || !meshData.indices) {
      throw new Error('Invalid mesh data for OBJ export');
    }

    let obj = '# CascadeStudio Generated OBJ File\n';
    
    const vertices = meshData.vertices;
    const indices = meshData.indices;
    const normals = meshData.normals || [];

    // Write vertices
    for (let i = 0; i < vertices.length; i += 3) {
      obj += `v ${vertices[i]} ${vertices[i + 1]} ${vertices[i + 2]}\n`;
    }

    // Write normals if available
    if (normals.length > 0) {
      for (let i = 0; i < normals.length; i += 3) {
        obj += `vn ${normals[i]} ${normals[i + 1]} ${normals[i + 2]}\n`;
      }
    }

    // Write faces
    for (let i = 0; i < indices.length; i += 3) {
      const v1 = indices[i] + 1;
      const v2 = indices[i + 1] + 1;
      const v3 = indices[i + 2] + 1;
      
      if (normals.length > 0) {
        obj += `f ${v1}//${v1} ${v2}//${v2} ${v3}//${v3}\n`;
      } else {
        obj += `f ${v1} ${v2} ${v3}\n`;
      }
    }

    return obj;
  }

  /**
   * Terminate a worker
   */
  terminateWorker(workerId) {
    const workerInfo = this.activeWorkers.get(workerId);
    if (workerInfo) {
      try {
        workerInfo.worker.terminate();
      } catch (error) {
        console.error('Error terminating worker:', error);
      }
      this.activeWorkers.delete(workerId);
    }
  }

  /**
   * Clean up all workers
   */
  cleanup() {
    for (const [workerId, workerInfo] of this.activeWorkers) {
      try {
        workerInfo.worker.terminate();
      } catch (error) {
        console.error('Error terminating worker:', error);
      }
    }
    this.activeWorkers.clear();
  }
}

module.exports = CascadeService;