const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: 3,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^[0-9]{10}$/, 'Phone number must be 10 digits'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ['job-seeker', 'recruiter'],
      required: true,
    },
    profile: {
      location: { type: String, default: '' },
      bio: { type: String, default: '' },
      skills: [{ type: String }],
      experience: { type: Number, default: 0 },
    },
    savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
    appliedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
    postedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
    resume: {
      fileName: { type: String, default: '' },
      uploadedAt: { type: Date },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.getPublicProfile = function () {
  return {
    _id: this._id,
    fullName: this.fullName,
    email: this.email,
    phone: this.phone,
    role: this.role,
    profile: this.profile,
    savedJobs: this.savedJobs,
    appliedJobs: this.appliedJobs,
    postedJobs: this.postedJobs,
    resume: this.resume,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('User', userSchema);
