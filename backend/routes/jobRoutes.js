const express = require('express');
const {
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
} = require('../controllers/jobController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getJobs);
router.get('/saved', protect, getSavedJobs);
router.get('/my-posted', protect, authorize('recruiter'), getRecruiterJobs);
router.get('/:id', getJobById);
router.get('/:id/applicants', protect, authorize('recruiter'), getApplicantsForJob);

router.post('/', protect, authorize('recruiter'), createJob);
router.put('/:id', protect, authorize('recruiter'), updateJob);
router.delete('/:id', protect, authorize('recruiter'), deleteJob);

router.post('/apply/:jobId', protect, authorize('job-seeker'), applyForJob);
router.post('/save/:jobId', protect, authorize('job-seeker'), saveJob);
router.delete('/save/:jobId', protect, authorize('job-seeker'), unsaveJob);
router.post('/match/:jobId', protect, calculateJobMatch);
router.put('/:jobId/applicants/:userId/status', protect, authorize('recruiter'), updateApplicationStatus);

module.exports = router;
