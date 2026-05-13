const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:      { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [2, 'Title too short'],
      maxlength: [200, 'Title too long'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description too long'],
      default: '',
    },
    status: {
      type: String,
      enum: ['Todo', 'In Progress', 'In Review', 'Done'],
      default: 'Todo',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    dueDate:     { type: Date, default: null },
    completedAt: { type: Date, default: null },
    tags:        [{ type: String, trim: true }],

    project:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    assignee:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',    default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },

    comments: [commentSchema],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual: is this task overdue?
taskSchema.virtual('isOverdue').get(function () {
  return this.dueDate && this.status !== 'Done' && new Date() > this.dueDate;
});

// Auto-stamp completedAt when status becomes Done
taskSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    if (this.status === 'Done' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== 'Done') {
      this.completedAt = null;
    }
  }
  next();
});

module.exports = mongoose.model('Task', taskSchema);