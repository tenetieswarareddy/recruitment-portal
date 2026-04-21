require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Job = require('../models/Job');
const User = require('../models/User');

const seedJobs = async () => {
  await connectDB();

  let recruiter = await User.findOne({ email: 'recruiter@jobhub.com' });
  if (!recruiter) {
    recruiter = await User.create({
      fullName: 'Default Recruiter',
      email: 'recruiter@jobhub.com',
      phone: '9876543210',
      password: 'Recruiter123',
      role: 'recruiter',
    });
  }

  await Job.deleteMany({});

  const jobs = [
    {
      title: 'Senior Frontend Developer', company: 'Tech Solutions Inc', location: 'Bangalore, India', salary: 80000,
      description: 'Looking for an experienced frontend developer with expertise in React and modern web technologies.',
      jobType: 'Full Time', category: 'Technology', skillsRequired: ['React', 'JavaScript', 'CSS', 'HTML'], experience: 3, postedBy: recruiter._id,
    },
    {
      title: 'Data Scientist', company: 'Analytics Pro', location: 'Mumbai, India', salary: 90000,
      description: 'Seeking a talented data scientist to analyze complex datasets and develop ML models.',
      jobType: 'Full Time', category: 'Technology', skillsRequired: ['Python', 'Machine Learning', 'SQL', 'Pandas'], experience: 2, postedBy: recruiter._id,
    },
    {
      title: 'UX Designer', company: 'Creative Design Studio', location: 'Remote', salary: 60000,
      description: 'Join our creative team to design amazing user experiences.',
      jobType: 'Remote', category: 'Marketing', skillsRequired: ['Figma', 'UI Design', 'User Research', 'Prototyping'], experience: 1, postedBy: recruiter._id,
    },
    {
      title: 'Backend Developer', company: 'Cloud Systems', location: 'Hyderabad, India', salary: 75000,
      description: 'Build scalable backend systems using modern technologies.',
      jobType: 'Full Time', category: 'Technology', skillsRequired: ['Node.js', 'Python', 'AWS', 'Docker'], experience: 2, postedBy: recruiter._id,
    },
    {
      title: 'Marketing Manager', company: 'Brand Marketing Ltd', location: 'Delhi, India', salary: 55000,
      description: 'Lead marketing strategies and campaigns for our growing business.',
      jobType: 'Full Time', category: 'Marketing', skillsRequired: ['Marketing', 'Leadership', 'Analytics', 'Communication'], experience: 3, postedBy: recruiter._id,
    },
    {
      title: 'Financial Analyst', company: 'Finance Corp', location: 'Pune, India', salary: 70000,
      description: 'Analyze financial data and provide insights for business decisions.',
      jobType: 'Full Time', category: 'Finance', skillsRequired: ['Excel', 'Financial Analysis', 'Reporting', 'SAP'], experience: 2, postedBy: recruiter._id,
    }
  ];

  const createdJobs = await Job.insertMany(jobs);
  recruiter.postedJobs = createdJobs.map((job) => job._id);
  await recruiter.save();

  console.log('Sample jobs seeded successfully');
  await mongoose.connection.close();
};

seedJobs().catch((error) => {
  console.error(error);
  process.exit(1);
});
