require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');

const app = express();
connectDB();

app.use(cors({ origin: process.env.CORS_ORIGIN === '*' ? true : process.env.CORS_ORIGIN?.split(',') || true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

app.get('/', (_req, res) => {
  res.json({ success: true, message: 'JobHub API is running' });
});

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════╗');
  console.log('║     JobHub Backend Server Running     ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
