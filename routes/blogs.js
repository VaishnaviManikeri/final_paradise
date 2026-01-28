const express = require("express");
const Blog = require("../models/Blog");
const auth = require("../middleware/auth"); // same auth used in gallery/admin

const router = express.Router();

/* PUBLIC: GET ALL BLOGS */
router.get("/", async (req, res) => {
  const blogs = await Blog.find().sort({ createdAt: -1 });
  res.json(blogs);
});

/* PUBLIC: GET SINGLE BLOG */
router.get("/:id", async (req, res) => {
  const blog = await Blog.findById(req.params.id);
  res.json(blog);
});

/* ADMIN: CREATE */
router.post("/", auth, async (req, res) => {
  const blog = await Blog.create(req.body);
  res.status(201).json(blog);
});

/* ADMIN: UPDATE */
router.put("/:id", auth, async (req, res) => {
  const blog = await Blog.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json(blog);
});

/* ADMIN: DELETE */
router.delete("/:id", auth, async (req, res) => {
  await Blog.findByIdAndDelete(req.params.id);
  res.json({ message: "Blog deleted" });
});

module.exports = router;
