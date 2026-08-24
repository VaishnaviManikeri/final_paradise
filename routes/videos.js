const express = require('express');
const router = express.Router();
const {
  getVideos,
  getVideo,
  createVideo,
  updateVideo,
  deleteVideo,
} = require('../controllers/videoController');

const { protect } = require('../middleware/auth');

// Public routes
router.get('/', getVideos);
router.get('/:id', getVideo);

// Protected routes
router.post('/', protect, createVideo);
router.put('/:id', protect, updateVideo);
router.delete('/:id', protect, deleteVideo);

module.exports = router;
