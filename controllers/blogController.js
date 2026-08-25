const Blog = require("../models/Blog");
const fs = require("fs");
const path = require("path");

const removeFile = (filePath) => {
  if (!filePath) return;
  const fullPath = path.join(__dirname, "..", filePath);
  fs.unlink(fullPath, (err) => {
    if (err && err.code !== "ENOENT") console.error("File delete error:", err.message);
  });
};

// GET /api/blogs  (public - published only)
exports.getPublishedBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({ published: true })
      .select("-content")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: blogs });
  } catch (err) {
    console.error("Error in getPublishedBlogs:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/blogs/admin/all  (protected - all blogs)
exports.getAllBlogsAdmin = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: blogs });
  } catch (err) {
    console.error("Error in getAllBlogsAdmin:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/blogs/:slug  (public - single blog)
exports.getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug, published: true });
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }
    res.status(200).json({ success: true, data: blog });
  } catch (err) {
    console.error("Error in getBlogBySlug:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/blogs/admin/id/:id  (protected - single blog for editing)
exports.getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }
    res.status(200).json({ success: true, data: blog });
  } catch (err) {
    console.error("Error in getBlogById:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/blogs  (protected)
exports.createBlog = async (req, res) => {
  try {
    console.log("===== CREATE BLOG REQUEST =====");
    console.log("Body:", req.body);
    console.log("File:", req.file);
    console.log("Headers:", req.headers['content-type']);

    // Extract form data
    const { 
      title, 
      author, 
      excerpt, 
      content, 
      metaTitle, 
      metaDescription, 
      published, 
      coverImageAlt 
    } = req.body;

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: "Title is required" 
      });
    }

    if (!content || !content.trim() || content === '<p><br></p>') {
      return res.status(400).json({ 
        success: false, 
        message: "Content is required" 
      });
    }

    // Prepare blog data
    const blogData = {
      title: title.trim(),
      author: author || "Admin",
      excerpt: excerpt || "",
      content: content,
      metaTitle: metaTitle || title.trim(),
      metaDescription: metaDescription || excerpt || "",
      coverImageAlt: coverImageAlt || "",
      published: published === "false" ? false : Boolean(published),
    };

    // Add cover image if uploaded
    if (req.file) {
      blogData.coverImage = `/uploads/blog/${req.file.filename}`;
      console.log("Cover image uploaded:", blogData.coverImage);
    }

    // Create and save blog
    const blog = new Blog(blogData);
    await blog.save();
    
    console.log("Blog created successfully:", blog._id);
    console.log("Blog slug:", blog.slug);
    
    res.status(201).json({ 
      success: true, 
      data: blog,
      message: "Blog created successfully" 
    });
  } catch (err) {
    console.error("Error in createBlog:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message || "Failed to create blog" 
    });
  }
};

// PUT /api/blogs/:id  (protected)
exports.updateBlog = async (req, res) => {
  try {
    console.log("===== UPDATE BLOG REQUEST =====");
    console.log("ID:", req.params.id);
    console.log("Body:", req.body);
    console.log("File:", req.file);

    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ 
        success: false, 
        message: "Blog not found" 
      });
    }

    const { 
      title, 
      author, 
      excerpt, 
      content, 
      metaTitle, 
      metaDescription, 
      published, 
      coverImageAlt 
    } = req.body;

    // Update fields
    if (title !== undefined && title !== null) blog.title = title.trim();
    if (author !== undefined && author !== null) blog.author = author;
    if (excerpt !== undefined && excerpt !== null) blog.excerpt = excerpt;
    if (content !== undefined && content !== null) blog.content = content;
    if (metaTitle !== undefined && metaTitle !== null) blog.metaTitle = metaTitle;
    if (metaDescription !== undefined && metaDescription !== null) blog.metaDescription = metaDescription;
    if (coverImageAlt !== undefined && coverImageAlt !== null) blog.coverImageAlt = coverImageAlt;
    
    if (published !== undefined && published !== null) {
      blog.published = published === "false" ? false : Boolean(published);
    }

    // Handle cover image update
    if (req.file) {
      if (blog.coverImage) {
        removeFile(blog.coverImage);
      }
      blog.coverImage = `/uploads/blog/${req.file.filename}`;
      console.log("Cover image updated:", blog.coverImage);
    }

    await blog.save();
    console.log("Blog updated successfully:", blog._id);
    
    res.status(200).json({ 
      success: true, 
      data: blog,
      message: "Blog updated successfully" 
    });
  } catch (err) {
    console.error("Error in updateBlog:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message || "Failed to update blog" 
    });
  }
};

// DELETE /api/blogs/:id  (protected)
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ 
        success: false, 
        message: "Blog not found" 
      });
    }
    
    if (blog.coverImage) {
      removeFile(blog.coverImage);
    }
    
    await blog.deleteOne();
    console.log("Blog deleted successfully:", blog._id);
    
    res.status(200).json({ 
      success: true, 
      message: "Blog deleted successfully" 
    });
  } catch (err) {
    console.error("Error in deleteBlog:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message || "Failed to delete blog" 
    });
  }
};
