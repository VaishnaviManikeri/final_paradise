const express = require("express");
const Blog = require("../models/Blog");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const router = express.Router();

/* ================= MULTER CONFIG ================= */
const uploadDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

/* ================= GET ALL BLOGS ================= */
router.get("/", async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch blogs" });
  }
});

/* ================= GET SINGLE BLOG ================= */
router.get("/:id", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });
    res.json(blog);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch blog" });
  }
});

/* ================= CREATE BLOG ================= */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const blog = await Blog.create({
      title: req.body.title,
      author: req.body.author,
      content: req.body.content,
      image: req.file ? `/uploads/${req.file.filename}` : null,
    });

    res.status(201).json(blog);
  } catch (err) {
    res.status(500).json({
      message: "Blog creation failed",
      error: err.message,
    });
  }
});

/* ================= UPDATE BLOG ================= */
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    blog.title = req.body.title || blog.title;
    blog.author = req.body.author || blog.author;
    blog.content = req.body.content || blog.content;

    if (req.file) {
      blog.image = `/uploads/${req.file.filename}`;
    }

    await blog.save();
    res.json(blog);
  } catch (err) {
    res.status(500).json({ message: "Blog update failed" });
  }
});

/* ================= DELETE BLOG ================= */
router.delete("/:id", async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    res.json({ message: "Blog deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Blog delete failed" });
  }
});

module.exports = router;
