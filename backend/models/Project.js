const mongoose = require('mongoose');

// Each project has an array of members with roles
const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['Admin', 'Member'], default: 'Member' },
  joinedAt: { type: Date, default: Date.now },
});

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name too long'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description too long'],
      default: '',
    },
    status: {
      type: String,
      enum: ['Planning', 'Active', 'On Hold', 'Completed'],
      default: 'Active',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    deadline: { type: Date, default: null },
    color:    { type: String, default: '#6366f1' },

    // The person who created the project — always has Admin rights
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // All collaborators (owner is also added here automatically)
    members: [memberSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);