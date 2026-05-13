const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const Project = require('../models/Project');

// ── 1. Verify JWT and attach user to req ─────────────────────────────────────
exports.protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided. Please log in.' });
    }

    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id);

    if (!user) return res.status(401).json({ message: 'User not found.' });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

// ── 2. Check the user is a member of the project ─────────────────────────────
//    Attaches req.project and req.userRole ('Admin' | 'Member')
exports.requireProjectMember = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id || req.query.projectId;
    const project   = await Project.findById(projectId);

    if (!project) return res.status(404).json({ message: 'Project not found.' });

    const isOwner  = project.owner.toString() === req.user._id.toString();
    const member   = project.members.find(m => m.user.toString() === req.user._id.toString());

    if (!isOwner && !member) {
      return res.status(403).json({ message: 'You are not a member of this project.' });
    }

    req.project  = project;
    req.userRole = isOwner ? 'Admin' : member.role;
    next();
  } catch (err) {
    res.status(500).json({ message: 'Error checking project membership.' });
  }
};

// ── 3. Require Admin role on the project ─────────────────────────────────────
exports.requireAdmin = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id || req.body.projectId;
    const project   = await Project.findById(projectId);

    if (!project) return res.status(404).json({ message: 'Project not found.' });

    const isOwner = project.owner.toString() === req.user._id.toString();
    const member  = project.members.find(m => m.user.toString() === req.user._id.toString());

    if (!isOwner && (!member || member.role !== 'Admin')) {
      return res.status(403).json({ message: 'Admin access required.' });
    }

    req.project  = project;
    req.userRole = 'Admin';
    next();
  } catch {
    res.status(500).json({ message: 'Error checking admin role.' });
  }
};