const Job = require('../models/Job');
const User = require('../models/User');
const Application = require('../models/Application');

const normalizeSkills = (skills) =>
  Array.isArray(skills)
    ? skills.map((skill) => String(skill).trim()).filter(Boolean)
    : String(skills || '')
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean);

const getJobs = async (req, res) => {
  try {
    const { search = '', location = '', category = '', jobType = '', minSalary = 0, page = 1, limit = 20 } = req.query;

    const query = {
      isActive: true,
      title: { $regex: search, $options: 'i' },
      location: { $regex: location, $options: 'i' },
      salary: { $gte: Number(minSalary) || 0 },
    };

    if (category) query.category = category;
    if (jobType) query.jobType = jobType;

    const skip = (Number(page) - 1) * Number(limit);

    const [jobs, totalJobs] = await Promise.all([
      Job.find(query).populate('postedBy', 'fullName email').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Job.countDocuments(query),
    ]);

    return res.json({
      success: true,
      count: jobs.length,
      totalJobs,
      totalPages: Math.ceil(totalJobs / Number(limit)),
      currentPage: Number(page),
      jobs,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('postedBy', 'fullName email');
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    return res.json({ success: true, job });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createJob = async (req, res) => {
  try {
    const { title, company, location, salary, description, jobType, category, skillsRequired, experience } = req.body;

    const job = await Job.create({
      title,
      company,
      location,
      salary,
      description,
      jobType,
      category,
      skillsRequired: normalizeSkills(skillsRequired),
      experience,
      postedBy: req.user._id,
    });

    req.user.postedJobs.push(job._id);
    await req.user.save();

    return res.status(201).json({ success: true, message: 'Job posted successfully', job });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can update only your own jobs' });
    }

    const updates = { ...req.body };
    if (updates.skillsRequired !== undefined) updates.skillsRequired = normalizeSkills(updates.skillsRequired);
    Object.assign(job, updates);
    await job.save();

    return res.json({ success: true, message: 'Job updated successfully', job });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can delete only your own jobs' });
    }

    await Application.deleteMany({ jobId: job._id });
    await User.updateMany(
      { $or: [{ savedJobs: job._id }, { appliedJobs: job._id }, { postedJobs: job._id }] },
      { $pull: { savedJobs: job._id, appliedJobs: job._id, postedJobs: job._id } }
    );
    await job.deleteOne();

    return res.json({ success: true, message: 'Job deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const applyForJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (job.hasUserApplied(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You already applied for this job' });
    }

    const application = await Application.create({ userId: req.user._id, jobId: job._id });
    job.applicants.push({ userId: req.user._id, appliedAt: application.appliedAt, status: application.status });
    await job.save();

    if (!req.user.appliedJobs.includes(job._id)) {
      req.user.appliedJobs.push(job._id);
      await req.user.save();
    }

    return res.status(201).json({ success: true, message: 'Application submitted successfully', application });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'You already applied for this job' });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

const saveJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    const alreadySaved = req.user.savedJobs.some((jobId) => jobId.toString() === job._id.toString());
    if (alreadySaved) {
      return res.status(400).json({ success: false, message: 'Job already saved' });
    }

    req.user.savedJobs.push(job._id);
    await req.user.save();
    return res.json({ success: true, message: 'Job saved successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const unsaveJob = async (req, res) => {
  try {
    req.user.savedJobs = req.user.savedJobs.filter((jobId) => jobId.toString() !== req.params.jobId);
    await req.user.save();
    return res.json({ success: true, message: 'Job removed from saved list' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getSavedJobs = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('savedJobs');
    return res.json({ success: true, jobs: user.savedJobs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const calculateJobMatch = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    const userSkills = (req.user.profile.skills || []).map((skill) => skill.toLowerCase());
    const requiredSkills = (job.skillsRequired || []).map((skill) => skill.toLowerCase());
    const matchedSkills = requiredSkills.filter((skill) => userSkills.includes(skill));
    const missingSkills = requiredSkills.filter((skill) => !userSkills.includes(skill));
    const matchPercentage = requiredSkills.length ? Math.round((matchedSkills.length / requiredSkills.length) * 100) : 0;

    let suggestion = 'Upskill needed before applying.';
    if (matchPercentage === 100) suggestion = 'Perfect match! You are ready to apply.';
    else if (matchPercentage >= 75) suggestion = `Strong fit. Improve these skills: ${missingSkills.join(', ')}`;
    else if (matchPercentage >= 50) suggestion = `Decent fit. Consider learning: ${missingSkills.join(', ')}`;

    return res.json({
      success: true,
      matchPercentage,
      matchedSkills: matchedSkills.length,
      totalRequired: requiredSkills.length,
      missingSkills,
      suggestion,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getApplicantsForJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('applicants.userId', 'fullName email phone profile');
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can view applicants only for your own jobs' });
    }
    return res.json({ success: true, applicants: job.applicants, jobTitle: job.title });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateApplicationStatus = async (req, res) => {
  try {
    const { jobId, userId } = req.params;
    const { status } = req.body;

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can update only your own applicants' });
    }

    await Application.findOneAndUpdate({ jobId, userId }, { status }, { new: true });
    const applicant = job.applicants.find((app) => app.userId.toString() === userId);
    if (applicant) applicant.status = status;
    await job.save();

    return res.json({ success: true, message: 'Application status updated successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getRecruiterJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ postedBy: req.user._id }).sort({ createdAt: -1 });
    return res.json({ success: true, jobs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  applyForJob,
  saveJob,
  unsaveJob,
  getSavedJobs,
  calculateJobMatch,
  getApplicantsForJob,
  updateApplicationStatus,
  getRecruiterJobs,
};
