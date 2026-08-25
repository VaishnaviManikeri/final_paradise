const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/auth');
const blogController = require('../controllers/blogController');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads/blogs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for blog images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'blog-' + uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WEBP and GIF images are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: fileFilter,
});

// Public routes
router.get('/', blogController.getAllBlogs);
router.get('/slug/:slug', blogController.getBlogBySlug);
router.get('/related/:id', blogController.getRelatedBlogs);

// Protected routes (admin only)
router.get('/admin/:id', authMiddleware, blogController.getBlogById);
router.post(
  '/',
  authMiddleware,
  upload.single('featuredImage'),
  blogController.createBlog
);
router.put(
  '/:id',
  authMiddleware,
  upload.single('featuredImage'),
  blogController.updateBlog
);
router.delete('/:id', authMiddleware, blogController.deleteBlog);
router.patch('/:id/toggle-publish', authMiddleware, blogController.togglePublish);

module.exports = router;