const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

// GET /api/users/search?email=xx  — find a user to invite
router.get('/search', protect, async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: 'email query param required.' });

    const users = await User.find({ email: { $regex: email, $options: 'i' } })
      .select('name email')
      .limit(10);

    res.json({ users });
  } catch {
    res.status(500).json({ message: 'Search failed.' });
  }
});

module.exports = router;