const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const authMiddleware = require('../middleware/auth');
const Video = require('../models/Video');

ffmpeg.setFfmpegPath(ffmpegPath);

const router = express.Router();
const uploadDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const fileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '-');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage: fileStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const isThumbnail = file.fieldname === 'thumbnail';

    if (isThumbnail && file.mimetype.startsWith('image/')) {
      return callback(null, true);
    }

    if (!isThumbnail && file.mimetype.startsWith('video/')) {
      return callback(null, true);
    }

    callback(new Error(isThumbnail ? 'Thumbnail must be an image' : 'Video file must be a video'));
  },
});

const getYouTubeThumbnail = (url) => {
  if (!url) return '';
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/i);
  if (match?.[1]) {
    return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
  }
  return '';
};

const removeLocalFile = (filePath) => {
  if (!filePath) return;
  const normalized = filePath.replace(/^\//, '');
  const fullPath = path.join(__dirname, '..', normalized);

  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};

const generateVideoThumbnail = (videoPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(0)
      .outputOptions([
        '-frames:v 1',
        '-vf', 'select=eq(n\\,0),scale=640:360',
        '-q:v 2',
      ])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (error) => reject(error))
      .run();
  });
};

router.get('/', async (_req, res) => {
  try {
    res.json(await Video.find().sort({ createdAt: -1 }));
  } catch (_error) {
    res.status(500).json({ message: 'Failed to fetch videos' });
  }
});

router.use(authMiddleware);

router.post(
  '/',
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'video', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { title, description, category, videoUrl } = req.body;
      const trimmedTitle = title?.trim() || '';
      const trimmedVideoUrl = (videoUrl || '').trim();
      const uploadedVideo = req.files?.video?.[0];
      const uploadedThumbnail = req.files?.thumbnail?.[0];

      const finalVideoUrl = uploadedVideo ? `/uploads/${uploadedVideo.filename}` : trimmedVideoUrl;
      if (!trimmedTitle || !finalVideoUrl) {
        if (uploadedVideo) removeLocalFile(`/uploads/${uploadedVideo.filename}`);
        if (uploadedThumbnail) removeLocalFile(`/uploads/${uploadedThumbnail.filename}`);
        return res.status(400).json({ message: 'Title and video URL or uploaded video are required' });
      }

      const hasYouTubeThumbnail = Boolean(getYouTubeThumbnail(finalVideoUrl));
      if (!uploadedVideo && !uploadedThumbnail && !hasYouTubeThumbnail) {
        if (uploadedVideo) removeLocalFile(`/uploads/${uploadedVideo.filename}`);
        if (uploadedThumbnail) removeLocalFile(`/uploads/${uploadedThumbnail.filename}`);
        return res.status(400).json({
          message: 'Thumbnail is required for direct video links. Upload a thumbnail or use a YouTube video URL.',
        });
      }

      let thumbnailUrl = uploadedThumbnail ? `/uploads/${uploadedThumbnail.filename}` : '';

      if (!thumbnailUrl && uploadedVideo) {
        const videoFileName = `${Date.now()}-${path.parse(uploadedVideo.originalname).name}-thumb.jpg`;
        const videoFullPath = path.join(uploadDir, uploadedVideo.filename);
        const thumbFullPath = path.join(uploadDir, videoFileName);

        try {
          await generateVideoThumbnail(videoFullPath, thumbFullPath);
          thumbnailUrl = `/uploads/${videoFileName}`;
        } catch (_error) {
          thumbnailUrl = '';
        }
      }

      if (!thumbnailUrl) {
        thumbnailUrl = getYouTubeThumbnail(finalVideoUrl) || '';
      }

      const video = await Video.create({
        title: trimmedTitle,
        description: description || '',
        category: category || '',
        videoUrl: finalVideoUrl,
        thumbnailUrl,
      });

      res.status(201).json(video);
    } catch (error) {
      res.status(500).json({ message: 'Video creation failed', error: error.message });
    }
  }
);

router.put(
  '/:id',
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'video', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const video = await Video.findById(req.params.id);
      if (!video) {
        if (req.files?.thumbnail?.[0]) removeLocalFile(`/uploads/${req.files.thumbnail[0].filename}`);
        if (req.files?.video?.[0]) removeLocalFile(`/uploads/${req.files.video[0].filename}`);
        return res.status(404).json({ message: 'Video not found' });
      }

      const trimmedTitle = (req.body.title || video.title || '').trim();
      const trimmedDescription = (req.body.description ?? video.description ?? '').trim();
      const trimmedCategory = (req.body.category ?? video.category ?? '').trim();
      const incomingVideoUrl = (req.body.videoUrl || '').trim();
      const uploadedVideo = req.files?.video?.[0];
      const uploadedThumbnail = req.files?.thumbnail?.[0];

      if (!trimmedTitle) {
        return res.status(400).json({ message: 'Title is required' });
      }

      const finalVideoUrl = uploadedVideo ? `/uploads/${uploadedVideo.filename}` : incomingVideoUrl || video.videoUrl;
      if (!finalVideoUrl) {
        return res.status(400).json({ message: 'Video URL or uploaded video is required' });
      }

      if (uploadedThumbnail) {
        if (video.thumbnailUrl && video.thumbnailUrl.startsWith('/uploads/')) {
          removeLocalFile(video.thumbnailUrl);
        }
        video.thumbnailUrl = `/uploads/${uploadedThumbnail.filename}`;
      } else if (uploadedVideo) {
        if (video.thumbnailUrl && video.thumbnailUrl.startsWith('/uploads/')) {
          removeLocalFile(video.thumbnailUrl);
        }

        const videoFileName = `${Date.now()}-${path.parse(uploadedVideo.originalname).name}-thumb.jpg`;
        const videoFullPath = path.join(uploadDir, uploadedVideo.filename);
        const thumbFullPath = path.join(uploadDir, videoFileName);

        try {
          await generateVideoThumbnail(videoFullPath, thumbFullPath);
          video.thumbnailUrl = `/uploads/${videoFileName}`;
        } catch (_error) {
          video.thumbnailUrl = getYouTubeThumbnail(finalVideoUrl) || '';
        }
      } else if (incomingVideoUrl || video.videoUrl) {
        const youtubeThumb = getYouTubeThumbnail(finalVideoUrl);
        if (youtubeThumb) {
          video.thumbnailUrl = youtubeThumb;
        } else if (!video.thumbnailUrl) {
          video.thumbnailUrl = '';
        }
      }

      if (uploadedVideo && video.videoUrl && video.videoUrl.startsWith('/uploads/')) {
        removeLocalFile(video.videoUrl);
      }

      video.title = trimmedTitle;
      video.description = trimmedDescription;
      video.category = trimmedCategory;
      video.videoUrl = finalVideoUrl;

      await video.save();
      res.json(video);
    } catch (error) {
      res.status(500).json({ message: 'Video update failed', error: error.message });
    }
  }
);

router.delete('/:id', async (req, res) => {
  try {
    const video = await Video.findByIdAndDelete(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    if (video.thumbnailUrl && video.thumbnailUrl.startsWith('/uploads/')) {
      removeLocalFile(video.thumbnailUrl);
    }

    if (video.videoUrl && video.videoUrl.startsWith('/uploads/')) {
      removeLocalFile(video.videoUrl);
    }

    res.json({ message: 'Video deleted successfully' });
  } catch (_error) {
    res.status(500).json({ message: 'Video deletion failed' });
  }
});

router.use((error, _req, res, _next) => {
  res.status(400).json({ message: error.message || 'File upload failed' });
});

module.exports = router;
