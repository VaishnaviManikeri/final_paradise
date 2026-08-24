const Video = require('../models/Video');
const fs = require('fs');
const path = require('path');

// Get all videos
exports.getAllVideos = async (req, res) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 });
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get video by ID
exports.getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    video.views += 1;
    await video.save();
    res.json(video);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create video
exports.createVideo = async (req, res) => {
  try {
    const { title, description, videoUrl, duration } = req.body;
    
    // Check if thumbnail is uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'Thumbnail is required' });
    }

    const video = new Video({
      title,
      description,
      videoUrl,
      thumbnail: `/uploads/videos/${req.file.filename}`,
      duration: duration || '5:00'
    });

    await video.save();
    res.status(201).json(video);
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
};

// Update video
exports.updateVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const { title, description, videoUrl, duration } = req.body;

    video.title = title || video.title;
    video.description = description || video.description;
    video.videoUrl = videoUrl || video.videoUrl;
    video.duration = duration || video.duration;

    if (req.file) {
      if (video.thumbnail) {
        const oldPath = path.join(__dirname, '..', video.thumbnail);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      video.thumbnail = `/uploads/videos/${req.file.filename}`;
    }

    await video.save();
    res.json(video);
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
};

// Delete video
exports.deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (video.thumbnail) {
      const imagePath = path.join(__dirname, '..', video.thumbnail);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await video.deleteOne();
    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
