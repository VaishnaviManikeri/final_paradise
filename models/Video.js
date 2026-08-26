const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
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
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    category: {
      type: String,
      trim: true,
      default: "General",
    },
    tags: {
      type: [String],
      default: [],
    },
    // "youtube" -> videoUrl holds a YouTube/Vimeo link
    // "upload"  -> videoFile holds a locally-stored mp4 path
    sourceType: {
      type: String,
      enum: ["youtube", "upload"],
      default: "youtube",
    },
    videoUrl: {
      type: String, // external link, e.g. https://www.youtube.com/watch?v=xxxx
      default: "",
    },
    videoFile: {
      type: String, // relative path e.g. uploads/videos/xxxx.mp4
      default: "",
    },
    thumbnail: {
      type: String, // relative path e.g. uploads/videos/thumbnails/xxxx.jpg
      default: "",
    },
    duration: {
      type: String, // display string e.g. "4:35"
      default: "",
    },
    published: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Video", videoSchema);