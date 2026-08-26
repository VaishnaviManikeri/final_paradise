const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    author: {
      type: String,
      default: "Paradise EMS",
      trim: true,
    },
    excerpt: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    content: {
      type: String, // HTML content produced by the rich text editor
      required: true,
    },
    coverImage: {
      type: String, // relative path e.g. uploads/blogs/xxxx.jpg
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
    metaTitle: {
      type: String,
      trim: true,
    },
    metaDescription: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    readingTime: {
      type: Number, // in minutes
      default: 1,
    },
    published: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Blog", blogSchema);