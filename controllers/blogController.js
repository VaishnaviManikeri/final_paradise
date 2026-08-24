const Blog = require('../models/Blog');
const fs = require('fs');
const path = require('path');

// Get all blogs
exports.getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get blog by slug
exports.getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }
    // Increment views
    blog.views += 1;
    await blog.save();
    res.json(blog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get blog by ID
exports.getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }
    res.json(blog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create blog
exports.createBlog = async (req, res) => {
  try {
    const { title, description, author, readingTime, metaTitle, metaDescription } = req.body;
    
    // Check if featured image is uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'Featured image is required' });
    }

    // Generate slug from title
    let slug = title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if slug already exists and make it unique
    let uniqueSlug = slug;
    let counter = 1;
    while (true) {
      const existing = await Blog.findOne({ slug: uniqueSlug });
      if (!existing) break;
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    const blog = new Blog({
      title,
      slug: uniqueSlug,
      description,
      author: author || 'Paradise EMS',
      featuredImage: `/uploads/blogs/${req.file.filename}`,
      readingTime: readingTime || '5 min read',
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || description.substring(0, 160).replace(/<[^>]*>/g, '')
    });

    await blog.save();
    res.status(201).json(blog);
  } catch (error) {
    // Remove uploaded file if error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    res.status(500).json({ error: error.message });
  }
};

// Update blog
exports.updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    const { title, description, author, readingTime, metaTitle, metaDescription } = req.body;

    // Update fields
    if (title && title !== blog.title) {
      blog.title = title;
      // Regenerate slug
      let slug = title
        .toLowerCase()
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      // Check if slug already exists (excluding current blog)
      let uniqueSlug = slug;
      let counter = 1;
      while (true) {
        const existing = await Blog.findOne({ slug: uniqueSlug, _id: { $ne: blog._id } });
        if (!existing) break;
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }
      blog.slug = uniqueSlug;
    }
    
    blog.description = description || blog.description;
    blog.author = author || blog.author;
    blog.readingTime = readingTime || blog.readingTime;
    blog.metaTitle = metaTitle || blog.metaTitle;
    blog.metaDescription = metaDescription || blog.metaDescription;

    // Update featured image if new one uploaded
    if (req.file) {
      // Remove old image
      if (blog.featuredImage) {
        const oldPath = path.join(__dirname, '..', blog.featuredImage);
        if (fs.existsSync(oldPath)) {
          try {
            fs.unlinkSync(oldPath);
          } catch (unlinkError) {
            console.error('Error deleting old file:', unlinkError);
          }
        }
      }
      blog.featuredImage = `/uploads/blogs/${req.file.filename}`;
    }

    await blog.save();
    res.json(blog);
  } catch (error) {
    // Remove uploaded file if error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    res.status(500).json({ error: error.message });
  }
};

// Delete blog
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    // Remove featured image
    if (blog.featuredImage) {
      const imagePath = path.join(__dirname, '..', blog.featuredImage);
      if (fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      }
    }

    await blog.deleteOne();
    res.json({ message: 'Blog deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
