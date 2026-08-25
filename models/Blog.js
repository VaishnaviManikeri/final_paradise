const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    // Rich text HTML content
  },
  excerpt: {
    type: String,
    required: [true, 'Excerpt is required'],
    maxlength: [300, 'Excerpt cannot exceed 300 characters']
  },
  featuredImage: {
    type: String,
    required: [true, 'Featured image is required']
  },
  author: {
    type: String,
    default: 'Paradise EMS'
  },
  category: {
    type: String,
    enum: ['Education', 'School News', 'Parenting', 'Student Life', 'Events', 'CBSE', 'Other'],
    default: 'Education'
  },
  tags: [{
    type: String,
    trim: true
  }],
  readTime: {
    type: Number,
    default: 5
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  publishedAt: {
    type: Date,
    default: Date.now
  },
  metaTitle: {
    type: String,
    trim: true
  },
  metaDescription: {
    type: String,
    trim: true
  },
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Pre-save middleware to generate slug from title if not provided
blogSchema.pre('save', function(next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  
  // Auto-generate excerpt from description if not provided
  if (!this.excerpt && this.description) {
    const plainText = this.description.replace(/<[^>]*>/g, '');
    this.excerpt = plainText.substring(0, 300) + '...';
  }

  // Set read time (approx 200 words per minute)
  if (this.description) {
    const plainText = this.description.replace(/<[^>]*>/g, '');
    const wordCount = plainText.split(/\s+/).length;
    this.readTime = Math.max(1, Math.ceil(wordCount / 200));
  }

  next();
});

module.exports = mongoose.model('Blog', blogSchema);