const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
 
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never returned in queries by default
    },
  },
  { timestamps: true }
);
 
// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
 
// Compare plain password with hash
userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};
 
// Helper: return safe user object (no password)
userSchema.methods.toSafeObject = function () {
  return {
    _id:       this._id,
    name:      this.name,
    email:     this.email,
    createdAt: this.createdAt,
  };
};
 
module.exports = mongoose.model('User', userSchema);
