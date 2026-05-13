const express = require('express');
const router  = express.Router();
const { body, validationResult } = require('express-validator');
const Task    = require('../models/Task');
const Project = require('../models/Project');
const { protect } = require('../middleware/auth');

// helper: check if user belongs to a project
async function isMember(userId, project) {
  return project.owner.toString() === userId.toString() ||
         project.members.some(m => m.user.toString() === userId.toString());
}

// ── GET /api/tasks?projectId=xxx  (list tasks for a project) ─────────────────
router.get('/', protect, async (req, res) => {
  try {
    const { projectId, status, priority, assignee, search } = req.query;

    if (!projectId) {
      // Dashboard: return tasks assigned to me across all projects
      const tasks = await Task.find({ assignee: req.user._id })
        .populate('project',  'name color')
        .populate('assignee', 'name email')
        .populate('createdBy','name email')
        .sort({ dueDate: 1 });
      return res.json({ tasks });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!(await isMember(req.user._id, project))) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const filter = { project: projectId };
    if (status)   filter.status   = status;
    if (priority) filter.priority = priority;
    if (assignee) filter.assignee = assignee;
    if (search)   filter.title    = { $regex: search, $options: 'i' };

    const tasks = await Task.find(filter)
      .populate('assignee', 'name email')
      .populate('createdBy','name email')
      .sort({ createdAt: -1 });

    res.json({ tasks });
  } catch {
    res.status(500).json({ message: 'Failed to fetch tasks.' });
  }
});

// ── GET /api/tasks/dashboard/stats ───────────────────────────────────────────
router.get('/dashboard/stats', protect, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
    });
    const pIds = projects.map(p => p._id);
    const now  = new Date();

    const [statusRows, overdue, recent, myTasks] = await Promise.all([
      Task.aggregate([
        { $match: { project: { $in: pIds } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Task.find({ project: { $in: pIds }, dueDate: { $lt: now }, status: { $ne: 'Done' } })
          .populate('project', 'name color').populate('assignee', 'name').limit(10),
      Task.find({ project: { $in: pIds } })
          .sort({ createdAt: -1 }).limit(5)
          .populate('project', 'name color').populate('assignee', 'name'),
      Task.find({ assignee: req.user._id, status: { $ne: 'Done' } })
          .populate('project', 'name color').limit(10),
    ]);

    const byStatus = { Todo: 0, 'In Progress': 0, 'In Review': 0, Done: 0 };
    statusRows.forEach(r => { byStatus[r._id] = r.count; });
    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);

    res.json({
      stats: {
        totalProjects: projects.length,
        totalTasks: total,
        byStatus,
        overdueCount: overdue.length,
        overdueTasks: overdue,
        recentTasks:  recent,
        myTasks,
      },
    });
  } catch {
    res.status(500).json({ message: 'Failed to fetch stats.' });
  }
});

// ── POST /api/tasks  (create task) ───────────────────────────────────────────
router.post(
  '/',
  protect,
  [body('title').trim().isLength({ min: 2, max: 200 }).withMessage('Title must be 2-200 chars'),
   body('projectId').notEmpty().withMessage('projectId required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    try {
      const { title, description, status, priority, projectId, assigneeId, dueDate, tags } = req.body;

      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ message: 'Project not found.' });
      if (!(await isMember(req.user._id, project))) {
        return res.status(403).json({ message: 'Access denied.' });
      }

      const task = await Task.create({
        title, description,
        status:    status    || 'Todo',
        priority:  priority  || 'Medium',
        project:   projectId,
        assignee:  assigneeId || null,
        createdBy: req.user._id,
        dueDate:   dueDate   || null,
        tags:      tags      || [],
      });

      await task.populate('assignee', 'name email');
      await task.populate('createdBy','name email');
      res.status(201).json({ task });
    } catch {
      res.status(500).json({ message: 'Failed to create task.' });
    }
  }
);

// ── GET /api/tasks/:id ───────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee',      'name email')
      .populate('createdBy',     'name email')
      .populate('comments.user', 'name email')
      .populate('project',       'name color owner members');
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    res.json({ task });
  } catch {
    res.status(500).json({ message: 'Failed to fetch task.' });
  }
});

// ── PATCH /api/tasks/:id  (update task) ──────────────────────────────────────
router.patch('/:id', protect, async (req, res) => {
  try {
    const task    = await Task.findById(req.params.id).populate('project');
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const project = task.project;
    if (!(await isMember(req.user._id, project))) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Members can only change status (unless they created/are assigned the task)
    const isAdmin = project.owner.toString() === req.user._id.toString() ||
                    project.members.find(m => m.user.toString() === req.user._id.toString())?.role === 'Admin';
    const isInvolved = task.createdBy.toString() === req.user._id.toString() ||
                       task.assignee?.toString() === req.user._id.toString();

    if (!isAdmin && !isInvolved) {
      // allow only status change
      const keys = Object.keys(req.body).filter(k => k !== 'status');
      if (keys.length) return res.status(403).json({ message: 'Members can only update task status.' });
    }

    const allowed = ['title', 'description', 'status', 'priority', 'dueDate', 'tags'];
    allowed.forEach(f => { if (req.body[f] !== undefined) task[f] = req.body[f]; });
    if (req.body.assigneeId !== undefined) task.assignee = req.body.assigneeId || null;

    await task.save();
    await task.populate('assignee', 'name email');
    await task.populate('createdBy','name email');
    res.json({ task });
  } catch {
    res.status(500).json({ message: 'Failed to update task.' });
  }
});

// ── DELETE /api/tasks/:id  (Admin only) ──────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const task    = await Task.findById(req.params.id).populate('project');
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const project = task.project;
    const isAdmin = project.owner.toString() === req.user._id.toString() ||
                    project.members.find(m => m.user.toString() === req.user._id.toString())?.role === 'Admin';
    if (!isAdmin) return res.status(403).json({ message: 'Only Admins can delete tasks.' });

    await task.deleteOne();
    res.json({ message: 'Task deleted.' });
  } catch {
    res.status(500).json({ message: 'Failed to delete task.' });
  }
});

// ── POST /api/tasks/:id/comments ─────────────────────────────────────────────
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Comment text required.' });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    task.comments.push({ user: req.user._id, text: text.trim() });
    await task.save();
    await task.populate('comments.user', 'name email');
    res.json({ comments: task.comments });
  } catch {
    res.status(500).json({ message: 'Failed to add comment.' });
  }
});

module.exports = router;