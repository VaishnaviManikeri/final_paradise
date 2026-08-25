const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

dotenv.config();

const app = express();

/* ===================== CREATE UPLOAD DIRECTORIES ===================== */
const uploadDirs = [
  'uploads',
  'uploads/blogs',
  'uploads/gallery',
  'uploads/announcements',
  'uploads/careers'
];

uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

/* ===================== CORS ===================== */
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://www.paradiseems.co.in",
        "https://paradiseems.co.in",
        "https://api.paradiseems.co.in",
        "http://api.paradiseems.co.in",
      ];

      // Allow all localhost ports for development
      const isLocalhostOrigin = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/i.test(origin || "");

      if (!origin || allowedOrigins.includes(origin) || isLocalhostOrigin) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

/* ===================== BODY PARSER ===================== */
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/* ===================== STATIC FILES ===================== */
// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve static files from public directory (if exists)
const publicPath = path.join(__dirname, "public");
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}

// Log static file serving
console.log(`✅ Serving static files from: ${path.join(__dirname, "uploads")}`);

/* ===================== ROOT HEALTH CHECK ===================== */
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    status: "OK",
    message: "Paradise EMS Backend is running 🚀",
    version: "1.0.0",
    port: process.env.PORT || 5014,
    time: new Date(),
    environment: process.env.NODE_ENV || "development",
  });
});

/* ===================== MAIN API HEALTH CHECK ===================== */
app.get("/api", (req, res) => {
  res.status(200).json({
    success: true,
    status: "OK",
    message: "API is running successfully 🚀",
    port: process.env.PORT || 5014,
    time: new Date(),
    endpoints: {
      auth: "/api/auth",
      gallery: "/api/gallery",
      announcements: "/api/announcements",
      careers: "/api/careers",
      blogs: "/api/blogs",
      status: "/api/status",
    }
  });
});

/* ===================== PING ROUTE ===================== */
app.get("/ping", (req, res) => {
  res.status(200).send("✅ Server is alive");
});

/* ===================== HOSTINGER TEST API ===================== */
app.get("/api/status", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Hostinger backend is running successfully 🚀",
    port: process.env.PORT || 5014,
    time: new Date(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

/* ===================== DATABASE CONNECTION ===================== */
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log("✅ MongoDB connected successfully");
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🔗 Host: ${mongoose.connection.host}`);
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    console.error("💡 Please check your MONGO_URI in .env file");
    process.exit(1);
  });

// MongoDB connection error handling
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. Attempting to reconnect...');
});

/* ===================== ROUTES ===================== */
// Authentication routes
app.use("/api/auth", require("./routes/auth"));

// Gallery routes
app.use("/api/gallery", require("./routes/gallery"));

// Announcements routes
app.use("/api/announcements", require("./routes/announcements"));

// Careers routes
app.use("/api/careers", require("./routes/careers"));

// Blog routes
app.use("/api/blogs", require("./routes/blogs"));

// Additional routes can be added here

/* ===================== 404 HANDLER ===================== */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

/* ===================== GLOBAL ERROR HANDLER ===================== */
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  
  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 5MB.',
    });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file field.',
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: messages,
    });
  }

  // Handle duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `Duplicate value for ${field}. Please use a unique value.`,
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

/* ===================== SERVER ===================== */
const PORT = process.env.PORT || 5014;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 API URL: http://localhost:${PORT}/api`);
  console.log(`📁 Uploads directory: ${path.join(__dirname, 'uploads')}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('🔄 Received shutdown signal. Closing server gracefully...');
  server.close(() => {
    console.log('✅ Server closed.');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed.');
      process.exit(0);
    });
  });
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Keep the process running but log the error
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Keep the process running but log the error
});

module.exports = app;