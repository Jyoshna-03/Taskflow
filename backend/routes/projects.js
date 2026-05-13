const express = require('express');
const router  = express.Router();
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const Task    = require('../models/Task');
const User    = require('../models/User');
const { protect, requireProjectMember, requireAdmin } = require('../middleware/auth');

// helper: attach task counts to a project plain object
async function withCounts(project) {
  const rows = await Task.aggregate([
    { $match: { project: project._id } },
    { $group: { _id: '$status', n: { $sum: 1 } } },
  ]);
  const counts = { total: 0, Todo: 0, 'In Progress': 0, 'In Review': 0, Done: 0 };
  rows.forEach(r => { counts[r._id] = r.n; counts.total += r.n; });
  return { ...project.toObject ? project.toObject() : project, taskCounts: counts };
}

// ── GET /api/projects  (all projects the logged-in user belongs to) ───────────
router.get('/', protect, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
    })
      .populate('owner',          'name email')
      .populate('members.user',   'name email')
      .sort({ updatedAt: -1 });

    const result = await Promise.all(projects.map(withCounts));
    res.json({ projects: result });
  } catch {
    res.status(500).json({ message: 'Failed to fetch projects.' });
  }
});

// ── POST /api/projects  (create) ─────────────────────────────────────────────
router.post(
  '/',
  protect,
  [body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 chars')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    try {
      const { name, description, status, priority, deadline, color } = req.body;
      const project = await Project.create({
        name, description, status, priority, deadline,
        color: color || '#6366f1',
        owner: req.user._id,
        members: [{ user: req.user._id, role: 'Admin' }],
      });

      await project.populate('owner',        'name email');
      await project.populate('members.user', 'name email');
      res.status(201).json({ project: await withCounts(project) });
    } catch {
      res.status(500).json({ message: 'Failed to create project.' });
    }
  }
);

// ── GET /api/projects/:id ────────────────────────────────────────────────────
router.get('/:id', protect, requireProjectMember, async (req, res) => {
  try {
    await req.project.populate('owner',        'name email');
    await req.project.populate('members.user', 'name email');
    const result = await withCounts(req.project);
    result.userRole = req.userRole;
    res.json({ project: result });
  } catch {
    res.status(500).json({ message: 'Failed to fetch project.' });
  }
});

// ── PATCH /api/projects/:id  (update — Admin only) ───────────────────────────
router.patch('/:id', protect, requireAdmin, async (req, res) => {
  try {
    const allowed = ['name', 'description', 'status', 'priority', 'deadline', 'color'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const project = await Project.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('owner',        'name email')
      .populate('members.user', 'name email');

    res.json({ project: await withCounts(project) });
  } catch {
    res.status(500).json({ message: 'Failed to update project.' });
  }
});

// ── DELETE /api/projects/:id  (owner only) ───────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the project owner can delete it.' });
    }

    await Task.deleteMany({ project: project._id });
    await project.deleteOne();
    res.json({ message: 'Project deleted.' });
  } catch {
    res.status(500).json({ message: 'Failed to delete project.' });
  }
});

// ── POST /api/projects/:id/members  (add member — Admin) ─────────────────────
router.post(
  '/:id/members',
  protect,
  requireAdmin,
  [body('email').isEmail().normalizeEmail().withMessage('Valid email required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    try {
      const { email, role = 'Member' } = req.body;
      const userToAdd = await User.findOne({ email });
      if (!userToAdd) return res.status(404).json({ message: 'No user found with that email.' });

      const project = req.project;
      const alreadyIn = project.members.some(m => m.user.toString() === userToAdd._id.toString())
                     || project.owner.toString() === userToAdd._id.toString();
      if (alreadyIn) return res.status(400).json({ message: 'User is already a member.' });

      project.members.push({ user: userToAdd._id, role });
      await project.save();
      await project.populate('owner',        'name email');
      await project.populate('members.user', 'name email');
      res.json({ project: await withCounts(project) });
    } catch {
      res.status(500).json({ message: 'Failed to add member.' });
    }
  }
);

// ── DELETE /api/projects/:id/members/:userId  (remove member — Admin) ────────
router.delete('/:id/members/:userId', protect, requireAdmin, async (req, res) => {
  try {
    const project = req.project;
    if (project.owner.toString() === req.params.userId) {
      return res.status(400).json({ message: 'Cannot remove the project owner.' });
    }
    project.members = project.members.filter(m => m.user.toString() !== req.params.userId);
    await project.save();
    await project.populate('members.user', 'name email');
    res.json({ project: await withCounts(project) });
  } catch {
    res.status(500).json({ message: 'Failed to remove member.' });
  }
});

// ── PATCH /api/projects/:id/members/:userId/role  (change role — Admin) ───────
router.patch('/:id/members/:userId/role', protect, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['Admin', 'Member'].includes(role)) {
      return res.status(400).json({ message: 'Role must be Admin or Member.' });
    }
    const project = req.project;
    const member  = project.members.find(m => m.user.toString() === req.params.userId);
    if (!member) return res.status(404).json({ message: 'Member not found.' });
    member.role = role;
    await project.save();
    await project.populate('members.user', 'name email');
    res.json({ project });
  } catch {
    res.status(500).json({ message: 'Failed to update role.' });
  }
});

module.exports = router;