const Blog = require('../models/Blog');

// @desc    Get all blogs
// @route   GET /api/blogs
// @access  Public
exports.getBlogs = async (req, res) => {
  try {
    const { limit = 50, skip = 0, published = true } = req.query;
    
    const query = {};
    if (published !== undefined) {
      query.isPublished = published === 'true' || published === true;
    }
    
    const blogs = await Blog.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Blog.countDocuments(query);

    res.status(200).json({
      success: true,
      count: blogs.length,
      total,
      data: blogs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single blog by slug
// @route   GET /api/blogs/:slug
// @access  Public
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
      message: error.message,
    });
  }
};

// @desc    Get single blog by ID
// @route   GET /api/blogs/id/:id
// @access  Private
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
      message: error.message,
    });
  }
};

// @desc    Create blog
// @route   POST /api/blogs
// @access  Private
exports.createBlog = async (req, res) => {
  try {
    const { 
      title, 
      content, 
      excerpt, 
      author, 
      featuredImage, 
      tags, 
      isPublished,
      metaTitle,
      metaDescription 
    } = req.body;

    // Generate slug
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if slug already exists
    const existingBlog = await Blog.findOne({ slug });
    if (existingBlog) {
      return res.status(400).json({
        success: false,
        message: 'A blog with similar title already exists',
      });
    }

    // Calculate reading time
    const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);
    const readingTimeText = readingTime <= 1 ? '1 min read' : `${readingTime} min read`;

    const blog = await Blog.create({
      title,
      slug,
      content,
      excerpt: excerpt || content.replace(/<[^>]*>/g, '').substring(0, 200),
      author: author || 'Paradise EMS',
      featuredImage: featuredImage || '',
      tags: tags || [],
      isPublished: isPublished !== undefined ? isPublished : true,
      readingTime: readingTimeText,
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || excerpt || content.replace(/<[^>]*>/g, '').substring(0, 160),
    });

    res.status(201).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update blog
// @route   PUT /api/blogs/:id
// @access  Private
exports.updateBlog = async (req, res) => {
  try {
    const { 
      title, 
      content, 
      excerpt, 
      author, 
      featuredImage, 
      tags, 
      isPublished,
      metaTitle,
      metaDescription 
    } = req.body;

    let blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    // Update slug if title changed
    let slug = blog.slug;
    if (title && title !== blog.title) {
      slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      
      // Check if new slug already exists
      const existingBlog = await Blog.findOne({ slug, _id: { $ne: req.params.id } });
      if (existingBlog) {
        return res.status(400).json({
          success: false,
          message: 'A blog with similar title already exists',
        });
      }
    }

    // Update reading time if content changed
    let readingTime = blog.readingTime;
    if (content && content !== blog.content) {
      const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
      const minutes = Math.ceil(wordCount / 200);
      readingTime = minutes <= 1 ? '1 min read' : `${minutes} min read`;
    }

    blog.title = title || blog.title;
    blog.slug = slug;
    blog.content = content || blog.content;
    blog.excerpt = excerpt !== undefined ? excerpt : blog.excerpt;
    blog.author = author || blog.author;
    blog.featuredImage = featuredImage !== undefined ? featuredImage : blog.featuredImage;
    blog.tags = tags || blog.tags;
    blog.isPublished = isPublished !== undefined ? isPublished : blog.isPublished;
    blog.readingTime = readingTime;
    blog.metaTitle = metaTitle || blog.metaTitle;
    blog.metaDescription = metaDescription || blog.metaDescription;

    await blog.save();

    res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete blog
// @route   DELETE /api/blogs/:id
// @access  Private
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    await blog.deleteOne();

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
