const Blog = require('../models/Blog');
const fs = require('fs');
const path = require('path');

// Get all blogs
exports.getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: blogs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching blogs',
      error: error.message,
    });
  }
};

// Get single blog by slug
exports.getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }
    // Increment views
    blog.views += 1;
    await blog.save();
    res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching blog',
      error: error.message,
    });
  }
};

// Get single blog by ID
exports.getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }
    res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching blog',
      error: error.message,
    });
  }
};

// Create blog
exports.createBlog = async (req, res) => {
  try {
    const { title, author, content, excerpt, metaTitle, metaDescription, featuredImage, readingTime, tags, isPublished } = req.body;
    
    // Validate required fields
    if (!title || !author || !content || !excerpt) {
      return res.status(400).json({
        success: false,
        message: 'Title, author, content, and excerpt are required',
      });
    }

    // Generate slug from title if not provided in request
    let slug = req.body.slug || title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check if slug already exists
    const existingBlog = await Blog.findOne({ slug });
    if (existingBlog) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const blog = new Blog({
      title,
      slug,
      author,
      content,
      excerpt,
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || excerpt,
      featuredImage: featuredImage || '',
      readingTime: readingTime || '5 min read',
      tags: tags || [],
      isPublished: isPublished !== undefined ? isPublished : true,
    });

    await blog.save();
    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: blog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating blog',
      error: error.message,
    });
  }
};

// Update blog
exports.updateBlog = async (req, res) => {
  try {
    const { title, author, content, excerpt, metaTitle, metaDescription, featuredImage, readingTime, tags, isPublished } = req.body;
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    // Update fields
    blog.title = title || blog.title;
    blog.author = author || blog.author;
    blog.content = content || blog.content;
    blog.excerpt = excerpt || blog.excerpt;
    blog.metaTitle = metaTitle || blog.metaTitle;
    blog.metaDescription = metaDescription || blog.metaDescription;
    blog.featuredImage = featuredImage !== undefined ? featuredImage : blog.featuredImage;
    blog.readingTime = readingTime || blog.readingTime;
    blog.tags = tags || blog.tags;
    blog.isPublished = isPublished !== undefined ? isPublished : blog.isPublished;
    blog.updatedAt = Date.now();

    // Update slug if title changed
    if (title && title !== blog.title) {
      let newSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      // Check if new slug already exists
      const existingBlog = await Blog.findOne({ slug: newSlug, _id: { $ne: blog._id } });
      if (existingBlog) {
        newSlug = `${newSlug}-${Date.now().toString(36)}`;
      }
      blog.slug = newSlug;
    }

    await blog.save();
    res.status(200).json({
      success: true,
      message: 'Blog updated successfully',
      data: blog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating blog',
      error: error.message,
    });
  }
};

// Delete blog
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    // Delete featured image if exists
    if (blog.featuredImage) {
      const imagePath = path.join(__dirname, '../uploads', path.basename(blog.featuredImage));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await blog.deleteOne();
    res.status(200).json({
      success: true,
      message: 'Blog deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting blog',
      error: error.message,
    });
  }
};
