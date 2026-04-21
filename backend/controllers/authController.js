const User = require('../models/User');
const generateToken = require('../utils/generateToken');

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const signup = async (req, res) => {
  try {
    const { fullName, email, phone, password, confirmPassword, role } = req.body;

    if (!fullName || !email || !phone || !password || !confirmPassword || !role) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters and include uppercase, lowercase, and number',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      phone,
      password,
      role,
      profile: { location: '', bio: '', skills: [], experience: 0 },
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token: generateToken(user._id),
      user: user.getPublicProfile(),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    return res.json({
      success: true,
      message: 'Login successful',
      token: generateToken(user._id),
      user: user.getPublicProfile(),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getProfile = async (req, res) => {
  return res.json({ success: true, user: req.user.getPublicProfile() });
};

const updateProfile = async (req, res) => {
  try {
    const { fullName, phone, location, bio, skills, experience } = req.body;

    if (fullName !== undefined) req.user.fullName = fullName;
    if (phone !== undefined) req.user.phone = phone;
    req.user.profile.location = location ?? req.user.profile.location;
    req.user.profile.bio = bio ?? req.user.profile.bio;
    req.user.profile.skills = Array.isArray(skills)
      ? skills
      : typeof skills === 'string'
      ? skills.split(',').map((skill) => skill.trim()).filter(Boolean)
      : req.user.profile.skills;
    if (experience !== undefined) req.user.profile.experience = Number(experience) || 0;

    await req.user.save();

    return res.json({ success: true, message: 'Profile updated successfully', user: req.user.getPublicProfile() });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const logout = async (_req, res) => {
  return res.json({ success: true, message: 'Logout successful' });
};

module.exports = { signup, login, getProfile, updateProfile, logout };
