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
      required: [true, 'Blog title is required'], 
      trim: true 
    },
    slug: { 
      type: String, 
      required: true, 
      unique: true, 
      index: true 
    },
    author: { 
      type: String, 
      default: "Admin" 
    },
    excerpt: { 
      type: String, 
      default: "" 
    },
    content: { 
      type: String, 
      required: [true, 'Blog content is required'] 
    },
    coverImage: { 
      type: String, 
      default: "" 
    },
    coverImageAlt: { 
      type: String, 
      default: "" 
    },
    metaTitle: { 
      type: String, 
      default: "" 
    },
    metaDescription: { 
      type: String, 
      default: "" 
    },
    readingTime: { 
      type: Number, 
      default: 1 
    },
    published: { 
      type: Boolean, 
      default: true 
    },
  },
  { 
    timestamps: true 
  }
);

// Pre-save middleware to generate slug and reading time
blogSchema.pre("save", function(next) {
  // Use regular function, not arrow function, to access 'this'
  const doc = this;
  
  // Generate slug if title is modified or slug is missing
  if (doc.isNew || doc.isModified("title")) {
    if (!doc.title) {
      return next(new Error("Title is required to generate slug"));
    }

    let baseSlug = slugify(doc.title);
    let slug = baseSlug;
    let counter = 1;

    // Check for uniqueness
    const Blog = mongoose.model("Blog");
    
    // Use a recursive function to find unique slug
    const findUniqueSlug = async () => {
      let existingBlog = await Blog.findOne({ 
        slug: slug, 
        _id: { $ne: doc._id } 
      });

      // Keep trying until we find a unique slug
      while (existingBlog) {
        slug = `${baseSlug}-${counter++}`;
        existingBlog = await Blog.findOne({ 
          slug: slug, 
          _id: { $ne: doc._id } 
        });
      }

      doc.slug = slug;
      
      // Calculate reading time if content is modified
      if (doc.isModified("content") && doc.content) {
        // Strip HTML tags and count words
        const plainText = doc.content
          .replace(/<[^>]*>/g, " ")  // Remove HTML tags
          .replace(/&[^;]+;/g, " ")  // Remove HTML entities
          .replace(/\s+/g, " ")      // Collapse multiple spaces
          .trim();
        
        const words = plainText ? plainText.split(/\s+/).filter(Boolean) : [];
        const wordCount = words.length;
        
        // Calculate reading time (assuming 200 words per minute)
        doc.readingTime = Math.max(1, Math.ceil(wordCount / 200));
      }
      
      // Proceed to save
      next();
    };

    // Execute the async function
    findUniqueSlug().catch(error => next(error));
  } else {
    // If title is not modified, still calculate reading time if content is modified
    if (doc.isModified("content") && doc.content) {
      const plainText = doc.content
        .replace(/<[^>]*>/g, " ")
        .replace(/&[^;]+;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      
      const words = plainText ? plainText.split(/\s+/).filter(Boolean) : [];
      const wordCount = words.length;
      doc.readingTime = Math.max(1, Math.ceil(wordCount / 200));
    }
    
    // Proceed to save
    next();
  }
});

// Add a method to get the blog URL
blogSchema.methods.getBlogUrl = function() {
  return `/blog/${this.slug}`;
};

// Add a static method to find published blogs
blogSchema.statics.findPublished = function() {
  return this.find({ published: true }).sort({ createdAt: -1 });
};

module.exports = mongoose.model("Blog", blogSchema);
