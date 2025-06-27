const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import API routes
const apiRoutes = require('./server/routes/api');

const app = express();
const PORT = process.env.PORT || 12000;

// Security middleware with relaxed CSP for CascadeStudio
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "https://work-1-frbrgvugdqhxyair.prod-runtime.all-hands.dev", "https://work-2-frbrgvugdqhxyair.prod-runtime.all-hands.dev"],
      scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'", "blob:", "https://work-1-frbrgvugdqhxyair.prod-runtime.all-hands.dev", "https://work-2-frbrgvugdqhxyair.prod-runtime.all-hands.dev"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://work-1-frbrgvugdqhxyair.prod-runtime.all-hands.dev", "https://work-2-frbrgvugdqhxyair.prod-runtime.all-hands.dev"],
      imgSrc: ["'self'", "data:", "blob:", "https://work-1-frbrgvugdqhxyair.prod-runtime.all-hands.dev", "https://work-2-frbrgvugdqhxyair.prod-runtime.all-hands.dev"],
      connectSrc: ["'self'", "blob:", "https://work-1-frbrgvugdqhxyair.prod-runtime.all-hands.dev", "https://work-2-frbrgvugdqhxyair.prod-runtime.all-hands.dev"],
      fontSrc: ["'self'", "data:", "https://work-1-frbrgvugdqhxyair.prod-runtime.all-hands.dev", "https://work-2-frbrgvugdqhxyair.prod-runtime.all-hands.dev"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https://work-1-frbrgvugdqhxyair.prod-runtime.all-hands.dev", "https://work-2-frbrgvugdqhxyair.prod-runtime.all-hands.dev"],
      frameSrc: ["'self'", "https://work-1-frbrgvugdqhxyair.prod-runtime.all-hands.dev", "https://work-2-frbrgvugdqhxyair.prod-runtime.all-hands.dev"],
      workerSrc: ["'self'", "blob:", "https://work-1-frbrgvugdqhxyair.prod-runtime.all-hands.dev", "https://work-2-frbrgvugdqhxyair.prod-runtime.all-hands.dev"],
      scriptSrcAttr: ["'unsafe-inline'"],
      scriptSrcElem: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:"]
    }
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://work-1-frbrgvugdqhxyair.prod-runtime.all-hands.dev', 'https://work-2-frbrgvugdqhxyair.prod-runtime.all-hands.dev']
    : true,
  credentials: true
}));

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many API requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting only to API routes
app.use('/api', apiLimiter);

// Compression and logging
app.use(compression());
app.use(morgan('combined'));

// Body parsing middleware for API
app.use('/api', express.json({ limit: '50mb' }));
app.use('/api', express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api', apiRoutes);

// Serve static files (the original CascadeStudio web app)
app.use(express.static('.', {
  index: 'index.html',
  maxAge: '1d', // Cache static assets for 1 day
  setHeaders: (res, path) => {
    // Set proper MIME types for specific file extensions
    if (path.endsWith('.wasm')) {
      res.setHeader('Content-Type', 'application/wasm');
    } else if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    } else if (path.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    } else if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    } else if (path.endsWith('.ico')) {
      res.setHeader('Content-Type', 'image/x-icon');
    }
    
    // Add CORS headers for static assets
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      webApp: 'running',
      api: 'running'
    }
  });
});

// Serve the main CascadeStudio app for any non-API routes
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // Serve index.html for all other routes (SPA behavior)
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // API error response
  if (req.path.startsWith('/api/')) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
    });
  } else {
    // Web app error - serve error page or redirect to main app
    res.status(500).sendFile(path.join(__dirname, 'index.html'));
  }
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested API endpoint does not exist'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 CascadeStudio server running on port ${PORT}`);
  console.log(`📱 Web App: http://localhost:${PORT}`);
  console.log(`🔌 API: http://localhost:${PORT}/api`);
  console.log(`❤️  Health: http://localhost:${PORT}/health`);
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`📖 API Docs: http://localhost:${PORT}/api/docs`);
  }
});

module.exports = app;