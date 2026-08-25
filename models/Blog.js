const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  author: {
    type: String,
    required: true,
    default: 'Paradise EMS',
  },
  content: {
    type: String,
    required: true,
  },
  excerpt: {
    type: String,
    required: true,
    maxLength: 200,
  },
  featuredImage: {
    type: String,
    required: false,
  },
  imageCaption: {
    type: String,
    default: '',
  },
  readingTime: {
    type: Number,
    default: 5,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  category: {
    type: String,
    default: 'General',
  },
  isPublished: {
    type: Boolean,
    default: true,
  },
  publishedDate: {
    type: Date,
    default: Date.now,
  },
  metaTitle: {
    type: String,
    trim: true,
  },
  metaDescription: {
    type: String,
    trim: true,
    maxLength: 160,
  },
  views: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Update slug before saving
blogSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  
  // Auto-generate excerpt if not provided
  if (!this.excerpt && this.content) {
    const plainText = this.content.replace(/<[^>]*>/g, '');
    this.excerpt = plainText.substring(0, 200) + '...';
  }
  
  // Calculate reading time (average 200 words per minute)
  if (this.content) {
    const plainText = this.content.replace(/<[^>]*>/g, '');
    const wordCount = plainText.split(/\s+/).length;
    this.readingTime = Math.max(1, Math.round(wordCount / 200));
  }
  
  next();
});

// Update slug on title change
blogSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update.title && !update.slug) {
    update.slug = update.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  update.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Blog', blogSchema);