const mongoose = require("mongoose");

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Blog title is required"],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    author: {
      type: String,
      default: "Admin",
    },
    excerpt: {
      type: String,
      default: "",
    },
    content: {
      type: String,
      required: [true, "Blog content is required"],
    },
    coverImage: {
      type: String,
      default: "",
    },
    coverImageAlt: {
      type: String,
      default: "",
    },
    metaTitle: {
      type: String,
      default: "",
    },
    metaDescription: {
      type: String,
      default: "",
    },
    readingTime: {
      type: Number,
      default: 1,
    },
    published: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to generate slug and reading time
blogSchema.pre("save", async function (next) {
  try {
    // Only generate slug if title is modified or slug is missing
    if (this.isNew || this.isModified("title")) {
      if (!this.title) {
        throw new Error("Title is required to generate slug");
      }

      let baseSlug = slugify(this.title);
      let slug = baseSlug;
      let counter = 1;

      // Check for uniqueness
      const Blog = mongoose.model("Blog");
      let existingBlog = await Blog.findOne({
        slug: slug,
        _id: { $ne: this._id },
      });

      // Keep trying until we find a unique slug
      while (existingBlog) {
        slug = `${baseSlug}-${counter++}`;
        existingBlog = await Blog.findOne({
          slug: slug,
          _id: { $ne: this._id },
        });
      }

      this.slug = slug;
    }

    // Calculate reading time if content is modified
    if (this.isModified("content") && this.content) {
      // Strip HTML tags and count words
      const plainText = this.content
        .replace(/<[^>]*>/g, " ")
        .replace(/&[^;]+;/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const words = plainText ? plainText.split(/\s+/).filter(Boolean) : [];
      const wordCount = words.length;

      // Calculate reading time (assuming 200 words per minute)
      this.readingTime = Math.max(1, Math.ceil(wordCount / 200));
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Add a method to get the blog URL
blogSchema.methods.getBlogUrl = function () {
  return `/blogs/${this.slug}`;
};

// Add a static method to find published blogs
blogSchema.statics.findPublished = function () {
  return this.find({ published: true }).sort({ createdAt: -1 });
};

// ⚠️ THIS LINE WAS MISSING — without it, require("../models/Blog")
// returns `undefined`, and every Blog.find/findById/new Blog(...) call
// in the controller throws "Blog.find is not a function".
module.exports = mongoose.model("Blog", blogSchema);
