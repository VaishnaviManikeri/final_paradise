const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  category: { type: String, default: '', trim: true },
  videoUrl: { type: String, required: true, trim: true },
  thumbnailUrl: { type: String, default: '' },
  thumbnailPublicId: { type: String, default: '' },
  videoPublicId: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Video', videoSchema);
