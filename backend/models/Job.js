const mongoose = require('mongoose');

const applicantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    appliedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  { _id: false }
);

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    salary: { type: Number, required: true, min: 0 },
    description: { type: String, required: true },
    jobType: {
      type: String,
      enum: ['Full Time', 'Part Time', 'Remote'],
      required: true,
    },
    category: {
      type: String,
      enum: ['Technology', 'Finance', 'Healthcare', 'Marketing', 'Sales', 'HR', 'Human Resources'],
      required: true,
    },
    skillsRequired: [{ type: String, required: true }],
    experience: { type: Number, required: true, min: 0 },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    applicants: [applicantSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

jobSchema.methods.hasUserApplied = function (userId) {
  return this.applicants.some((applicant) => applicant.userId.toString() === userId.toString());
};

module.exports = mongoose.model('Job', jobSchema);
