/* ============================================
   JOBHUB - FRONTEND CONNECTED TO EXPRESS API
   ============================================ */

const host = window.location.hostname;
const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '';

const API_URL = isLocalHost
  ? 'http://localhost:5000/api'
  : 'https://recruitment-portal-1-1ulw.onrender.com/api';

let currentUser = null;
let allJobs = [];
let userApplications = [];
let userSavedJobs = [];
let allCompanies = [];
let currentPage = 'home';

const COMPANY_EMOJIS = ['💻', '📊', '🎨', '☁️', '📢', '💰', '🏢', '🚀'];

function authHeaders(includeJson = true) {
  const headers = {};
  const token = localStorage.getItem('token');
  if (includeJson) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function apiFetch(endpoint, options = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${endpoint}`, options);
  } catch (_networkError) {
    throw new Error('Unable to connect to server. Check backend URL, CORS, and internet connection.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

document.addEventListener('DOMContentLoaded', async function () {
  initializeApp();
  setupEventListeners();
  showPage('home');
  await restoreSession();
  await Promise.all([loadJobsFromAPI(), buildCompaniesFromJobs()]);
  renderFeaturedJobs();
  animateCounters();
});

function initializeApp() {
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    document.getElementById('darkModeToggle').textContent = '☀️';
  }

  const cachedUser = localStorage.getItem('currentUser');
  if (cachedUser) {
    currentUser = JSON.parse(cachedUser);
    updateNavbar();
  }

  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('navMenu');
  if (hamburger) {
    hamburger.addEventListener('click', function () {
      this.classList.toggle('active');
      navMenu.classList.toggle('active');
    });
  }
}

async function restoreSession() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const data = await apiFetch('/auth/profile', {
      method: 'GET',
      headers: authHeaders(false),
    });
    currentUser = data.user;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    updateNavbar();
  } catch (_error) {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    currentUser = null;
    updateNavbar();
  }
}

function setupEventListeners() {
  document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);

  const resumeUploadArea = document.getElementById('resumeUploadArea');
  if (resumeUploadArea) {
    resumeUploadArea.addEventListener('click', () => {
      document.getElementById('resumeFile').click();
    });

    resumeUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      resumeUploadArea.style.borderColor = 'var(--primary-color)';
    });

    resumeUploadArea.addEventListener('dragleave', () => {
      resumeUploadArea.style.borderColor = 'var(--border-color)';
    });

    resumeUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      resumeUploadArea.style.borderColor = 'var(--border-color)';
      const files = e.dataTransfer.files;
      handleResumeUpload(files[0]);
    });

    document.getElementById('resumeFile').addEventListener('change', (e) => {
      handleResumeUpload(e.target.files[0]);
    });
  }
}

function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const isDarkMode = document.body.classList.contains('dark-mode');
  document.getElementById('darkModeToggle').textContent = isDarkMode ? '☀️' : '🌙';
  localStorage.setItem('darkMode', isDarkMode);
}

async function navigateTo(page) {
  if ((page === 'profile' || page === 'dashboard') && !currentUser) {
    navigateTo('login');
    return;
  }

  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));

  const pageId = page === 'dashboard' ? 'dashboardPage' : page === 'profile' ? 'dashboardPage' : `${page}Page`;
  const pageElement = document.getElementById(pageId);
  if (pageElement) pageElement.classList.add('active');
  currentPage = page;

  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('navMenu');
  if (hamburger) {
    hamburger.classList.remove('active');
    navMenu.classList.remove('active');
  }

  if (page === 'jobs') {
    await loadJobsFromAPI();
    renderJobsList();
  } else if (page === 'companies') {
    await buildCompaniesFromJobs();
    renderCompaniesList();
  } else if (page === 'dashboard' || page === 'profile') {
    await loadDashboard();
    switchDashboardTab('my-profile');
  } else if (page === 'home') {
    await loadJobsFromAPI();
    renderFeaturedJobs();
  }

  window.scrollTo(0, 0);
}

function updateNavbar() {
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const profileBtn = document.getElementById('profileBtn');
  const userNameDisplay = document.getElementById('userNameDisplay');

  if (currentUser) {
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'block';
    profileBtn.style.display = 'block';
    userNameDisplay.style.display = 'inline';
    userNameDisplay.textContent = currentUser.fullName.split(' ')[0];
  } else {
    loginBtn.style.display = 'block';
    logoutBtn.style.display = 'none';
    profileBtn.style.display = 'none';
    userNameDisplay.style.display = 'none';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  clearErrors();

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email) return showError('loginEmailError', 'Email is required');
  if (!password) return showError('loginPasswordError', 'Password is required');

  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ email, password }),
    });

    localStorage.setItem('token', data.token);
    localStorage.setItem('currentUser', JSON.stringify(data.user));
    currentUser = data.user;
    updateNavbar();
    document.getElementById('loginForm').reset();
    showNotification('Login successful!', 'success');
    await navigateTo('home');
  } catch (error) {
    showError('loginPasswordError', error.message);
    showNotification(error.message, 'error');
  }
}

async function handleSignup(e) {
  e.preventDefault();
  clearErrors();

  const fullName = document.getElementById('signupFullName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const phone = document.getElementById('signupPhone').value.trim();
  const role = document.getElementById('signupRole').value;
  const password = document.getElementById('signupPassword').value;
  const confirmPassword = document.getElementById('signupConfirmPassword').value;

  let isValid = true;
  if (!fullName || fullName.length < 3) {
    showError('signupNameError', 'Full name must be at least 3 characters');
    isValid = false;
  }
  if (!validateEmail(email)) {
    showError('signupEmailError', 'Please enter a valid email');
    isValid = false;
  }
  if (!validatePhone(phone)) {
    showError('signupPhoneError', 'Please enter a valid 10-digit phone number');
    isValid = false;
  }
  if (!role) {
    showError('signupRoleError', 'Please select a role');
    isValid = false;
  }
  if (!validatePassword(password)) {
    showError('signupPasswordError', 'Password must be at least 8 characters with uppercase, lowercase, and number');
    isValid = false;
  }
  if (password !== confirmPassword) {
    showError('signupConfirmError', 'Passwords do not match');
    isValid = false;
  }
  if (!isValid) return;

  try {
    const data = await apiFetch('/auth/signup', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ fullName, email, phone, password, confirmPassword, role }),
    });

    localStorage.setItem('token', data.token);
    localStorage.setItem('currentUser', JSON.stringify(data.user));
    currentUser = data.user;
    updateNavbar();
    document.getElementById('signupForm').reset();
    showNotification('Account created successfully!', 'success');
    await navigateTo('home');
  } catch (error) {
    showNotification(error.message, 'error');
    showError('signupEmailError', error.message);
  }
}

function handleForgotPassword(e) {
  e.preventDefault();
  const email = document.getElementById('forgotEmail').value.trim();
  if (!validateEmail(email)) {
    showError('forgotEmailError', 'Please enter a valid email');
    return;
  }
  document.getElementById('forgotPasswordForm').style.display = 'none';
  document.getElementById('resetSuccessMessage').style.display = 'block';
  showNotification('Forgot password email flow is not added in backend yet', 'warning');
}

async function logoutUser() {
  try {
    if (localStorage.getItem('token')) {
      await apiFetch('/auth/logout', { method: 'POST', headers: authHeaders(false) });
    }
  } catch (_error) {
    // ignore logout API failure
  }

  currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
  userApplications = [];
  userSavedJobs = [];
  updateNavbar();
  showNotification('Logged out successfully', 'success');
  navigateTo('home');
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  return /^[0-9]{10}$/.test(phone.replace(/\D/g, ''));
}

function validatePassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
}

function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  const toggle = input.nextElementSibling;
  if (input.type === 'password') {
    input.type = 'text';
    toggle.textContent = '🙈';
  } else {
    input.type = 'password';
    toggle.textContent = '👁️';
  }
}

function checkPasswordStrength(password) {
  const strengthFill = document.getElementById('passwordStrengthFill');
  const strengthText = document.getElementById('passwordStrengthText');
  if (!strengthFill || !strengthText) return;

  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  const percentages = ['0%', '20%', '40%', '60%', '80%', '100%'];
  const texts = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a', '#15803d'];

  strengthFill.style.width = percentages[strength];
  strengthFill.style.backgroundColor = colors[strength];
  strengthText.textContent = texts[strength];
}

function showError(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = message;
}

function clearErrors() {
  document.querySelectorAll('.error-message').forEach((el) => {
    el.textContent = '';
  });
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  Object.assign(notification.style, {
    position: 'fixed',
    top: '90px',
    right: '20px',
    padding: '12px 18px',
    borderRadius: '8px',
    color: '#fff',
    zIndex: '9999',
    fontWeight: '600',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
    backgroundColor:
      type === 'success' ? '#16a34a' :
      type === 'error' ? '#dc2626' :
      type === 'warning' ? '#d97706' : '#2563eb'
  });

  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

function showPage(page) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  const pageElement = document.getElementById(`${page}Page`);
  if (pageElement) pageElement.classList.add('active');
  currentPage = page;
}

function normalizeJob(job) {
  return {
    ...job,
    id: job._id || job.id,
    applicants: job.applicants || [],
  };
}

async function loadJobsFromAPI() {
  try {
    const data = await apiFetch('/jobs');
    allJobs = (data.jobs || []).map(normalizeJob);
  } catch (_error) {
    allJobs = [];
  }
}

async function buildCompaniesFromJobs() {
  const companyMap = new Map();

  allJobs.forEach((job, index) => {
    if (!companyMap.has(job.company)) {
      companyMap.set(job.company, {
        name: job.company,
        industry: job.category || 'Technology',
        location: job.location,
        logo: COMPANY_EMOJIS[index % COMPANY_EMOJIS.length],
        openings: 1,
      });
    } else {
      companyMap.get(job.company).openings += 1;
    }
  });

  allCompanies = Array.from(companyMap.values());
}

function renderFeaturedJobs() {
  const container = document.getElementById('featuredJobs');
  if (!container) return;

  const jobs = allJobs.slice(0, 6);
  container.innerHTML = jobs.map((job) => createJobCard(job)).join('');
}

function renderJobsList() {
  const container = document.getElementById('jobsList');
  if (!container) return;

  let filteredJobs = [...allJobs];

  const title = document.getElementById('filterSearch')?.value?.toLowerCase() || '';
  const location = document.getElementById('filterLocation')?.value || '';
  const type = document.getElementById('filterType')?.value || '';

  if (title) {
    filteredJobs = filteredJobs.filter((job) =>
      job.title.toLowerCase().includes(title) ||
      job.company.toLowerCase().includes(title)
    );
  }
  if (location) {
    filteredJobs = filteredJobs.filter((job) => job.location === location);
  }
  if (type) {
    filteredJobs = filteredJobs.filter((job) => job.jobType === type);
  }

  container.innerHTML = filteredJobs.length
    ? filteredJobs.map((job) => createJobListItem(job)).join('')
    : '<p>No jobs found.</p>';
}

function renderCompaniesList() {
  const container = document.getElementById('companiesList');
  if (!container) return;

  container.innerHTML = allCompanies.length
    ? allCompanies.map((company) => `
      <div class="company-card">
        <div class="company-logo">${company.logo}</div>
        <h3>${company.name}</h3>
        <p>${company.industry}</p>
        <p>📍 ${company.location}</p>
        <p><strong>${company.openings}</strong> Open positions</p>
      </div>
    `).join('')
    : '<p>No companies found.</p>';
}

function createJobCard(job) {
  return `
    <div class="job-card">
      <h3>${job.title}</h3>
      <p><strong>${job.company}</strong></p>
      <p>📍 ${job.location}</p>
      <p>💼 ${job.jobType}</p>
      <p>💰 ${formatSalary(job.salary || 0)}</p>
      <button class="btn-primary" onclick="openJobModal('${job.id}')">View Details</button>
    </div>
  `;
}

function createJobListItem(job) {
  return `
    <div class="job-list-item">
      <div style="display:flex; justify-content:space-between; gap:20px; flex-wrap:wrap;">
        <div style="flex:1;">
          <h3 style="margin:0 0 8px 0;">${job.title}</h3>
          <p style="margin:0 0 8px 0;"><strong>${job.company}</strong></p>
          <div style="display:flex; flex-wrap:wrap; gap:10px;">
            <span class="job-badge location">📍 ${job.location}</span>
            <span class="job-badge salary">💰 ${formatSalary(job.salary || 0)}</span>
            <span class="job-badge">${job.jobType}</span>
          </div>
        </div>
        <div>
          <button class="btn-primary btn-small" onclick="openJobModal('${job.id}')">View</button>
        </div>
      </div>
    </div>
  `;
}

function openJobModal(jobId) {
  const job = allJobs.find((j) => j.id === jobId);
  if (!job) return;

  const modal = document.getElementById('jobModal');
  const content = document.getElementById('jobModalContent');

  if (!modal || !content) return;

  content.innerHTML = `
    <h2>${job.title}</h2>
    <p><strong>Company:</strong> ${job.company}</p>
    <p><strong>Location:</strong> ${job.location}</p>
    <p><strong>Type:</strong> ${job.jobType}</p>
    <p><strong>Salary:</strong> ${formatSalary(job.salary || 0)}</p>
    <p><strong>Experience:</strong> ${job.experience || 0} years</p>
    <p><strong>Category:</strong> ${job.category || 'General'}</p>
    <p><strong>Description:</strong> ${job.description || 'No description available'}</p>
    <p><strong>Skills:</strong> ${job.skillsRequired || 'Not specified'}</p>
    ${
      currentUser && currentUser.role === 'job-seeker'
        ? `<button class="btn-primary" onclick="applyForJob('${job.id}')">Apply Now</button>`
        : ''
    }
  `;
  modal.style.display = 'flex';
}

function closeJobModal() {
  const modal = document.getElementById('jobModal');
  if (modal) modal.style.display = 'none';
}

async function applyForJob(jobId) {
  if (!currentUser) {
    showNotification('Please login first', 'warning');
    navigateTo('login');
    return;
  }

  try {
    await apiFetch(`/jobs/apply/${jobId}`, {
      method: 'POST',
      headers: authHeaders(false),
    });
    showNotification('Applied successfully!', 'success');
    closeJobModal();
    await loadAppliedJobs();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

async function loadDashboard() {
  if (!currentUser) return;

  document.getElementById('dashboardWelcome').textContent = `Welcome, ${currentUser.fullName}`;
  document.getElementById('profileFullName').value = currentUser.fullName || '';
  document.getElementById('profileEmail').value = currentUser.email || '';
  document.getElementById('profilePhone').value = currentUser.phone || '';
  document.getElementById('profileRole').value = currentUser.role || '';

  if (currentUser.role === 'job-seeker') {
    document.getElementById('jobSeekerDashboard').style.display = 'block';
    document.getElementById('recruiterDashboard').style.display = 'none';
    await loadAppliedJobs();
    await loadSavedJobs();
  } else {
    document.getElementById('jobSeekerDashboard').style.display = 'none';
    document.getElementById('recruiterDashboard').style.display = 'block';
    await loadManagedJobs();
    await loadApplicants();
  }
}

function switchDashboardTab(tabName) {
  document.querySelectorAll('.dashboard-tab').forEach((tab) => tab.classList.remove('active'));
  document.querySelectorAll('.dashboard-content').forEach((content) => content.classList.remove('active'));

  const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
  const tabContent = document.getElementById(`${tabName}Content`);

  if (tabButton) tabButton.classList.add('active');
  if (tabContent) tabContent.classList.add('active');
}

async function loadAppliedJobs() {
  const container = document.getElementById('appliedJobsList');
  if (!container || !currentUser || currentUser.role !== 'job-seeker') return;

  userApplications = [];
  allJobs.forEach((job) => {
    const applicant = (job.applicants || []).find((app) => app.userId === currentUser._id || app.userId?._id === currentUser._id);
    if (applicant) {
      userApplications.push({ jobId: job.id, status: applicant.status || 'pending', appliedAt: applicant.appliedAt });
    }
  });

  if (!userApplications.length) {
    document.getElementById('noAppliedJobs').style.display = 'block';
    container.innerHTML = '';
    return;
  }

  document.getElementById('noAppliedJobs').style.display = 'none';
  const appliedJobsHTML = userApplications.map((app) => {
    const job = allJobs.find((j) => j.id === app.jobId);
    return job ? createJobListItem(job) : '';
  }).join('');
  container.innerHTML = appliedJobsHTML;
}

async function loadSavedJobs() {
  const container = document.getElementById('savedJobsList');
  if (!container || !currentUser || currentUser.role !== 'job-seeker') return;

  try {
    const data = await apiFetch('/jobs/saved', { method: 'GET', headers: authHeaders(false) });
    userSavedJobs = (data.jobs || []).map(normalizeJob);

    if (!userSavedJobs.length) {
      document.getElementById('noSavedJobs').style.display = 'block';
      container.innerHTML = '';
      return;
    }

    document.getElementById('noSavedJobs').style.display = 'none';
    container.innerHTML = userSavedJobs.map((job) => createJobListItem(job)).join('');
  } catch (_error) {
    userSavedJobs = [];
    container.innerHTML = '';
  }
}

async function handlePostJob(e) {
  e.preventDefault();

  try {
    await apiFetch('/jobs', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        title: document.getElementById('jobTitle').value,
        company: document.getElementById('jobCompany').value,
        location: document.getElementById('jobLocation').value,
        jobType: document.getElementById('jobType').value,
        salary: Number(document.getElementById('jobSalary').value),
        experience: Number(document.getElementById('jobExperience').value),
        category: document.getElementById('jobCategory').value,
        skillsRequired: document.getElementById('jobSkills').value,
        description: document.getElementById('jobDescription').value,
      }),
    });

    document.getElementById('postJobForm').reset();
    document.getElementById('postJobSuccess').style.display = 'block';
    setTimeout(() => document.getElementById('postJobSuccess').style.display = 'none', 3000);
    showNotification('Job posted successfully!', 'success');
    await loadJobsFromAPI();
    await loadManagedJobs();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

async function loadManagedJobs() {
  const container = document.getElementById('managedJobsList');
  if (!container || !currentUser || currentUser.role !== 'recruiter') return;

  try {
    const data = await apiFetch('/jobs/my-posted', { method: 'GET', headers: authHeaders(false) });
    const myJobs = (data.jobs || []).map(normalizeJob);

    if (!myJobs.length) {
      document.getElementById('noManagedJobs').style.display = 'block';
      container.innerHTML = '';
      return;
    }

    document.getElementById('noManagedJobs').style.display = 'none';
    container.innerHTML = myJobs.map((job) => `
      <div class="job-list-item">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div style="flex: 1;">
            <h3 style="margin: 0 0 5px 0;">${job.title}</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
              <span class="job-badge location">📍 ${job.location}</span>
              <span class="job-badge salary">💰 ₹${Number(job.salary).toLocaleString()}</span>
              <span class="job-badge">${job.jobType}</span>
            </div>
          </div>
          <div><button class="btn-danger-small" onclick="deleteJob('${job.id}')">Delete</button></div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

async function deleteJob(jobId) {
  if (!confirm('Are you sure you want to delete this job?')) return;
  try {
    await apiFetch(`/jobs/${jobId}`, { method: 'DELETE', headers: authHeaders(false) });
    showNotification('Job deleted successfully', 'success');
    await loadJobsFromAPI();
    await loadManagedJobs();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

async function loadApplicants() {
  const container = document.getElementById('applicantsList');
  if (!container || !currentUser || currentUser.role !== 'recruiter') return;

  try {
    const jobsData = await apiFetch('/jobs/my-posted', { method: 'GET', headers: authHeaders(false) });
    const jobs = jobsData.jobs || [];
    const applicantBlocks = [];

    for (const job of jobs) {
      const applicantsData = await apiFetch(`/jobs/${job._id}/applicants`, { method: 'GET', headers: authHeaders(false) });
      (applicantsData.applicants || []).forEach((app) => {
        const user = app.userId || {};
        applicantBlocks.push(`
          <div class="applicant-card">
            <div class="applicant-name">${user.fullName || 'Applicant'}</div>
            <div class="applicant-info">
              <strong>Email:</strong> ${user.email || '-'}<br>
              <strong>Applied for:</strong> ${applicantsData.jobTitle}<br>
              <strong>Applied on:</strong> ${new Date(app.appliedAt).toLocaleDateString()}<br>
              <strong>Status:</strong> ${app.status}
            </div>
            <div class="applicant-actions">
              <button class="btn-primary btn-small" onclick="updateApplicantStatus('${job._id}','${user._id}','accepted')">Accept</button>
              <button class="btn-secondary btn-small" onclick="updateApplicantStatus('${job._id}','${user._id}','rejected')">Reject</button>
            </div>
          </div>
        `);
      });
    }

    if (!applicantBlocks.length) {
      document.getElementById('noApplicants').style.display = 'block';
      container.innerHTML = '';
      return;
    }

    document.getElementById('noApplicants').style.display = 'none';
    container.innerHTML = applicantBlocks.join('');
  } catch (_error) {
    container.innerHTML = '';
  }
}

async function updateApplicantStatus(jobId, userId, status) {
  try {
    await apiFetch(`/jobs/${jobId}/applicants/${userId}/status`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
    showNotification(`Application ${status}`, 'success');
    await loadApplicants();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

function handleResumeUpload(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showNotification('File size must be less than 5MB', 'error');
    return;
  }
  document.getElementById('resumeUploadArea').style.display = 'none';
  document.getElementById('uploadedResume').style.display = 'block';
  showNotification('Resume upload UI is ready. File storage backend is not added yet.', 'warning');
  setTimeout(() => {
    document.getElementById('resumeUploadArea').style.display = 'block';
    document.getElementById('uploadedResume').style.display = 'none';
    document.getElementById('resumeFile').value = '';
  }, 2000);
}

function handleContactForm(e) {
  e.preventDefault();
  const success = document.getElementById('contactSuccess');
  success.style.display = 'block';
  showNotification('Contact form stored only on frontend right now', 'warning');
  setTimeout(() => {
    success.style.display = 'none';
    e.target.reset();
  }, 3000);
}

function animateCounters() {
  const counters = document.querySelectorAll('[data-target]');
  counters.forEach((counter) => {
    const target = parseInt(counter.getAttribute('data-target'), 10);
    const increment = target / 100;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        counter.textContent = target.toLocaleString();
        clearInterval(timer);
      } else {
        counter.textContent = Math.floor(current).toLocaleString();
      }
    }, 20);
  });
}

function typeWriter(element, text, speed = 50) {
  let i = 0;
  element.textContent = '';
  function type() {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i++;
      setTimeout(type, speed);
    }
  }
  type();
}

document.addEventListener('click', function () {
  if (currentPage === 'home') {
    const heroTitle = document.getElementById('heroTitle');
    if (heroTitle && heroTitle.textContent === '') {
      typeWriter(heroTitle, 'Find Your Dream Job Today');
    }
  }
});

function showLoadingAnimation() {
  return `
    <div style="display: flex; justify-content: center; align-items: center; min-height: 200px;">
      <div style="width: 50px; height: 50px; border: 5px solid var(--border-color); border-top-color: var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite;"></div>
    </div>
  `;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatSalary(salary) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(salary);
}

document.addEventListener('keydown', function (e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const searchInput = document.getElementById('filterSearch') || document.getElementById('searchJobTitle');
    if (searchInput) searchInput.focus();
  }
  if (e.key === 'Escape') closeJobModal();
});

const style = document.createElement('style');
style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(style);

console.log('JobHub Application Initialized Successfully');
