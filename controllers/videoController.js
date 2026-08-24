const Video = require('../models/Video');
const fs = require('fs');
const path = require('path');

// @desc    Get all videos
// @route   GET /api/videos
// @access  Public
exports.getVideos = async (req, res) => {
  try {
    const videos = await Video.find().sort({ order: 1, createdAt: -1 });
    res.status(200).json({
      success: true,
      count: videos.length,
      data: videos,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single video
// @route   GET /api/videos/:id
// @access  Public
exports.getVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }
    res.status(200).json({
      success: true,
      data: video,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create video
// @route   POST /api/videos
// @access  Private
exports.createVideo = async (req, res) => {
  try {
    const { title, description, videoUrl, thumbnail, order, isActive } = req.body;
    
    const video = await Video.create({
      title,
      description,
      videoUrl,
      thumbnail,
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({
      success: true,
      data: video,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update video
// @route   PUT /api/videos/:id
// @access  Private
exports.updateVideo = async (req, res) => {
  try {
    const { title, description, videoUrl, thumbnail, order, isActive } = req.body;
    
    let video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    video.title = title || video.title;
    video.description = description !== undefined ? description : video.description;
    video.videoUrl = videoUrl || video.videoUrl;
    video.thumbnail = thumbnail !== undefined ? thumbnail : video.thumbnail;
    video.order = order !== undefined ? order : video.order;
    video.isActive = isActive !== undefined ? isActive : video.isActive;

    await video.save();

    res.status(200).json({
      success: true,
      data: video,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete video
// @route   DELETE /api/videos/:id
// @access  Private
exports.deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    await video.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
