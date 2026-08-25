const Blog = require('../models/Blog');
const fs = require('fs');
const path = require('path');

// Get all blogs
exports.getAllBlogs = async (req, res) => {
  try {
    const { published = true, limit = 10, page = 1 } = req.query;
    
    const query = { isPublished: published === 'true' };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const blogs = await Blog.find(query)
      .sort({ publishedDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Blog.countDocuments(query);
    
    res.status(200).json({
      success: true,
      blogs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single blog by slug
exports.getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Increment view count
    await Blog.findOneAndUpdate(
      { slug, isPublished: true },
      { $inc: { views: 1 } }
    );
    
    const blog = await Blog.findOne({ slug, isPublished: true });
    
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    
    res.status(200).json({ success: true, blog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single blog by ID (admin)
exports.getBlogById = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);
    
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    
    res.status(200).json({ success: true, blog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create blog
exports.createBlog = async (req, res) => {
  try {
    const { 
      title, 
      content, 
      author, 
      category, 
      tags, 
      metaTitle, 
      metaDescription,
      imageCaption,
      isPublished,
      publishedDate,
    } = req.body;
    
    let featuredImage = '';
    if (req.file) {
      featuredImage = `uploads/blogs/${req.file.filename}`;
    }
    
    const blogData = {
      title,
      content,
      author: author || 'Paradise EMS',
      featuredImage,
      imageCaption: imageCaption || '',
      category: category || 'General',
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || '',
      isPublished: isPublished !== undefined ? isPublished : true,
      publishedDate: publishedDate || new Date(),
    };
    
    const blog = new Blog(blogData);
    await blog.save();
    
    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      blog,
    });
  } catch (error) {
    // Remove uploaded file if error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update blog
exports.updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Process tags
    if (updateData.tags && typeof updateData.tags === 'string') {
      updateData.tags = updateData.tags.split(',').map(tag => tag.trim());
    }
    
    // Handle image upload
    if (req.file) {
      // Remove old image if exists
      const oldBlog = await Blog.findById(id);
      if (oldBlog && oldBlog.featuredImage) {
        const oldImagePath = path.join(__dirname, '../../', oldBlog.featuredImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      updateData.featuredImage = `uploads/blogs/${req.file.filename}`;
    }
    
    updateData.updatedAt = new Date();
    
    const blog = await Blog.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    
    res.status(200).json({
      success: true,
      message: 'Blog updated successfully',
      blog,
    });
  } catch (error) {
    // Remove uploaded file if error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete blog
exports.deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);
    
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    
    // Remove featured image
    if (blog.featuredImage) {
      const imagePath = path.join(__dirname, '../../', blog.featuredImage);
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
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle publish status
exports.togglePublish = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);
    
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    
    blog.isPublished = !blog.isPublished;
    if (blog.isPublished) {
      blog.publishedDate = new Date();
    }
    await blog.save();
    
    res.status(200).json({
      success: true,
      message: `Blog ${blog.isPublished ? 'published' : 'unpublished'} successfully`,
      blog,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get related blogs
exports.getRelatedBlogs = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 3 } = req.query;
    
    const currentBlog = await Blog.findById(id);
    if (!currentBlog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    
    const relatedBlogs = await Blog.find({
      _id: { $ne: id },
      isPublished: true,
      $or: [
        { category: currentBlog.category },
        { tags: { $in: currentBlog.tags } },
      ],
    })
    .sort({ publishedDate: -1 })
    .limit(parseInt(limit));
    
    res.status(200).json({
      success: true,
      relatedBlogs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};