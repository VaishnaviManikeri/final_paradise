const Video = require("../models/Video");
const fs = require("fs");
const path = require("path");

const removeFile = (filePath) => {
  if (!filePath) return;
  const fullPath = path.join(__dirname, "..", filePath);
  fs.unlink(fullPath, (err) => {
    if (err && err.code !== "ENOENT") console.error("File delete error:", err.message);
  });
};

// GET /api/videos  (public)
exports.getAllVideos = async (req, res) => {
  try {
    const videos = await Video.find({ published: true }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: videos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/videos/admin  (protected - all, including unpublished)
exports.getAllVideosAdmin = async (req, res) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: videos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/videos  (protected)
exports.createVideo = async (req, res) => {
  try {
    const { title, description, category, sourceType, videoUrl, published } = req.body;

    if (!title || !sourceType) {
      return res.status(400).json({ success: false, message: "Title and sourceType are required" });
    }

    if (sourceType === "youtube" && !videoUrl) {
      return res.status(400).json({ success: false, message: "YouTube URL is required" });
    }

    if (sourceType === "upload" && !req.files?.video) {
      return res.status(400).json({ success: false, message: "Video file is required" });
    }

    const video = new Video({
      title,
      description,
      category,
      sourceType,
      published: published === "false" ? false : true,
      videoUrl:
        sourceType === "youtube"
          ? videoUrl
          : `/uploads/videos/${req.files.video[0].filename}`,
      thumbnail: req.files?.thumbnail ? `/uploads/videos/${req.files.thumbnail[0].filename}` : "",
    });

    await video.save();
    res.status(201).json({ success: true, data: video });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/videos/:id  (protected)
exports.updateVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found" });
    }

    const { title, description, category, sourceType, videoUrl, published } = req.body;

    if (title !== undefined) video.title = title;
    if (description !== undefined) video.description = description;
    if (category !== undefined) video.category = category;
    if (published !== undefined) video.published = published === "false" ? false : true;

    if (sourceType === "youtube" && videoUrl) {
      if (video.sourceType === "upload") removeFile(video.videoUrl);
      video.sourceType = "youtube";
      video.videoUrl = videoUrl;
    }

    if (req.files?.video) {
      if (video.sourceType === "upload") removeFile(video.videoUrl);
      video.sourceType = "upload";
      video.videoUrl = `/uploads/videos/${req.files.video[0].filename}`;
    }

    if (req.files?.thumbnail) {
      removeFile(video.thumbnail);
      video.thumbnail = `/uploads/videos/${req.files.thumbnail[0].filename}`;
    }

    await video.save();
    res.status(200).json({ success: true, data: video });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/videos/:id  (protected)
exports.deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found" });
    }
    if (video.sourceType === "upload") removeFile(video.videoUrl);
    removeFile(video.thumbnail);
    await video.deleteOne();
    res.status(200).json({ success: true, message: "Video deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
