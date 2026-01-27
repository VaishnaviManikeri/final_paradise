const mongoose = require('mongoose');

const careerSchema = new mongoose.Schema({
  position: {
    type: String,
    required: true
  },
  department: String,
  description: {
    type: String,
    required: true
  },
  requirements: [String],
  location: String,
  salary: String,
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Career', careerSchema);