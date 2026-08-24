const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();

const authMiddleware = require("../middleware/auth");
const {
  getAllVideos,
  getAllVideosAdmin,
  createVideo,
  updateVideo,
  deleteVideo,
} = require("../controllers/videoController");

/* ===== multer setup for video file + thumbnail ===== */
const uploadDir = path.join(__dirname, "..", "uploads", "videos");
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
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "video" && !/^video\//i.test(file.mimetype)) {
      return cb(new Error("Only video files are allowed for 'video' field"));
    }
    if (file.fieldname === "thumbnail" && !/^image\//i.test(file.mimetype)) {
      return cb(new Error("Only image files are allowed for 'thumbnail' field"));
    }
    cb(null, true);
  },
});

const uploadFields = upload.fields([
  { name: "video", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

/* ===== routes ===== */
// Public
router.get("/", getAllVideos);

// Protected (admin)
router.get("/admin/all", authMiddleware, getAllVideosAdmin);
router.post("/", authMiddleware, uploadFields, createVideo);
router.put("/:id", authMiddleware, uploadFields, updateVideo);
router.delete("/:id", authMiddleware, deleteVideo);

module.exports = router;
