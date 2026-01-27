const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

/* ===================== MIDDLEWARE ===================== */

// ✅ FIXED CORS (THIS IS THE IMPORTANT PART)
app.use(cors({
  origin: [
    'http://localhost:5173',                 // frontend on localhost
    'https://sanskrutitechnoschool.com',     // deployed frontend domain
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Handle preflight requests explicitly (IMPORTANT for browsers)
app.options('*', cors());

app.use(express.json());

/* ===================== HEALTH CHECK ===================== */
// Must be BEFORE routes
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Backend is running 🚀',
    time: new Date().toISOString(),
  });
});

/* ===================== DATABASE ===================== */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

/* ===================== ROUTES ===================== */
app.use('/api/auth', require('./routes/auth'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/careers', require('./routes/careers'));

/* ===================== SERVER ===================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
