const express = require('express');
const Career = require('../models/Career');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Get all careers
router.get('/', async (req, res) => {
  try {
    const careers = await Career.find().sort({ createdAt: -1 });
    res.json(careers);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get active careers
router.get('/active', async (req, res) => {
  try {
    const careers = await Career.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(careers);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Protected routes
router.use(authMiddleware);

// Create career
router.post('/', async (req, res) => {
  try {
    const { position, department, description, requirements, location, salary, isActive } = req.body;
    
    const career = new Career({
      position,
      department,
      description,
      requirements: requirements.split(',').map(req => req.trim()),
      location,
      salary,
      isActive
    });

    await career.save();
    res.status(201).json(career);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update career
router.put('/:id', async (req, res) => {
  try {
    const { position, department, description, requirements, location, salary, isActive } = req.body;
    
    const career = await Career.findByIdAndUpdate(
      req.params.id,
      {
        position,
        department,
        description,
        requirements: requirements.split(',').map(req => req.trim()),
        location,
        salary,
        isActive
      },
      { new: true }
    );

    if (!career) {
      return res.status(404).json({ error: 'Career not found' });
    }

    res.json(career);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete career
router.delete('/:id', async (req, res) => {
  try {
    const career = await Career.findByIdAndDelete(req.params.id);
    
    if (!career) {
      return res.status(404).json({ error: 'Career not found' });
    }

    res.json({ message: 'Career deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;