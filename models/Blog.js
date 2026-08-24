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
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    author: { type: String, default: "Admin" },
    excerpt: { type: String, default: "" },
    content: { type: String, required: true }, // rich text HTML from editor
    coverImage: { type: String, default: "" },
    coverImageAlt: { type: String, default: "" },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    readingTime: { type: Number, default: 1 }, // minutes
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Auto-generate slug + reading time before saving
blogSchema.pre("validate", async function (next) {
  if (this.isModified("title") || !this.slug) {
    let baseSlug = slugify(this.title);
    let slug = baseSlug;
    let counter = 1;

    // ensure uniqueness
    const Blog = mongoose.model("Blog");
    while (
      await Blog.findOne({ slug, _id: { $ne: this._id } }).lean()
    ) {
      slug = `${baseSlug}-${counter++}`;
    }
    this.slug = slug;
  }

  if (this.isModified("content")) {
    const plainText = this.content.replace(/<[^>]*>/g, " ");
    const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length;
    this.readingTime = Math.max(1, Math.ceil(wordCount / 200));
  }

  next();
});

module.exports = mongoose.model("Blog", blogSchema);
