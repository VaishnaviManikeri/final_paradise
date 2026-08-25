const Blog = require('../models/Blog');
const fs = require('fs');
const path = require('path');

// Generate unique filename
const generateFilename = (originalname) => {
  const ext = path.extname(originalname);
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1000000);
  return `blog-${timestamp}-${random}${ext}`;
};

// @desc    Get all blogs with pagination and filtering
// @route   GET /api/blogs
// @access  Public
exports.getBlogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const category = req.query.category;
    const search = req.query.search;

    let query = { isPublished: true };
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const blogs = await Blog.find(query)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-description');

    const total = await Blog.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: blogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get blogs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single blog by slug
// @route   GET /api/blogs/:slug
// @access  Public
exports.getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug, isPublished: true });
    
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    // Increment views
    blog.views += 1;
    await blog.save();

    res.status(200).json({
      success: true,
      data: blog
    });
  } catch (error) {
    console.error('Get blog by slug error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single blog by ID (for admin)
// @route   GET /api/blogs/id/:id
// @access  Private
exports.getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    res.status(200).json({
      success: true,
      data: blog
    });
  } catch (error) {
    console.error('Get blog by id error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new blog
// @route   POST /api/blogs
// @access  Private (Admin)
exports.createBlog = async (req, res) => {
  try {
    const { title, description, excerpt, category, tags, author, metaTitle, metaDescription } = req.body;
    
    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title and description are required' 
      });
    }

    // Handle featured image upload
    let featuredImage = '';
    if (req.file) {
      featuredImage = `uploads/blogs/${req.file.filename}`;
    }

    // Parse tags
    let tagsArray = [];
    if (tags) {
      if (Array.isArray(tags)) {
        tagsArray = tags;
      } else if (typeof tags === 'string') {
        tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
      }
    }

    const blog = new Blog({
      title,
      description,
      excerpt: excerpt || '',
      featuredImage,
      category: category || 'Education',
      tags: tagsArray,
      author: author || 'Paradise EMS',
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || excerpt || ''
    });

    await blog.save();

    res.status(201).json({
      success: true,
      data: blog,
      message: 'Blog created successfully'
    });
  } catch (error) {
    console.error('Create blog error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a blog
// @route   PUT /api/blogs/:id
// @access  Private (Admin)
exports.updateBlog = async (req, res) => {
  try {
    const { title, description, excerpt, category, tags, author, isPublished, metaTitle, metaDescription } = req.body;
    
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    // Handle new image upload
    if (req.file) {
      // Delete old image if exists
      if (blog.featuredImage) {
        const oldImagePath = path.join(__dirname, '..', blog.featuredImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      blog.featuredImage = `uploads/blogs/${req.file.filename}`;
    }

    // Update fields
    blog.title = title || blog.title;
    blog.description = description || blog.description;
    blog.excerpt = excerpt || blog.excerpt;
    blog.category = category || blog.category;
    blog.author = author || blog.author;
    blog.metaTitle = metaTitle || blog.metaTitle;
    blog.metaDescription = metaDescription || blog.metaDescription;
    
    if (isPublished !== undefined) {
      blog.isPublished = isPublished;
    }

    // Parse tags
    if (tags) {
      if (Array.isArray(tags)) {
        blog.tags = tags;
      } else if (typeof tags === 'string') {
        blog.tags = tags.split(',').map(t => t.trim()).filter(Boolean);
      }
    }

    await blog.save();

    res.status(200).json({
      success: true,
      data: blog,
      message: 'Blog updated successfully'
    });
  } catch (error) {
    console.error('Update blog error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a blog
// @route   DELETE /api/blogs/:id
// @access  Private (Admin)
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    // Delete featured image
    if (blog.featuredImage) {
      const imagePath = path.join(__dirname, '..', blog.featuredImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Blog.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    console.error('Delete blog error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get blog categories
// @route   GET /api/blogs/categories
// @access  Public
exports.getCategories = async (req, res) => {
  try {
    const categories = await Blog.distinct('category', { isPublished: true });
    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get related blogs
// @route   GET /api/blogs/:id/related
// @access  Public
exports.getRelatedBlogs = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    const relatedBlogs = await Blog.find({
      _id: { $ne: blog._id },
      isPublished: true,
      $or: [
        { category: blog.category },
        { tags: { $in: blog.tags } }
      ]
    })
    .sort({ publishedAt: -1 })
    .limit(4)
    .select('-description');

    res.status(200).json({
      success: true,
      data: relatedBlogs
    });
  } catch (error) {
    console.error('Get related blogs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};