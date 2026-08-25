const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Blog title is required"],
      trim: true,
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

// Pre-save middleware to calculate reading time.
// (Mongoose 7+ removed callback-style `next` in pre/post hooks — this uses
// plain async/await and throws on error instead of calling next(error).)
blogSchema.pre("save", async function () {
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
});

// Add a method to get the blog URL (uses _id now, not slug)
blogSchema.methods.getBlogUrl = function () {
  return `/blogs/${this._id}`;
};

// Add a static method to find published blogs
blogSchema.statics.findPublished = function () {
  return this.find({ published: true }).sort({ createdAt: -1 });
};

module.exports = mongoose.model("Blog", blogSchema);
