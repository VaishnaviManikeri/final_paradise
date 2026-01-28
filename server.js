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
    origin: [
      "http://localhost:5173",
      "https://sanskrutitechnoschool.com",
    ],
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

/* ===================== HEALTH CHECK ===================== */
app.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Backend is running 🚀",
  });
});

/* ===================== DATABASE ===================== */
mongoose
  .connect(process.env.MONGO_URI) // ✅ NO OPTIONS
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
app.use("/api/blogs", require("./routes/blogs"));

/* ===================== 404 HANDLER ===================== */
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

/* ===================== SERVER ===================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
