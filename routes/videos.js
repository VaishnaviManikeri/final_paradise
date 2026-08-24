const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const auth = require('../middleware/auth');

// Public routes
router.get('/', videoController.getAllVideos);
router.get('/:id', videoController.getVideoById);

// Protected routes (require authentication)
router.post('/', auth, videoController.createVideo);
router.put('/:id', auth, videoController.updateVideo);
router.delete('/:id', auth, videoController.deleteVideo);

module.exports = router;
