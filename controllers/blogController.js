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

// GET /api/blog  (public - published only)
exports.getPublishedBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({ published: true })
      .select("-content")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: blogs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/blog/admin  (protected - all blogs)
exports.getAllBlogsAdmin = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: blogs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/blog/:slug  (public - single blog)
exports.getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug, published: true });
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }
    res.status(200).json({ success: true, data: blog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/blog/id/:id  (protected - single blog for editing, any status)
exports.getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }
    res.status(200).json({ success: true, data: blog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/blog  (protected)
exports.createBlog = async (req, res) => {
  try {
    const { title, author, excerpt, content, metaTitle, metaDescription, published, coverImageAlt } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: "Title and content are required" });
    }

    const blog = new Blog({
      title,
      author,
      excerpt,
      content,
      metaTitle,
      metaDescription,
      coverImageAlt,
      published: published === "false" ? false : true,
      coverImage: req.file ? `/uploads/blog/${req.file.filename}` : "",
    });

    await blog.save();
    res.status(201).json({ success: true, data: blog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/blog/:id  (protected)
exports.updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    const { title, author, excerpt, content, metaTitle, metaDescription, published, coverImageAlt } = req.body;

    if (title !== undefined) blog.title = title;
    if (author !== undefined) blog.author = author;
    if (excerpt !== undefined) blog.excerpt = excerpt;
    if (content !== undefined) blog.content = content;
    if (metaTitle !== undefined) blog.metaTitle = metaTitle;
    if (metaDescription !== undefined) blog.metaDescription = metaDescription;
    if (coverImageAlt !== undefined) blog.coverImageAlt = coverImageAlt;
    if (published !== undefined) blog.published = published === "false" ? false : true;

    if (req.file) {
      removeFile(blog.coverImage);
      blog.coverImage = `/uploads/blog/${req.file.filename}`;
    }

    await blog.save();
    res.status(200).json({ success: true, data: blog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/blog/:id  (protected)
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }
    removeFile(blog.coverImage);
    await blog.deleteOne();
    res.status(200).json({ success: true, message: "Blog deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
