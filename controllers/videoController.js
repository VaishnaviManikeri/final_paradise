const Video = require('../models/Video');
const fs = require('fs');
const path = require('path');

// Get all videos
exports.getAllVideos = async (req, res) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: videos,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching videos',
      error: error.message,
    });
  }
};

// Get single video
exports.getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }
    // Increment views
    video.views += 1;
    await video.save();
    res.status(200).json({
      success: true,
      data: video,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching video',
      error: error.message,
    });
  }
};

// Create video
exports.createVideo = async (req, res) => {
  try {
    const { title, description, videoUrl, thumbnail, isActive } = req.body;
    
    // Validate required fields
    if (!title || !description || !videoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and video URL are required',
      });
    }

    const video = new Video({
      title,
      description,
      videoUrl,
      thumbnail: thumbnail || '',
      isActive: isActive !== undefined ? isActive : true,
    });

    await video.save();
    res.status(201).json({
      success: true,
      message: 'Video created successfully',
      data: video,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating video',
      error: error.message,
    });
  }
};

// Update video
exports.updateVideo = async (req, res) => {
  try {
    const { title, description, videoUrl, thumbnail, isActive } = req.body;
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    video.title = title || video.title;
    video.description = description || video.description;
    video.videoUrl = videoUrl || video.videoUrl;
    video.thumbnail = thumbnail !== undefined ? thumbnail : video.thumbnail;
    video.isActive = isActive !== undefined ? isActive : video.isActive;
    video.updatedAt = Date.now();

    await video.save();
    res.status(200).json({
      success: true,
      message: 'Video updated successfully',
      data: video,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating video',
      error: error.message,
    });
  }
};

// Delete video
exports.deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    // Delete thumbnail if exists
    if (video.thumbnail) {
      const thumbnailPath = path.join(__dirname, '../uploads', path.basename(video.thumbnail));
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    }

    await video.deleteOne();
    res.status(200).json({
      success: true,
      message: 'Video deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting video',
      error: error.message,
    });
  }
};
