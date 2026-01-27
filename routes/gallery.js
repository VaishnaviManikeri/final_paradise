const express = require('express');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const Gallery = require('../models/Gallery');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/* ================= CLOUDINARY STORAGE ================= */
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'gallery',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

const upload = multer({ storage });

/* ================= PUBLIC ROUTE ================= */
router.get('/', async (req, res) => {
  try {
    const gallery = await Gallery.find().sort({ createdAt: -1 });
    res.json(gallery);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ================= PROTECTED ROUTES ================= */
router.use(authMiddleware);

/* CREATE */
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { title, description, category } = req.body;

    const galleryItem = new Gallery({
      title,
      description,
      category,
      imageUrl: req.file.path, // Cloudinary URL
    });

    await galleryItem.save();
    res.status(201).json(galleryItem);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* UPDATE */
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { title, description, category } = req.body;

    const updateData = { title, description, category };

    if (req.file) {
      updateData.imageUrl = req.file.path;
    }

    const galleryItem = await Gallery.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!galleryItem) {
      return res.status(404).json({ error: 'Gallery item not found' });
    }

    res.json(galleryItem);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* DELETE */
router.delete('/:id', async (req, res) => {
  try {
    const galleryItem = await Gallery.findByIdAndDelete(req.params.id);
    if (!galleryItem) {
      return res.status(404).json({ error: 'Gallery item not found' });
    }
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
