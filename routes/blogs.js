const express = require('express');
const router = express.Router();
const {
  getBlogs,
  getBlogBySlug,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
} = require('../controllers/blogController');

const { protect } = require('../middleware/auth');

// Public routes
router.get('/', getBlogs);
router.get('/slug/:slug', getBlogBySlug);

// Protected routes
router.get('/id/:id', protect, getBlogById);
router.post('/', protect, createBlog);
router.put('/:id', protect, updateBlog);
router.delete('/:id', protect, deleteBlog);

module.exports = router;
