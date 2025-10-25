const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./auth');
const chatRoutes = require('./chat');

const app = express();

// IMPORTANT: Update CORS for production
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://vahan-frontend-zeta.vercel.app', // Replace with your actual frontend URL
    'https://vahan-chatbot.vercel.app'    // Add any custom domains
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'VAHAN/MoRTH Chatbot API',
    database: process.env.DB_HOST ? 'connected' : 'not configured'
  });
});

// Root endpoint
app.get('/api', (req, res) => {
  res.json({ 
    message: 'VAHAN/MoRTH Chatbot API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      login: '/api/auth/login',
      chat: '/api/chat'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// For local development
const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Export for Vercel
module.exports = app;