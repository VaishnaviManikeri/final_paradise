const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const Video = require("../models/Video");
const authMiddleware = require("../middleware/auth");

/* ===================== UPLOAD SETUP ===================== */
const uploadDir = path.join(__dirname, "..", "uploads", "videos");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const prefix = file.fieldname === "thumbnail" ? "thumb" : "video";
    cb(null, `${prefix}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === "thumbnail") {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const isValid = allowed.test(path.extname(file.originalname).toLowerCase());
    return isValid
      ? cb(null, true)
      : cb(new Error("Thumbnail must be an image file (jpg, jpeg, png, webp, gif)"));
  }
  if (file.fieldname === "videoFile") {
    const allowed = /mp4|webm|mov|ogg/;
    const isValid = allowed.test(path.extname(file.originalname).toLowerCase());
    return isValid
      ? cb(null, true)
      : cb(new Error("Video must be one of: mp4, webm, mov, ogg"));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB (covers uploaded video files)
});

const uploadFields = upload.fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "videoFile", maxCount: 1 },
]);

/* ===================== HELPERS ===================== */

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const generateUniqueSlug = async (title, excludeId = null) => {
  let base = slugify(title) || "video";
  let slug = base;
  let counter = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = { slug };
    if (excludeId) query._id = { $ne: excludeId };
    const existing = await Video.findOne(query);
    if (!existing) return slug;
    slug = `${base}-${counter}`;
    counter += 1;
  }
};

// Soft-auth: valid token -> req.isAdmin = true, but never blocks the request.
const softAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return next();
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    req.isAdmin = true;
  } catch (err) {
    // ignore invalid/expired token, route stays public
  }
  next();
};

const removeFileIfExists = (relativePath) => {
  if (!relativePath) return;
  const fullPath = path.join(__dirname, "..", relativePath);
  fs.unlink(fullPath, () => {});
};

/* ===================== ROUTES ===================== */

// GET /api/videos -> list. Public gets published-only, admins (valid token) get everything.
router.get("/", softAuth, async (req, res) => {
  try {
    const filter = req.isAdmin ? {} : { published: true };
    const videos = await Video.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: videos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/videos/id/:id -> fetch by Mongo id (used by admin edit form)
router.get("/id/:id", authMiddleware, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found" });
    }
    res.json({ success: true, data: video });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/videos/:slug -> single video by slug (public, used on Video detail page)
router.get("/:slug", softAuth, async (req, res) => {
  try {
    const video = await Video.findOne({ slug: req.params.slug });
    if (!video || (!video.published && !req.isAdmin)) {
      return res.status(404).json({ success: false, message: "Video not found" });
    }
    res.json({ success: true, data: video });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/videos -> create (admin only)
router.post("/", authMiddleware, uploadFields, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      tags,
      sourceType,
      videoUrl,
      duration,
      published,
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    const resolvedSourceType = sourceType === "upload" ? "upload" : "youtube";
    const videoFile = req.files?.videoFile?.[0];
    const thumbnail = req.files?.thumbnail?.[0];

    if (resolvedSourceType === "youtube" && !videoUrl) {
      return res
        .status(400)
        .json({ success: false, message: "Video URL is required for YouTube/Vimeo source" });
    }
    if (resolvedSourceType === "upload" && !videoFile) {
      return res
        .status(400)
        .json({ success: false, message: "A video file is required for uploaded source" });
    }

    const slug = await generateUniqueSlug(title);

    const video = new Video({
      title,
      slug,
      description,
      category: category || "General",
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      sourceType: resolvedSourceType,
      videoUrl: resolvedSourceType === "youtube" ? videoUrl : "",
      videoFile: resolvedSourceType === "upload" ? `uploads/videos/${videoFile.filename}` : "",
      thumbnail: thumbnail ? `uploads/videos/${thumbnail.filename}` : "",
      duration: duration || "",
      published: published === undefined ? true : published === "true" || published === true,
    });

    await video.save();
    res.status(201).json({ success: true, data: video });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/videos/:id -> update (admin only)
router.put("/:id", authMiddleware, uploadFields, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found" });
    }

    const {
      title,
      description,
      category,
      tags,
      sourceType,
      videoUrl,
      duration,
      published,
    } = req.body;

    if (title && title !== video.title) {
      video.slug = await generateUniqueSlug(title, video._id);
      video.title = title;
    }

    if (description !== undefined) video.description = description;
    if (category !== undefined) video.category = category;
    if (tags !== undefined) {
      video.tags = tags.split(",").map((t) => t.trim()).filter(Boolean);
    }
    if (duration !== undefined) video.duration = duration;
    if (published !== undefined) {
      video.published = published === "true" || published === true;
    }

    if (sourceType === "youtube" || sourceType === "upload") {
      video.sourceType = sourceType;
    }

    if (video.sourceType === "youtube" && videoUrl !== undefined) {
      video.videoUrl = videoUrl;
      if (video.videoFile) {
        removeFileIfExists(video.videoFile);
        video.videoFile = "";
      }
    }

    const newVideoFile = req.files?.videoFile?.[0];
    if (newVideoFile) {
      if (video.videoFile) removeFileIfExists(video.videoFile);
      video.videoFile = `uploads/videos/${newVideoFile.filename}`;
      video.sourceType = "upload";
      video.videoUrl = "";
    }

    const newThumbnail = req.files?.thumbnail?.[0];
    if (newThumbnail) {
      if (video.thumbnail) removeFileIfExists(video.thumbnail);
      video.thumbnail = `uploads/videos/${newThumbnail.filename}`;
    }

    await video.save();
    res.json({ success: true, data: video });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/videos/:id -> delete (admin only)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const video = await Video.findByIdAndDelete(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found" });
    }
    removeFileIfExists(video.thumbnail);
    removeFileIfExists(video.videoFile);
    res.json({ success: true, message: "Video deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;