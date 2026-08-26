const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();

/* ===================== CORS ===================== */
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "https://www.paradiseems.co.in",
        "https://paradiseems.co.in",
      ];

      const isLocalhostOrigin = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/i.test(origin || "");

      if (!origin || allowedOrigins.includes(origin) || isLocalhostOrigin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

/* ===================== BODY PARSER ===================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===================== STATIC FILES ===================== */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ===================== ROOT HEALTH CHECK ===================== */
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    status: "OK",
    message: "Backend is running 🚀",
    port: process.env.PORT || 5014,
    time: new Date(),
  });
});

/* ===================== MAIN API HEALTH CHECK ===================== */
/* THIS FIXES curl /api => Route not found */
app.get("/api", (req, res) => {
  res.status(200).json({
    success: true,
    status: "OK",
    message: "API is running successfully 🚀",
    port: process.env.PORT || 5014,
    time: new Date(),
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
  });
});

/* ===================== DATABASE ===================== */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

/* ===================== ROUTES ===================== */
app.use("/api/auth", require("./routes/auth"));
app.use("/api/gallery", require("./routes/gallery"));
app.use("/api/announcements", require("./routes/announcements"));
app.use("/api/careers", require("./routes/careers"));

/* ===================== 404 HANDLER ===================== */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/* ===================== SERVER ===================== */
const PORT = process.env.PORT || 5014;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
