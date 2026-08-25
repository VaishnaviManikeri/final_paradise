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
    trim: true,
    lowercase: true,
    unique: true,
    sparse: true // Allow null/undefined for pre-save generation
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
  },
  excerpt: {
    type: String,
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

// Generate slug from title
const generateSlug = (title) => {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

// Pre-save middleware to generate slug from title
blogSchema.pre('save', async function(next) {
  try {
    // Generate slug from title
    if (this.title && !this.slug) {
      let baseSlug = generateSlug(this.title);
      
      // Check if slug already exists
      const existingBlog = await mongoose.model('Blog').findOne({ 
        slug: baseSlug,
        _id: { $ne: this._id }
      });
      
      if (existingBlog) {
        // Add random suffix to make it unique
        const random = Math.floor(Math.random() * 10000);
        this.slug = `${baseSlug}-${random}`;
      } else {
        this.slug = baseSlug;
      }
    }
    
    // Auto-generate excerpt from description if not provided
    if (!this.excerpt && this.description) {
      const plainText = this.description.replace(/<[^>]*>/g, '');
      this.excerpt = plainText.substring(0, 300) + '...';
    }

    // Calculate read time (approx 200 words per minute)
    if (this.description) {
      const plainText = this.description.replace(/<[^>]*>/g, '');
      const wordCount = plainText.split(/\s+/).length;
      this.readTime = Math.max(1, Math.ceil(wordCount / 200));
    }

    // Set default meta title if not provided
    if (!this.metaTitle && this.title) {
      this.metaTitle = this.title;
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Also generate slug on update
blogSchema.pre('findOneAndUpdate', async function(next) {
  try {
    const update = this.getUpdate();
    if (update.title && !update.slug) {
      const title = update.title;
      let baseSlug = generateSlug(title);
      
      // Find the current document to check if slug exists
      const doc = await this.model.findOne(this.getQuery());
      if (doc) {
        const existingBlog = await mongoose.model('Blog').findOne({ 
          slug: baseSlug,
          _id: { $ne: doc._id }
        });
        
        if (existingBlog) {
          const random = Math.floor(Math.random() * 10000);
          this.setUpdate({ ...update, slug: `${baseSlug}-${random}` });
        } else {
          this.setUpdate({ ...update, slug: baseSlug });
        }
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Blog', blogSchema);