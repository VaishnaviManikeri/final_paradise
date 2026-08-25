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

// GET /api/blogs/admin/id/:id  (protected - single blog for editing, any status)
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
    console.log("Create blog - body:", req.body);
    console.log("Create blog - file:", req.file);

    const { title, author, excerpt, content, metaTitle, metaDescription, published, coverImageAlt } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: "Title and content are required" });
    }

    // Handle published field - convert string to boolean
    let publishedValue = true;
    if (published !== undefined) {
      publishedValue = published === "false" ? false : Boolean(published);
    }

    const blogData = {
      title: title.trim(),
      author: author || "Admin",
      excerpt: excerpt || "",
      content: content,
      metaTitle: metaTitle || "",
      metaDescription: metaDescription || "",
      coverImageAlt: coverImageAlt || "",
      published: publishedValue,
    };

    // Add cover image if uploaded
    if (req.file) {
      blogData.coverImage = `/uploads/blog/${req.file.filename}`;
    }

    const blog = new Blog(blogData);
    await blog.save();
    
    console.log("Blog created successfully:", blog._id);
    res.status(201).json({ success: true, data: blog });
  } catch (err) {
    console.error("Error in createBlog:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/blogs/:id  (protected)
exports.updateBlog = async (req, res) => {
  try {
    console.log("Update blog - id:", req.params.id);
    console.log("Update blog - body:", req.body);
    console.log("Update blog - file:", req.file);

    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    const { title, author, excerpt, content, metaTitle, metaDescription, published, coverImageAlt } = req.body;

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
      // Remove old image if exists
      if (blog.coverImage) {
        removeFile(blog.coverImage);
      }
      blog.coverImage = `/uploads/blog/${req.file.filename}`;
    }

    await blog.save();
    console.log("Blog updated successfully:", blog._id);
    res.status(200).json({ success: true, data: blog });
  } catch (err) {
    console.error("Error in updateBlog:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/blogs/:id  (protected)
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }
    
    // Remove cover image if exists
    if (blog.coverImage) {
      removeFile(blog.coverImage);
    }
    
    await blog.deleteOne();
    console.log("Blog deleted successfully:", blog._id);
    res.status(200).json({ success: true, message: "Blog deleted successfully" });
  } catch (err) {
    console.error("Error in deleteBlog:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
