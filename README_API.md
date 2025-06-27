# CascadeStudio with Integrated API

CascadeStudio now includes a built-in REST API that provides programmatic access to all CAD operations while serving the original web application. This unified approach allows you to use both the interactive web interface and API endpoints from the same server.

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Start the server (serves both web app and API)
npm start

# For development with auto-reload
npm run dev
```

The server will start on port 12000 and provide:
- **Web App**: http://localhost:12000
- **API**: http://localhost:12000/api
- **Health Check**: http://localhost:12000/health

## 🏗️ Architecture

### Unified Server
- Single Express.js server serves both web application and API
- Shared worker system for consistent CAD operations
- Same OpenCascade.js engine powers both interfaces
- Real-time synchronization between web UI and API

### File Structure
```
CascadeStudio/
├── server.js                 # Main unified server
├── server/                   # API implementation
│   ├── routes/              # API endpoints
│   │   ├── api.js          # Main API router
│   │   ├── files.js        # File operations
│   │   ├── scripts.js      # Script compilation
│   │   └── projects.js     # Project management
│   ├── services/           # Business logic
│   │   └── CascadeService.js
│   ├── workers/            # Node.js workers
│   │   └── CascadeWorker.js
│   └── middleware/         # Validation & security
│       └── validation.js
├── js/                     # Original web app
├── css/                    # Stylesheets
├── index.html             # Web application
└── package.json           # Dependencies & scripts
```

## 🔌 API Features

### File Operations
- **Import**: STEP, IGES, STL files
- **Export**: STEP, STL, OBJ formats
- **Format Info**: Supported file specifications

### Script Operations
- **Compile**: Execute CascadeStudio scripts with GUI state
- **Validate**: Syntax checking and function analysis
- **Library**: Complete function documentation
- **Examples**: Sample scripts for learning

### Project Management
- **CRUD**: Create, read, update, delete projects
- **GUI State**: Manipulate script parameters (sliders, checkboxes, etc.)
- **Versioning**: Track project changes
- **Import/Export**: JSON project files

## 📋 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api` | API documentation |
| `GET` | `/api/health` | API health check |
| `POST` | `/api/files/import` | Import CAD files |
| `POST` | `/api/files/export/step` | Export as STEP |
| `POST` | `/api/files/export/stl` | Export as STL |
| `POST` | `/api/files/export/obj` | Export as OBJ |
| `GET` | `/api/files/formats` | Supported formats |
| `POST` | `/api/scripts/compile` | Compile script |
| `POST` | `/api/scripts/validate` | Validate syntax |
| `GET` | `/api/scripts/library` | Function docs |
| `GET` | `/api/scripts/examples` | Example scripts |
| `POST` | `/api/projects` | Create project |
| `GET` | `/api/projects` | List projects |
| `GET` | `/api/projects/:id` | Get project |
| `PUT` | `/api/projects/:id` | Update project |
| `DELETE` | `/api/projects/:id` | Delete project |
| `POST` | `/api/projects/:id/gui` | Update GUI state |

## 💡 Usage Examples

### Web Application
Access the familiar CascadeStudio interface at http://localhost:12000

### API Usage

#### Compile a Script
```bash
curl -X POST http://localhost:12000/api/scripts/compile \
  -H "Content-Type: application/json" \
  -d '{
    "code": "let size = Slider(\"Size\", 10, 5, 20); Box(size, size, size);",
    "guiState": {"Size": 15},
    "meshResolution": 0.1
  }'
```

#### Export STEP File
```bash
curl -X POST http://localhost:12000/api/files/export/step \
  -H "Content-Type: application/json" \
  -d '{
    "script": "Box(20, 20, 20)",
    "filename": "my-box"
  }' \
  --output my-box.step
```

#### Import CAD File
```bash
curl -X POST http://localhost:12000/api/files/import \
  -F "files=@model.step"
```

#### Create Project
```bash
curl -X POST http://localhost:12000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Test Project",
    "description": "Created via API",
    "code": "Box(10, 10, 10);"
  }'
```

#### Manipulate GUI State
```bash
curl -X POST http://localhost:12000/api/projects/{id}/gui \
  -H "Content-Type: application/json" \
  -d '{
    "guiState": {
      "radius": 25,
      "height": 50,
      "enabled": true
    }
  }'
```

## 🔧 Configuration

### Environment Variables
```bash
PORT=12000                    # Server port
NODE_ENV=development          # Environment
ALLOWED_ORIGINS=*             # CORS origins
```

### Security Features
- Rate limiting (100 requests per 15 minutes)
- CORS protection
- Request validation
- File size limits (50MB)
- Helmet security headers
- Input sanitization

## 🧪 Testing

```bash
# Run tests
npm test

# Test API endpoints
curl http://localhost:12000/api/health
curl http://localhost:12000/api/scripts/library
```

## 🔄 Integration Benefits

### Shared Resources
- Same OpenCascade.js engine
- Unified worker system
- Consistent function library
- Shared project storage

### Real-time Sync
- Changes via API reflect in web UI
- Web UI changes accessible via API
- Consistent state management
- Live collaboration potential

### Development Workflow
- Use web UI for interactive design
- Use API for automation and batch processing
- Export/import projects between interfaces
- Programmatic access to all features

## 🛠️ CascadeStudio Functions

All standard CascadeStudio functions are available via API:

### Primitives
```javascript
Box(width, height, depth)
Sphere(radius)
Cylinder(radius, height)
Cone(radius1, radius2, height)
```

### Transformations
```javascript
Translate([x, y, z], shapes)
Rotate([x, y, z], angle, shapes)
Scale(factor, shapes)
Mirror([x, y, z], shapes)
```

### Boolean Operations
```javascript
Union([shapes])
Difference(base, tools)
Intersection([shapes])
```

### GUI Controls
```javascript
Slider("name", default, min, max)
Checkbox("name", default)
TextInput("name", default)
Dropdown("name", options, defaultIndex)
```

## 📦 Deployment

### Local Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Docker (Optional)
```bash
# Build image
docker build -t cascadestudio .

# Run container
docker run -p 12000:12000 cascadestudio
```

## 🔍 Monitoring

### Health Checks
- `/health` - Overall system health
- `/api/health` - API-specific health

### Logging
- Request logging with Morgan
- Error tracking
- Performance monitoring

## 🚀 Advanced Usage

### Batch Processing
```javascript
// Process multiple designs
const designs = [
  { code: "Box(10, 10, 10)", name: "box1" },
  { code: "Sphere(5)", name: "sphere1" },
  { code: "Cylinder(3, 15)", name: "cylinder1" }
];

for (const design of designs) {
  await fetch('/api/files/export/step', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      script: design.code,
      filename: design.name
    })
  });
}
```

### Parametric Automation
```javascript
// Generate variations
const sizes = [10, 15, 20, 25];
for (const size of sizes) {
  await fetch('/api/scripts/compile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'let s = Slider("Size", 10, 5, 30); Box(s, s, s);',
      guiState: { Size: size }
    })
  });
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues**: GitHub Issues
- **Documentation**: This README and `/api` endpoint
- **Examples**: Built-in examples at `/api/scripts/examples`

---

This integrated approach provides the best of both worlds: the interactive CascadeStudio web interface for design and exploration, plus a powerful API for automation, integration, and programmatic access to all CAD operations.