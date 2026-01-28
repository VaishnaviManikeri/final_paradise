const express = require("express");
const Blog = require("../models/Blog");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
// const auth = require("../middleware/auth"); // TEMPORARILY DISABLED

const router = express.Router();

/* ===================== MULTER SAFE CONFIG ===================== */
const uploadDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

/* ===================== GET ALL BLOGS ===================== */
router.get("/", async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch blogs" });
  }
});

/* ===================== GET SINGLE BLOG ===================== */
router.get("/:id", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    res.json(blog);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch blog" });
  }
});

/* ===================== CREATE BLOG ===================== */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

    const blog = await Blog.create({
      title: req.body.title,
      author: req.body.author,
      content: req.body.content,
      image: req.file ? `/uploads/${req.file.filename}` : null,
    });

    res.status(201).json(blog);
  } catch (err) {
    console.error("CREATE BLOG ERROR:", err);
    res.status(500).json({
      message: "Blog creation failed",
      error: err.message,
    });
  }
});

/* ===================== UPDATE BLOG ===================== */
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const updateData = {
      title: req.body.title,
      author: req.body.author,
      content: req.body.content,
    };

    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }

    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.json(blog);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Blog update failed" });
  }
});

/* ===================== DELETE BLOG ===================== */
router.delete("/:id", async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    res.json({ message: "Blog deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Blog delete failed" });
  }
});

module.exports = router;
