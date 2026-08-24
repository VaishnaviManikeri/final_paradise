const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, default: "General" },
    sourceType: { type: String, enum: ["youtube", "upload"], required: true },
    videoUrl: { type: String, default: "" }, // youtube link OR /uploads/videos/xxx path
    thumbnail: { type: String, default: "" },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Video", videoSchema);
