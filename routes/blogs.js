const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/blogs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'blog-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter,
});

// ===================== PUBLIC ROUTES =====================

// Get all published blogs
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, tag, category } = req.query;
    const query = { isPublished: true };

    if (tag) query.tags = tag;
    if (category) query.category = category;

    const blogs = await Blog.find(query)
      .sort({ publishedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Blog.countDocuments(query);

    res.json({
      success: true,
      blogs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single blog by slug
router.get('/:slug', async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug, isPublished: true });
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    // Increment views
    blog.views += 1;
    await blog.save();

    res.json({ success: true, blog });
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get blog by ID (for admin)
router.get('/id/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    res.json({ success: true, blog });
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ===================== ADMIN ROUTES =====================

// Create blog (admin)
router.post('/', upload.single('featuredImage'), async (req, res) => {
  try {
    const { title, content, excerpt, authorName, tags, category, readingTime, isPublished } = req.body;

    if (!title || !content || !excerpt) {
      return res.status(400).json({ success: false, message: 'Title, content, and excerpt are required' });
    }

    // Generate slug
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check if slug exists
    const existingBlog = await Blog.findOne({ slug });
    if (existingBlog) {
      return res.status(400).json({ success: false, message: 'A blog with this title already exists' });
    }

    const blogData = {
      title,
      slug,
      content,
      excerpt,
      author: {
        name: authorName || 'Paradise EMS',
      },
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      category: category || 'General',
      readingTime: readingTime || '5 min read',
      isPublished: isPublished === 'true' || isPublished === true,
    };

    if (req.file) {
      blogData.featuredImage = `uploads/blogs/${req.file.filename}`;
    }

    const blog = new Blog(blogData);
    await blog.save();

    res.status(201).json({ success: true, blog });
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update blog (admin)
router.put('/:id', upload.single('featuredImage'), async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    const { title, content, excerpt, authorName, tags, category, readingTime, isPublished } = req.body;

    // Update fields
    if (title) {
      blog.title = title;
      blog.slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
    if (content) blog.content = content;
    if (excerpt) blog.excerpt = excerpt;
    if (authorName) blog.author.name = authorName;
    if (tags) blog.tags = tags.split(',').map(t => t.trim());
    if (category) blog.category = category;
    if (readingTime) blog.readingTime = readingTime;
    if (isPublished !== undefined) blog.isPublished = isPublished === 'true' || isPublished === true;

    if (req.file) {
      // Delete old image if exists
      if (blog.featuredImage) {
        const oldImagePath = path.join(__dirname, '../', blog.featuredImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      blog.featuredImage = `uploads/blogs/${req.file.filename}`;
    }

    await blog.save();

    res.json({ success: true, blog });
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete blog (admin)
router.delete('/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    // Delete featured image
    if (blog.featuredImage) {
      const imagePath = path.join(__dirname, '../', blog.featuredImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await blog.deleteOne();

    res.json({ success: true, message: 'Blog deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;