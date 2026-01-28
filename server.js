const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

/* ===================== CORS ===================== */
app.use(cors({
  origin: [
    'http://localhost:5173',              // local frontend
    'https://sanskrutitechnoschool.com',  // production frontend
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());
app.use('/uploads', express.static('uploads'));

/* ===================== HEALTH CHECK ===================== */
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Backend is running 🚀',
  });
});

/* ===================== DATABASE ===================== */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB error:', err);
    process.exit(1);
  });

/* ===================== ROUTES ===================== */
app.use('/api/auth', require('./routes/auth'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/careers', require('./routes/careers'));
app.use('/api/blogs', require('./routes/blogs'));

/* ===================== SERVER ===================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
