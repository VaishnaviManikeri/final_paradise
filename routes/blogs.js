const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const Blog = require("../models/Blog");
const authMiddleware = require("../middleware/auth");

/* ===================== UPLOAD SETUP ===================== */
const uploadDir = path.join(__dirname, "..", "uploads", "blogs");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `blog-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const isValid = allowed.test(path.extname(file.originalname).toLowerCase());
  if (isValid) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (jpg, jpeg, png, webp, gif) are allowed"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

/* ===================== HELPERS ===================== */

// Turn a title into a URL-friendly slug: "IB vs CBSE Comparison" -> "ib-vs-cbse-comparison"
const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // remove non-word chars
    .replace(/[\s_]+/g, "-") // spaces -> dashes
    .replace(/-+/g, "-") // collapse multiple dashes
    .replace(/^-+|-+$/g, ""); // trim leading/trailing dashes

// Ensure the slug is unique in the collection, appending -2, -3, etc if needed
const generateUniqueSlug = async (title, excludeId = null) => {
  let base = slugify(title) || "post";
  let slug = base;
  let counter = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = { slug };
    if (excludeId) query._id = { $ne: excludeId };
    const existing = await Blog.findOne(query);
    if (!existing) return slug;
    slug = `${base}-${counter}`;
    counter += 1;
  }
};

// Reading time based on ~200 words/minute, stripped of HTML tags
const calculateReadingTime = (html = "") => {
  const text = html.replace(/<[^>]*>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
};

// Soft-auth: if a valid token is present, req.isAdmin = true (used to let
// admins preview unpublished posts). Never blocks the request.
const softAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return next();
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    req.isAdmin = true;
  } catch (err) {
    // ignore invalid/expired token here, route stays public
  }
  next();
};

/* ===================== ROUTES ===================== */

// GET /api/blogs -> list. Public visitors get published-only, admins (valid token) get everything.
router.get("/", softAuth, async (req, res) => {
  try {
    const filter = req.isAdmin ? {} : { published: true };
    const blogs = await Blog.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: blogs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/blogs/id/:id -> fetch by Mongo id (used by admin edit form)
router.get("/id/:id", authMiddleware, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }
    res.json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/blogs/:slug -> single post by slug (public route, used on Blog detail page)
router.get("/:slug", softAuth, async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (!blog || (!blog.published && !req.isAdmin)) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }
    res.json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/blogs -> create (admin only)
router.post("/", authMiddleware, upload.single("coverImage"), async (req, res) => {
  try {
    const {
      title,
      author,
      excerpt,
      content,
      tags,
      metaTitle,
      metaDescription,
      published,
    } = req.body;

    if (!title || !content) {
      return res
        .status(400)
        .json({ success: false, message: "Title and content are required" });
    }

    const slug = await generateUniqueSlug(title);

    const blog = new Blog({
      title,
      slug,
      author: author || "Paradise EMS",
      excerpt,
      content,
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || excerpt,
      readingTime: calculateReadingTime(content),
      published: published === undefined ? true : published === "true" || published === true,
      coverImage: req.file ? `uploads/blogs/${req.file.filename}` : "",
    });

    await blog.save();
    res.status(201).json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/blogs/:id -> update (admin only)
router.put("/:id", authMiddleware, upload.single("coverImage"), async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    const {
      title,
      author,
      excerpt,
      content,
      tags,
      metaTitle,
      metaDescription,
      published,
    } = req.body;

    if (title && title !== blog.title) {
      blog.slug = await generateUniqueSlug(title, blog._id);
      blog.title = title;
    }

    if (author !== undefined) blog.author = author;
    if (excerpt !== undefined) blog.excerpt = excerpt;
    if (content !== undefined) {
      blog.content = content;
      blog.readingTime = calculateReadingTime(content);
    }
    if (tags !== undefined) {
      blog.tags = tags.split(",").map((t) => t.trim()).filter(Boolean);
    }
    if (metaTitle !== undefined) blog.metaTitle = metaTitle;
    if (metaDescription !== undefined) blog.metaDescription = metaDescription;
    if (published !== undefined) {
      blog.published = published === "true" || published === true;
    }

    if (req.file) {
      // remove old cover image from disk
      if (blog.coverImage) {
        const oldPath = path.join(__dirname, "..", blog.coverImage);
        fs.unlink(oldPath, () => {});
      }
      blog.coverImage = `uploads/blogs/${req.file.filename}`;
    }

    await blog.save();
    res.json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/blogs/:id -> delete (admin only)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }
    if (blog.coverImage) {
      const imgPath = path.join(__dirname, "..", blog.coverImage);
      fs.unlink(imgPath, () => {});
    }
    res.json({ success: true, message: "Blog deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;