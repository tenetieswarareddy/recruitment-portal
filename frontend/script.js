/* ============================================
   JOBHUB - FRONTEND CONNECTED TO EXPRESS API
   ============================================ */

const API_URL = "https://recruitment-portal-1-1ulw.onrender.com";

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
  const response = await fetch(`${API_URL}${endpoint}`, options);
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
  input.type = input.type === 'password' ? 'text' : 'password';
}

document.addEventListener('input', function (e) {
  if (e.target.id === 'signupPassword') {
    const password = e.target.value;
    const strengthEl = document.getElementById('passwordStrength');
    if (!password) {
      strengthEl.className = 'password-strength';
      return;
    }

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;

    strengthEl.className = 'password-strength';
    if (strength <= 1) strengthEl.classList.add('weak');
    else if (strength === 2) strengthEl.classList.add('medium');
    else strengthEl.classList.add('strong');
  }
});

function showError(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
    element.classList.add('show');
  }
}

function clearErrors() {
  document.querySelectorAll('.error-message').forEach((el) => {
    el.classList.remove('show');
    el.textContent = '';
  });
}

function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification show ${type}`;
  setTimeout(() => notification.classList.remove('show'), 3000);
}

function showPage(page) {
  navigateTo(page);
}

async function loadJobsFromAPI() {
  try {
    const data = await apiFetch('/jobs');
    allJobs = (data.jobs || []).map(normalizeJob);
  } catch (error) {
    showNotification(`Failed to load jobs: ${error.message}`, 'error');
    allJobs = [];
  }
}

function normalizeJob(job) {
  return {
    id: job._id,
    title: job.title,
    company: job.company,
    location: job.location,
    salary: job.salary,
    description: job.description,
    jobType: job.jobType,
    category: job.category,
    skills: job.skillsRequired || [],
    experience: job.experience,
    postedDate: job.createdAt,
    postedBy: job.postedBy?._id || job.postedBy,
    applicants: job.applicants || [],
  };
}

async function buildCompaniesFromJobs() {
  const companyMap = new Map();
  allJobs.forEach((job, index) => {
    if (!companyMap.has(job.company)) {
      companyMap.set(job.company, {
        id: job.company,
        name: job.company,
        logo: COMPANY_EMOJIS[index % COMPANY_EMOJIS.length],
        openJobs: 1,
        employees: 50 + index * 25,
      });
    } else {
      companyMap.get(job.company).openJobs += 1;
    }
  });
  allCompanies = Array.from(companyMap.values());
}

function renderFeaturedJobs() {
  const container = document.getElementById('featuredJobs');
  if (!container) return;
  const featured = allJobs.slice(0, 3);
  container.innerHTML = featured.map((job) => createJobCard(job)).join('');
}

function renderJobsList(jobsToDisplay = allJobs) {
  const container = document.getElementById('jobsList');
  if (!container) return;

  if (!jobsToDisplay.length) {
    document.getElementById('noJobsMessage').style.display = 'block';
    container.innerHTML = '';
    return;
  }

  document.getElementById('noJobsMessage').style.display = 'none';
  container.innerHTML = jobsToDisplay.map((job) => createJobListItem(job)).join('');
}

function createJobCard(job) {
  const isSaved = currentUser && userSavedJobs.some((saved) => saved.id === job.id);
  const isApplied = currentUser && userApplications.some((app) => app.jobId === job.id);

  return `
    <div class="job-card" onclick="openJobModal('${job.id}')">
      <div class="job-card-header">
        <div>
          <h3 class="job-card-title">${job.title}</h3>
          <p class="job-card-company">${job.company}</p>
        </div>
        <button class="save-job-btn ${isSaved ? 'saved' : ''}" onclick="event.stopPropagation(); toggleSaveJob('${job.id}', this)">💔</button>
      </div>
      <div class="job-card-meta">
        <span class="job-badge location">📍 ${job.location}</span>
        <span class="job-badge salary">💰 ₹${Number(job.salary).toLocaleString()}</span>
        <span class="job-badge">${job.jobType}</span>
      </div>
      <p class="job-description">${job.description.substring(0, 100)}...</p>
      <div class="job-skills">
        ${job.skills.slice(0, 3).map((skill) => `<span class="skill-tag">${skill}</span>`).join('')}
      </div>
      <div class="job-card-footer">
        <span style="color: var(--text-light); font-size: 0.85rem;">${new Date(job.postedDate).toLocaleDateString()}</span>
        <button class="job-apply-btn ${isApplied ? 'applied' : ''}" onclick="event.stopPropagation(); applyForJob('${job.id}')">${isApplied ? '✓ Applied' : 'Apply Now'}</button>
      </div>
    </div>
  `;
}

function createJobListItem(job) {
  const isSaved = currentUser && userSavedJobs.some((saved) => saved.id === job.id);
  const isApplied = currentUser && userApplications.some((app) => app.jobId === job.id);

  return `
    <div class="job-list-item" onclick="openJobModal('${job.id}')">
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <div style="flex: 1;">
          <h3 style="margin: 0 0 5px 0;">${job.title}</h3>
          <p style="margin: 0 0 10px 0; color: var(--text-light);">${job.company}</p>
          <div style="display: flex; flex-wrap: wrap; gap: 10px;">
            <span class="job-badge location">📍 ${job.location}</span>
            <span class="job-badge salary">💰 ₹${Number(job.salary).toLocaleString()}</span>
            <span class="job-badge">${job.jobType}</span>
          </div>
        </div>
        <div>
          <button class="save-job-btn ${isSaved ? 'saved' : ''}" onclick="event.stopPropagation(); toggleSaveJob('${job.id}', this)">💔</button>
        </div>
      </div>
      <button class="job-apply-btn ${isApplied ? 'applied' : ''}" style="margin-top: 10px; width: 100%;" onclick="event.stopPropagation(); applyForJob('${job.id}')">${isApplied ? '✓ Applied' : 'Apply Now'}</button>
    </div>
  `;
}

function openJobModal(jobId) {
  const job = allJobs.find((j) => j.id === jobId);
  if (!job) return;

  const modalBody = document.getElementById('jobModalBody');
  const isSaved = currentUser && userSavedJobs.some((saved) => saved.id === job.id);
  const isApplied = currentUser && userApplications.some((app) => app.jobId === job.id);

  modalBody.innerHTML = `
    <div>
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
        <div>
          <h2 style="margin: 0;">${job.title}</h2>
          <p style="margin: 10px 0 0 0; color: var(--text-light); font-size: 1.1rem;">${job.company}</p>
        </div>
        <button class="save-job-btn ${isSaved ? 'saved' : ''}" onclick="toggleSaveJob('${job.id}', this); updateModal('${job.id}')" style="font-size: 1.8rem; cursor: pointer;">💔</button>
      </div>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px;">
        <div><strong>Location:</strong><br><span class="job-badge location">📍 ${job.location}</span></div>
        <div><strong>Salary:</strong><br><span class="job-badge salary">💰 ₹${Number(job.salary).toLocaleString()}/year</span></div>
        <div><strong>Job Type:</strong><br><span class="job-badge">${job.jobType}</span></div>
        <div><strong>Experience:</strong><br><span class="job-badge">${job.experience} years</span></div>
      </div>
      <h3>Description</h3>
      <p>${job.description}</p>
      <h3>Required Skills</h3>
      <div class="job-skills" style="margin-bottom: 20px;">
        ${job.skills.map((skill) => `<span class="skill-tag">${skill}</span>`).join('')}
      </div>
      <button class="job-apply-btn ${isApplied ? 'applied' : ''}" style="width: 100%; padding: 15px; font-size: 1rem;" onclick="applyForJob('${job.id}'); closeJobModal()">${isApplied ? '✓ Already Applied' : 'Apply Now'}</button>
    </div>
  `;

  document.getElementById('jobModal').classList.add('active');
}

function updateModal(jobId) {
  openJobModal(jobId);
}

function closeJobModal() {
  document.getElementById('jobModal').classList.remove('active');
}

document.getElementById('jobModal').addEventListener('click', function (e) {
  if (e.target === this) closeJobModal();
});

function applyFilters() {
  const searchText = document.getElementById('filterSearch').value.toLowerCase();
  const location = document.getElementById('filterLocation').value.toLowerCase();
  const salary = parseInt(document.getElementById('filterSalary').value, 10);
  const category = document.getElementById('filterCategory').value;
  const fullTime = document.getElementById('filterFullTime').checked;
  const partTime = document.getElementById('filterPartTime').checked;
  const remote = document.getElementById('filterRemote').checked;

  document.getElementById('salaryDisplay').textContent = `Max: ₹${salary.toLocaleString()}`;

  const filtered = allJobs.filter((job) => {
    const matchSearch = job.title.toLowerCase().includes(searchText) || job.company.toLowerCase().includes(searchText);
    const matchLocation = job.location.toLowerCase().includes(location);
    const matchSalary = Number(job.salary) <= salary;
    const matchCategory = !category || job.category === category;
    let matchType = true;
    if (fullTime || partTime || remote) {
      matchType = (fullTime && job.jobType === 'Full Time') || (partTime && job.jobType === 'Part Time') || (remote && job.jobType === 'Remote');
    }
    return matchSearch && matchLocation && matchSalary && matchCategory && matchType;
  });

  renderJobsList(filtered);
}

function resetFilters() {
  document.getElementById('filterSearch').value = '';
  document.getElementById('filterLocation').value = '';
  document.getElementById('filterSalary').value = 500000;
  document.getElementById('filterCategory').value = '';
  document.getElementById('filterFullTime').checked = false;
  document.getElementById('filterPartTime').checked = false;
  document.getElementById('filterRemote').checked = false;
  document.getElementById('salaryDisplay').textContent = 'Max: ₹500,000';
  renderJobsList();
}

async function searchJobs() {
  const jobTitle = document.getElementById('searchJobTitle').value;
  const location = document.getElementById('searchLocation').value;
  await navigateTo('jobs');
  setTimeout(() => {
    if (jobTitle) document.getElementById('filterSearch').value = jobTitle;
    if (location) document.getElementById('filterLocation').value = location;
    applyFilters();
  }, 100);
}

async function toggleSaveJob(jobId, button) {
  if (!currentUser) {
    showNotification('Please login to save jobs', 'warning');
    navigateTo('login');
    return;
  }

  const alreadySaved = userSavedJobs.some((saved) => saved.id === jobId);
  try {
    if (alreadySaved) {
      await apiFetch(`/jobs/save/${jobId}`, { method: 'DELETE', headers: authHeaders(false) });
      showNotification('Job removed from saved', 'success');
    } else {
      await apiFetch(`/jobs/save/${jobId}`, { method: 'POST', headers: authHeaders(false) });
      showNotification('Job saved successfully!', 'success');
    }

    await loadSavedJobs();
    if (button) button.classList.toggle('saved');
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

async function applyForJob(jobId) {
  if (!currentUser) {
    showNotification('Please login to apply', 'warning');
    navigateTo('login');
    return;
  }

  try {
    await apiFetch(`/jobs/apply/${jobId}`, { method: 'POST', headers: authHeaders(false) });
    showNotification('Application submitted successfully!', 'success');
    await loadAppliedJobs();
    renderJobsList();
    renderFeaturedJobs();
  } catch (error) {
    showNotification(error.message, error.message.includes('already') ? 'warning' : 'error');
  }
}

function renderCompaniesList() {
  const container = document.getElementById('companiesList');
  if (!container) return;

  container.innerHTML = allCompanies.map((company) => `
    <div class="company-card">
      <div class="company-logo">${company.logo}</div>
      <h3 class="company-name">${company.name}</h3>
      <p class="company-description">Leading organization in the industry</p>
      <div class="company-stats">
        <div class="company-stat"><div class="company-stat-value">${company.openJobs}</div><div class="company-stat-label">Open Jobs</div></div>
        <div class="company-stat"><div class="company-stat-value">${company.employees}</div><div class="company-stat-label">Employees</div></div>
      </div>
      <button class="btn-primary" style="width: 100%;" onclick="navigateTo('jobs')">View Jobs</button>
    </div>
  `).join('');
}

async function loadDashboard() {
  if (!currentUser) {
    navigateTo('login');
    return;
  }

  const profileData = await apiFetch('/auth/profile', { method: 'GET', headers: authHeaders(false) });
  currentUser = profileData.user;
  localStorage.setItem('currentUser', JSON.stringify(currentUser));

  const isRecruiter = currentUser.role === 'recruiter';
  document.getElementById('postJobTab').style.display = isRecruiter ? 'block' : 'none';
  document.getElementById('manageJobsTab').style.display = isRecruiter ? 'block' : 'none';
  document.getElementById('viewApplicantsTab').style.display = isRecruiter ? 'block' : 'none';
  document.getElementById('resumeUploadTab').style.display = isRecruiter ? 'none' : 'block';
  document.getElementById('appliedJobsTab').style.display = isRecruiter ? 'none' : 'block';
  document.getElementById('savedJobsTab').style.display = isRecruiter ? 'none' : 'block';

  document.getElementById('userFullName').textContent = currentUser.fullName;
  document.getElementById('userRole').textContent = isRecruiter ? 'Recruiter' : 'Job Seeker';
  document.getElementById('profileFullName').value = currentUser.fullName;
  document.getElementById('profileEmail').value = currentUser.email;
  document.getElementById('profilePhone').value = currentUser.phone || '';
  document.getElementById('profileLocation').value = currentUser.profile?.location || '';
  document.getElementById('profileBio').value = currentUser.profile?.bio || '';
  document.getElementById('profileSkills').value = (currentUser.profile?.skills || []).join(', ');

  await Promise.all([loadAppliedJobs(), loadSavedJobs(), loadManagedJobs(), loadApplicants()]);
}

function switchDashboardTab(tabName) {
  document.querySelectorAll('.tab-content').forEach((tab) => tab.classList.remove('active'));
  document.querySelectorAll('.tab-link').forEach((link) => link.classList.remove('active'));
  document.getElementById(tabName)?.classList.add('active');
  document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
}

async function updateProfile(e) {
  e.preventDefault();

  try {
    const data = await apiFetch('/auth/profile', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({
        fullName: document.getElementById('profileFullName').value,
        phone: document.getElementById('profilePhone').value,
        location: document.getElementById('profileLocation').value,
        bio: document.getElementById('profileBio').value,
        skills: document.getElementById('profileSkills').value,
      }),
    });

    currentUser = data.user;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    updateNavbar();
    showNotification('Profile updated successfully!', 'success');
  } catch (error) {
    showNotification(error.message, 'error');
  }
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
  } catch (error) {
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
  } catch (error) {
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
