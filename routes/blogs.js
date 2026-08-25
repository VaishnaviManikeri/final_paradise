const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();

const authMiddleware = require("../middleware/auth");
const {
  getPublishedBlogs,
  getAllBlogsAdmin,
  getBlogBySlug,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
} = require("../controllers/blogController");

/* ===== multer setup for cover image ===== */
const uploadDir = path.join(__dirname, "..", "uploads", "blog");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpe?g|png|webp|gif)$/i.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

/* ===== routes ===== */
// IMPORTANT: Place specific routes BEFORE parameterized routes

// Admin routes (specific paths)
router.get("/admin/all", authMiddleware, getAllBlogsAdmin);
router.get("/admin/id/:id", authMiddleware, getBlogById);

// Public routes with parameters
router.get("/", getPublishedBlogs);
router.get("/:slug", getBlogBySlug);

// CRUD operations
router.post("/", authMiddleware, upload.single("coverImage"), createBlog);
router.put("/:id", authMiddleware, upload.single("coverImage"), updateBlog);
router.delete("/:id", authMiddleware, deleteBlog);

module.exports = router;
