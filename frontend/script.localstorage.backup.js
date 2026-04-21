/* ============================================
   JOBHUB - RECRUITMENT PORTAL
   JavaScript Main File
   ============================================ */

// ============ GLOBAL VARIABLES ============

let currentUser = null;
let allJobs = [];
let userApplications = [];
let userSavedJobs = [];
let allCompanies = [];
let currentPage = 'home';

// ============ INITIALIZATION ============

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadFromLocalStorage();
    showPage('home');
    animateCounters();
    initializeSampleData();
});

// ============ APP INITIALIZATION ============

function initializeApp() {
    // Load dark mode preference
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        document.getElementById('darkModeToggle').textContent = '☀️';
    }

    // Check if user is already logged in
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        updateNavbar();
    }

    // Setup hamburger menu
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            this.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }
}

// ============ EVENT LISTENERS ============

function setupEventListeners() {
    // Dark Mode Toggle
    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);

    // Resume Upload
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

// ============ DARK MODE ============

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    document.getElementById('darkModeToggle').textContent = isDarkMode ? '☀️' : '🌙';
    localStorage.setItem('darkMode', isDarkMode);
}

// ============ NAVIGATION ============

function navigateTo(page) {
    // Check if user needs to be logged in
    if ((page === 'profile' || page === 'dashboard') && !currentUser) {
        navigateTo('login');
        return;
    }

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Show selected page
    const pageId = page === 'dashboard' ? 'dashboardPage' : 
                   page === 'profile' ? 'dashboardPage' : 
                   page + 'Page';

    const pageElement = document.getElementById(pageId);
    if (pageElement) {
        pageElement.classList.add('active');
    }

    // Update current page
    currentPage = page;

    // Close mobile menu
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    if (hamburger) {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    }

    // Load page-specific content
    if (page === 'jobs') {
        renderJobsList();
    } else if (page === 'companies') {
        renderCompaniesList();
    } else if (page === 'dashboard' || page === 'profile') {
        loadDashboard();
        switchDashboardTab('my-profile');
    } else if (page === 'home') {
        renderFeaturedJobs();
    }

    // Scroll to top
    window.scrollTo(0, 0);
}

// ============ NAVBAR UPDATES ============

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

// ============ AUTHENTICATION ============

function handleLogin(e) {
    e.preventDefault();
    clearErrors();

    const emailInput = document.getElementById('loginEmail').value.trim();
    const passwordInput = document.getElementById('loginPassword').value;

    // Validation
    if (!emailInput) {
        showError('loginEmailError', 'Email or username is required');
        return;
    }

    if (!passwordInput) {
        showError('loginPasswordError', 'Password is required');
        return;
    }

    // Get all users
    const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
    
    // Find user
    const user = allUsers.find(u => 
        (u.email === emailInput || u.fullName.toLowerCase() === emailInput.toLowerCase()) &&
        u.password === passwordInput
    );

    if (!user) {
        showError('loginPasswordError', 'Invalid email/username or password');
        showNotification('Invalid credentials', 'error');
        return;
    }

    // Login successful
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    if (document.getElementById('rememberMe').checked) {
        localStorage.setItem('rememberedEmail', emailInput);
    }

    document.getElementById('loginForm').reset();
    updateNavbar();
    showNotification('Login successful!', 'success');
    navigateTo('home');
}

function handleSignup(e) {
    e.preventDefault();
    clearErrors();

    const fullName = document.getElementById('signupFullName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const role = document.getElementById('signupRole').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;

    // Validations
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

    // Check if email already exists
    const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
    if (allUsers.some(u => u.email === email)) {
        showError('signupEmailError', 'Email already registered');
        isValid = false;
    }

    if (!isValid) {
        showNotification('Please fix the errors above', 'error');
        return;
    }

    // Create new user
    const newUser = {
        id: Date.now(),
        fullName,
        email,
        phone,
        role,
        password,
        createdAt: new Date().toISOString(),
        profile: {
            location: '',
            bio: '',
            skills: ''
        }
    };

    // Save user
    allUsers.push(newUser);
    localStorage.setItem('allUsers', JSON.stringify(allUsers));

    // Auto login
    currentUser = newUser;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    document.getElementById('signupForm').reset();
    updateNavbar();
    showNotification('Account created successfully!', 'success');
    navigateTo('home');
}

function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value.trim();

    if (!validateEmail(email)) {
        showError('forgotEmailError', 'Please enter a valid email');
        return;
    }

    const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
    if (!allUsers.some(u => u.email === email)) {
        showError('forgotEmailError', 'Email not found in our system');
        return;
    }

    document.getElementById('forgotPasswordForm').style.display = 'none';
    document.getElementById('resetSuccessMessage').style.display = 'block';
    showNotification('Password reset link sent to your email', 'success');

    setTimeout(() => {
        navigateTo('login');
    }, 2000);
}

function logoutUser() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateNavbar();
    showNotification('Logged out successfully', 'success');
    navigateTo('home');
}

// ============ VALIDATION FUNCTIONS ============

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePhone(phone) {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
}

function validatePassword(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
}

function validateName(name) {
    return name.trim().length >= 2;
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}

// Monitor password strength in real-time
document.addEventListener('input', function(e) {
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

// ============ ERROR & NOTIFICATION HANDLING ============

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.classList.add('show');
    }
}

function clearErrors() {
    document.querySelectorAll('.error-message').forEach(el => {
        el.classList.remove('show');
        el.textContent = '';
    });
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = 'notification show ' + type;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// ============ PAGE DISPLAY ============

function showPage(page) {
    navigateTo(page);
}

// ============ SAMPLE DATA INITIALIZATION ============

function initializeSampleData() {
    // Initialize sample jobs if not already done
    if (!localStorage.getItem('allJobs')) {
        const sampleJobs = [
            {
                id: 1,
                title: 'Senior Frontend Developer',
                company: 'Tech Solutions Inc',
                location: 'Bangalore, India',
                salary: 80000,
                description: 'Looking for an experienced frontend developer with expertise in React and modern web technologies.',
                jobType: 'Full Time',
                category: 'Technology',
                skills: ['React', 'JavaScript', 'CSS', 'HTML'],
                experience: 3,
                postedDate: new Date().toISOString(),
                postedBy: 'company1'
            },
            {
                id: 2,
                title: 'Data Scientist',
                company: 'Analytics Pro',
                location: 'Mumbai, India',
                salary: 90000,
                description: 'Seeking a talented data scientist to analyze complex datasets and develop ML models.',
                jobType: 'Full Time',
                category: 'Technology',
                skills: ['Python', 'Machine Learning', 'SQL', 'Pandas'],
                experience: 2,
                postedDate: new Date().toISOString(),
                postedBy: 'company2'
            },
            {
                id: 3,
                title: 'UX Designer',
                company: 'Creative Design Studio',
                location: 'Remote',
                salary: 60000,
                description: 'Join our creative team to design amazing user experiences.',
                jobType: 'Remote',
                category: 'Marketing',
                skills: ['Figma', 'UI Design', 'User Research', 'Prototyping'],
                experience: 1,
                postedDate: new Date().toISOString(),
                postedBy: 'company3'
            },
            {
                id: 4,
                title: 'Backend Developer',
                company: 'Cloud Systems',
                location: 'Hyderabad, India',
                salary: 75000,
                description: 'Build scalable backend systems using modern technologies.',
                jobType: 'Full Time',
                category: 'Technology',
                skills: ['Node.js', 'Python', 'AWS', 'Docker'],
                experience: 2,
                postedDate: new Date().toISOString(),
                postedBy: 'company4'
            },
            {
                id: 5,
                title: 'Marketing Manager',
                company: 'Brand Marketing Ltd',
                location: 'Delhi, India',
                salary: 55000,
                description: 'Lead marketing strategies and campaigns for our growing business.',
                jobType: 'Full Time',
                category: 'Marketing',
                skills: ['Marketing', 'Leadership', 'Analytics', 'Communication'],
                experience: 3,
                postedDate: new Date().toISOString(),
                postedBy: 'company5'
            },
            {
                id: 6,
                title: 'Financial Analyst',
                company: 'Finance Corp',
                location: 'Pune, India',
                salary: 70000,
                description: 'Analyze financial data and provide insights for business decisions.',
                jobType: 'Full Time',
                category: 'Finance',
                skills: ['Excel', 'Financial Analysis', 'Reporting', 'SAP'],
                experience: 2,
                postedDate: new Date().toISOString(),
                postedBy: 'company6'
            }
        ];

        localStorage.setItem('allJobs', JSON.stringify(sampleJobs));
    }

    // Initialize companies
    if (!localStorage.getItem('allCompanies')) {
        const sampleCompanies = [
            { id: 1, name: 'Tech Solutions Inc', logo: '💻', openJobs: 15, employees: 500 },
            { id: 2, name: 'Analytics Pro', logo: '📊', openJobs: 8, employees: 200 },
            { id: 3, name: 'Creative Design Studio', logo: '🎨', openJobs: 5, employees: 50 },
            { id: 4, name: 'Cloud Systems', logo: '☁️', openJobs: 12, employees: 300 },
            { id: 5, name: 'Brand Marketing Ltd', logo: '📢', openJobs: 7, employees: 100 },
            { id: 6, name: 'Finance Corp', logo: '💰', openJobs: 10, employees: 400 }
        ];

        localStorage.setItem('allCompanies', JSON.stringify(sampleCompanies));
    }

    // Initialize users array if not exists
    if (!localStorage.getItem('allUsers')) {
        localStorage.setItem('allUsers', JSON.stringify([]));
    }

    // Load all data
    loadFromLocalStorage();
}

// ============ LOCALSTORAGE MANAGEMENT ============

function loadFromLocalStorage() {
    allJobs = JSON.parse(localStorage.getItem('allJobs') || '[]');
    allCompanies = JSON.parse(localStorage.getItem('allCompanies') || '[]');
    
    if (currentUser) {
        userApplications = JSON.parse(localStorage.getItem(`applications_${currentUser.id}`) || '[]');
        userSavedJobs = JSON.parse(localStorage.getItem(`saved_${currentUser.id}`) || '[]');
    }
}

function saveToLocalStorage() {
    localStorage.setItem('allJobs', JSON.stringify(allJobs));
    localStorage.setItem('allCompanies', JSON.stringify(allCompanies));
    
    if (currentUser) {
        localStorage.setItem(`applications_${currentUser.id}`, JSON.stringify(userApplications));
        localStorage.setItem(`saved_${currentUser.id}`, JSON.stringify(userSavedJobs));
    }
}

// ============ FEATURED JOBS ============

function renderFeaturedJobs() {
    const container = document.getElementById('featuredJobs');
    if (!container) return;

    const featured = allJobs.slice(0, 3);
    
    container.innerHTML = featured.map(job => createJobCard(job)).join('');
}

// ============ JOBS LISTING ============

function renderJobsList() {
    loadFromLocalStorage();
    const container = document.getElementById('jobsList');
    if (!container) return;

    // Initially show all jobs
    const jobsToDisplay = allJobs;

    if (jobsToDisplay.length === 0) {
        document.getElementById('noJobsMessage').style.display = 'block';
        container.innerHTML = '';
        return;
    }

    document.getElementById('noJobsMessage').style.display = 'none';
    container.innerHTML = jobsToDisplay.map(job => createJobListItem(job)).join('');
}

function createJobCard(job) {
    const isSaved = currentUser && userSavedJobs.includes(job.id);
    const isApplied = currentUser && userApplications.some(app => app.jobId === job.id);

    return `
        <div class="job-card" onclick="openJobModal(${job.id})">
            <div class="job-card-header">
                <div>
                    <h3 class="job-card-title">${job.title}</h3>
                    <p class="job-card-company">${job.company}</p>
                </div>
                <button class="save-job-btn ${isSaved ? 'saved' : ''}}" 
                    onclick="event.stopPropagation(); toggleSaveJob(${job.id}, this)"
                    title="${isSaved ? 'Remove from saved' : 'Save job'}">💔</button>
            </div>

            <div class="job-card-meta">
                <span class="job-badge location">📍 ${job.location}</span>
                <span class="job-badge salary">💰 ₹${job.salary.toLocaleString()}</span>
                <span class="job-badge">${job.jobType}</span>
            </div>

            <p class="job-description">${job.description.substring(0, 100)}...</p>

            <div class="job-skills">
                ${job.skills.slice(0, 3).map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>

            <div class="job-card-footer">
                <span style="color: var(--text-light); font-size: 0.85rem;">
                    ${new Date(job.postedDate).toLocaleDateString()}
                </span>
                <button class="job-apply-btn ${isApplied ? 'applied' : ''}" 
                    onclick="event.stopPropagation(); applyForJob(${job.id})">
                    ${isApplied ? '✓ Applied' : 'Apply Now'}
                </button>
            </div>
        </div>
    `;
}

function createJobListItem(job) {
    const isSaved = currentUser && userSavedJobs.includes(job.id);
    const isApplied = currentUser && userApplications.some(app => app.jobId === job.id);

    return `
        <div class="job-list-item" onclick="openJobModal(${job.id})">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <h3 style="margin: 0 0 5px 0;">${job.title}</h3>
                    <p style="margin: 0 0 10px 0; color: var(--text-light);">${job.company}</p>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                        <span class="job-badge location">📍 ${job.location}</span>
                        <span class="job-badge salary">💰 ₹${job.salary.toLocaleString()}</span>
                        <span class="job-badge">${job.jobType}</span>
                    </div>
                </div>
                <div>
                    <button class="save-job-btn ${isSaved ? 'saved' : ''}" 
                        onclick="event.stopPropagation(); toggleSaveJob(${job.id}, this)"
                        title="${isSaved ? 'Remove from saved' : 'Save job'}">💔</button>
                </div>
            </div>
            <button class="job-apply-btn ${isApplied ? 'applied' : ''}" 
                style="margin-top: 10px; width: 100%;"
                onclick="event.stopPropagation(); applyForJob(${job.id})">
                ${isApplied ? '✓ Applied' : 'Apply Now'}
            </button>
        </div>
    `;
}

// ============ JOB MODAL ============

function openJobModal(jobId) {
    const job = allJobs.find(j => j.id === jobId);
    if (!job) return;

    const modalBody = document.getElementById('jobModalBody');
    const isSaved = currentUser && userSavedJobs.includes(job.id);
    const isApplied = currentUser && userApplications.some(app => app.jobId === job.id);

    modalBody.innerHTML = `
        <div>
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
                <div>
                    <h2 style="margin: 0;">${job.title}</h2>
                    <p style="margin: 10px 0 0 0; color: var(--text-light); font-size: 1.1rem;">${job.company}</p>
                </div>
                <button class="save-job-btn ${isSaved ? 'saved' : ''}" 
                    onclick="toggleSaveJob(${job.id}, this); updateModal(${job.id})"
                    style="font-size: 1.8rem; cursor: pointer;"
                    title="${isSaved ? 'Remove from saved' : 'Save job'}">💔</button>
            </div>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px;">
                <div>
                    <strong>Location:</strong><br><span class="job-badge location">📍 ${job.location}</span>
                </div>
                <div>
                    <strong>Salary:</strong><br><span class="job-badge salary">💰 ₹${job.salary.toLocaleString()}/year</span>
                </div>
                <div>
                    <strong>Job Type:</strong><br><span class="job-badge">${job.jobType}</span>
                </div>
                <div>
                    <strong>Experience:</strong><br><span class="job-badge">${job.experience} years</span>
                </div>
            </div>

            <h3>Description</h3>
            <p>${job.description}</p>

            <h3>Required Skills</h3>
            <div class="job-skills" style="margin-bottom: 20px;">
                ${job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>

            <h3>About the Company</h3>
            <p>${job.company} is a leading organization in the ${job.category} sector.</p>

            <button class="job-apply-btn ${isApplied ? 'applied' : ''}" 
                style="width: 100%; padding: 15px; font-size: 1rem;"
                onclick="applyForJob(${job.id}); closeJobModal()">
                ${isApplied ? '✓ Already Applied' : 'Apply Now'}
            </button>
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

document.getElementById('jobModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeJobModal();
    }
});

// ============ JOB FILTERING ============

function applyFilters() {
    const searchText = document.getElementById('filterSearch').value.toLowerCase();
    const location = document.getElementById('filterLocation').value.toLowerCase();
    const salary = parseInt(document.getElementById('filterSalary').value);
    const category = document.getElementById('filterCategory').value;
    const fullTime = document.getElementById('filterFullTime').checked;
    const partTime = document.getElementById('filterPartTime').checked;
    const remote = document.getElementById('filterRemote').checked;

    // Update salary display
    document.getElementById('salaryDisplay').textContent = `Max: ₹${salary.toLocaleString()}`;

    // Filter jobs
    const filtered = allJobs.filter(job => {
        const matchSearch = job.title.toLowerCase().includes(searchText) || 
                           job.company.toLowerCase().includes(searchText);
        const matchLocation = job.location.toLowerCase().includes(location);
        const matchSalary = job.salary <= salary;
        const matchCategory = !category || job.category === category;
        
        let matchType = true;
        if (fullTime || partTime || remote) {
            matchType = (fullTime && job.jobType === 'Full Time') ||
                       (partTime && job.jobType === 'Part Time') ||
                       (remote && job.jobType === 'Remote');
        }

        return matchSearch && matchLocation && matchSalary && matchCategory && matchType;
    });

    // Display filtered results
    const container = document.getElementById('jobsList');
    if (filtered.length === 0) {
        document.getElementById('noJobsMessage').style.display = 'block';
        container.innerHTML = '';
    } else {
        document.getElementById('noJobsMessage').style.display = 'none';
        container.innerHTML = filtered.map(job => createJobListItem(job)).join('');
    }
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

function searchJobs() {
    const jobTitle = document.getElementById('searchJobTitle').value;
    const location = document.getElementById('searchLocation').value;

    navigateTo('jobs');

    setTimeout(() => {
        if (jobTitle) document.getElementById('filterSearch').value = jobTitle;
        if (location) document.getElementById('filterLocation').value = location;
        applyFilters();
    }, 100);
}

// ============ SAVE & APPLY JOBS ============

function toggleSaveJob(jobId, button) {
    if (!currentUser) {
        showNotification('Please login to save jobs', 'warning');
        navigateTo('login');
        return;
    }

    const index = userSavedJobs.indexOf(jobId);
    if (index > -1) {
        userSavedJobs.splice(index, 1);
        showNotification('Job removed from saved', 'success');
    } else {
        userSavedJobs.push(jobId);
        showNotification('Job saved successfully!', 'success');
    }

    saveToLocalStorage();
    
    if (button) {
        button.classList.toggle('saved');
    }
}

function applyForJob(jobId) {
    if (!currentUser) {
        showNotification('Please login to apply', 'warning');
        navigateTo('login');
        return;
    }

    // Check if already applied
    if (userApplications.some(app => app.jobId === jobId)) {
        showNotification('You have already applied for this job', 'warning');
        return;
    }

    const application = {
        jobId: jobId,
        jobTitle: allJobs.find(j => j.id === jobId)?.title,
        appliedAt: new Date().toISOString(),
        status: 'pending'
    };

    userApplications.push(application);
    saveToLocalStorage();

    showNotification('Application submitted successfully!', 'success');
}

// ============ COMPANIES PAGE ============

function renderCompaniesList() {
    const container = document.getElementById('companiesList');
    if (!container) return;

    container.innerHTML = allCompanies.map(company => `
        <div class="company-card">
            <div class="company-logo">${company.logo}</div>
            <h3 class="company-name">${company.name}</h3>
            <p class="company-description">Leading organization in the industry</p>
            
            <div class="company-stats">
                <div class="company-stat">
                    <div class="company-stat-value">${company.openJobs}</div>
                    <div class="company-stat-label">Open Jobs</div>
                </div>
                <div class="company-stat">
                    <div class="company-stat-value">${company.employees}</div>
                    <div class="company-stat-label">Employees</div>
                </div>
            </div>

            <button class="btn-primary" style="width: 100%;" onclick="navigateTo('jobs')">View Jobs</button>
        </div>
    `).join('');
}

// ============ DASHBOARD ============

function loadDashboard() {
    if (!currentUser) {
        navigateTo('login');
        return;
    }

    // Show/hide recruiter-specific tabs
    const isRecruiter = currentUser.role === 'recruiter';
    
    document.getElementById('postJobTab').style.display = isRecruiter ? 'block' : 'none';
    document.getElementById('manageJobsTab').style.display = isRecruiter ? 'block' : 'none';
    document.getElementById('viewApplicantsTab').style.display = isRecruiter ? 'block' : 'none';
    
    document.getElementById('resumeUploadTab').style.display = isRecruiter ? 'none' : 'block';
    document.getElementById('appliedJobsTab').style.display = isRecruiter ? 'none' : 'block';
    document.getElementById('savedJobsTab').style.display = isRecruiter ? 'none' : 'block';

    // Update profile info
    document.getElementById('userFullName').textContent = currentUser.fullName;
    document.getElementById('userRole').textContent = currentUser.role === 'recruiter' ? 'Recruiter' : 'Job Seeker';

    // Load profile form
    document.getElementById('profileFullName').value = currentUser.fullName;
    document.getElementById('profileEmail').value = currentUser.email;
    document.getElementById('profilePhone').value = currentUser.phone || '';
    document.getElementById('profileLocation').value = currentUser.profile?.location || '';
    document.getElementById('profileBio').value = currentUser.profile?.bio || '';
    document.getElementById('profileSkills').value = currentUser.profile?.skills || '';

    loadFromLocalStorage();
    loadAppliedJobs();
    loadSavedJobs();
    loadManagedJobs();
    loadApplicants();
}

// ============ DASHBOARD TABS ============

function switchDashboardTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(link => link.classList.remove('active'));

    // Show selected tab
    const tabElement = document.getElementById(tabName);
    if (tabElement) {
        tabElement.classList.add('active');
    }

    // Mark link as active
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
}

// ============ PROFILE MANAGEMENT ============

function updateProfile(e) {
    e.preventDefault();

    currentUser.fullName = document.getElementById('profileFullName').value;
    currentUser.phone = document.getElementById('profilePhone').value;
    currentUser.profile.location = document.getElementById('profileLocation').value;
    currentUser.profile.bio = document.getElementById('profileBio').value;
    currentUser.profile.skills = document.getElementById('profileSkills').value;

    // Update current user
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    // Update in users array
    const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
    const userIndex = allUsers.findIndex(u => u.id === currentUser.id);
    if (userIndex > -1) {
        allUsers[userIndex] = currentUser;
        localStorage.setItem('allUsers', JSON.stringify(allUsers));
    }

    showNotification('Profile updated successfully!', 'success');
    updateNavbar();
}

// ============ APPLIED JOBS ============

function loadAppliedJobs() {
    const container = document.getElementById('appliedJobsList');
    if (!container) return;

    loadFromLocalStorage();

    if (userApplications.length === 0) {
        document.getElementById('noAppliedJobs').style.display = 'block';
        container.innerHTML = '';
        return;
    }

    document.getElementById('noAppliedJobs').style.display = 'none';

    const appliedJobsHTML = userApplications.map(app => {
        const job = allJobs.find(j => j.id === app.jobId);
        if (!job) return '';

        return createJobListItem(job);
    }).join('');

    container.innerHTML = appliedJobsHTML;
}

// ============ SAVED JOBS ============

function loadSavedJobs() {
    const container = document.getElementById('savedJobsList');
    if (!container) return;

    loadFromLocalStorage();

    const savedJobs = allJobs.filter(job => userSavedJobs.includes(job.id));

    if (savedJobs.length === 0) {
        document.getElementById('noSavedJobs').style.display = 'block';
        container.innerHTML = '';
        return;
    }

    document.getElementById('noSavedJobs').style.display = 'none';
    container.innerHTML = savedJobs.map(job => createJobListItem(job)).join('');
}

// ============ POST JOB (RECRUITER) ============

function handlePostJob(e) {
    e.preventDefault();

    const title = document.getElementById('jobTitle').value;
    const company = document.getElementById('jobCompany').value;
    const location = document.getElementById('jobLocation').value;
    const type = document.getElementById('jobType').value;
    const salary = parseInt(document.getElementById('jobSalary').value);
    const experience = parseInt(document.getElementById('jobExperience').value);
    const category = document.getElementById('jobCategory').value;
    const skills = document.getElementById('jobSkills').value.split(',').map(s => s.trim());
    const description = document.getElementById('jobDescription').value;

    const newJob = {
        id: Date.now(),
        title,
        company,
        location,
        salary,
        description,
        jobType: type,
        category,
        skills,
        experience,
        postedDate: new Date().toISOString(),
        postedBy: currentUser.id
    };

    allJobs.push(newJob);
    saveToLocalStorage();

    document.getElementById('postJobForm').reset();
    document.getElementById('postJobSuccess').style.display = 'block';

    setTimeout(() => {
        document.getElementById('postJobSuccess').style.display = 'none';
    }, 3000);

    showNotification('Job posted successfully!', 'success');
    loadManagedJobs();
}

// ============ MANAGE JOBS (RECRUITER) ============

function loadManagedJobs() {
    const container = document.getElementById('managedJobsList');
    if (!container) return;

    loadFromLocalStorage();

    const myJobs = allJobs.filter(job => job.postedBy === currentUser.id);

    if (myJobs.length === 0) {
        document.getElementById('noManagedJobs').style.display = 'block';
        container.innerHTML = '';
        return;
    }

    document.getElementById('noManagedJobs').style.display = 'none';

    container.innerHTML = myJobs.map(job => `
        <div class="job-list-item">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <h3 style="margin: 0 0 5px 0;">${job.title}</h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                        <span class="job-badge location">📍 ${job.location}</span>
                        <span class="job-badge salary">💰 ₹${job.salary.toLocaleString()}</span>
                        <span class="job-badge">${job.jobType}</span>
                    </div>
                </div>
                <div>
                    <button class="btn-danger-small" onclick="deleteJob(${job.id})">Delete</button>
                </div>
            </div>
        </div>
    `).join('');
}

function deleteJob(jobId) {
    if (confirm('Are you sure you want to delete this job?')) {
        allJobs = allJobs.filter(j => j.id !== jobId);
        saveToLocalStorage();
        showNotification('Job deleted successfully', 'success');
        loadManagedJobs();
    }
}

// ============ VIEW APPLICANTS (RECRUITER) ============

function loadApplicants() {
    const container = document.getElementById('applicantsList');
    if (!container) return;

    loadFromLocalStorage();

    // Get applications for jobs posted by current recruiter
    const myJobIds = allJobs.filter(job => job.postedBy === currentUser.id).map(j => j.id);
    
    // Get all users and their applications
    const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
    const applicants = [];

    allUsers.forEach(user => {
        const userApps = JSON.parse(localStorage.getItem(`applications_${user.id}`) || '[]');
        userApps.forEach(app => {
            if (myJobIds.includes(app.jobId)) {
                applicants.push({
                    userId: user.id,
                    userName: user.fullName,
                    userEmail: user.email,
                    jobTitle: app.jobTitle,
                    appliedAt: app.appliedAt,
                    status: app.status
                });
            }
        });
    });

    if (applicants.length === 0) {
        document.getElementById('noApplicants').style.display = 'block';
        container.innerHTML = '';
        return;
    }

    document.getElementById('noApplicants').style.display = 'none';

    container.innerHTML = applicants.map(app => `
        <div class="applicant-card">
            <div class="applicant-name">${app.userName}</div>
            <div class="applicant-info">
                <strong>Email:</strong> ${app.userEmail}<br>
                <strong>Applied for:</strong> ${app.jobTitle}<br>
                <strong>Applied on:</strong> ${new Date(app.appliedAt).toLocaleDateString()}
            </div>
            <div class="applicant-actions">
                <button class="btn-primary btn-small">Accept</button>
                <button class="btn-secondary btn-small">Reject</button>
            </div>
        </div>
    `).join('');
}

// ============ RESUME UPLOAD ============

function handleResumeUpload(file) {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showNotification('File size must be less than 5MB', 'error');
        return;
    }

    // In a real application, you would upload the file to a server
    // For now, we'll just simulate it
    currentUser.resumeFile = file.name;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    document.getElementById('resumeUploadArea').style.display = 'none';
    document.getElementById('uploadedResume').style.display = 'block';
    showNotification('Resume uploaded successfully!', 'success');

    setTimeout(() => {
        document.getElementById('resumeUploadArea').style.display = 'block';
        document.getElementById('uploadedResume').style.display = 'none';
        document.getElementById('resumeFile').value = '';
    }, 2000);
}

// ============ CONTACT FORM ============

function handleContactForm(e) {
    e.preventDefault();

    const name = document.getElementById('contactName').value;
    const email = document.getElementById('contactEmail').value;
    const message = document.getElementById('contactMessage').value;

    // Store contact message
    const messages = JSON.parse(localStorage.getItem('contactMessages') || '[]');
    messages.push({
        id: Date.now(),
        name,
        email,
        message,
        date: new Date().toISOString()
    });
    localStorage.setItem('contactMessages', JSON.stringify(messages));

    document.getElementById('contactForm').style.display = 'none';
    document.getElementById('contactSuccess').style.display = 'block';

    setTimeout(() => {
        document.getElementById('contactForm').style.display = 'block';
        document.getElementById('contactSuccess').style.display = 'none';
    }, 3000);

    showNotification('Message sent successfully!', 'success');
}

// ============ ANIMATED COUNTERS ============

function animateCounters() {
    const counters = document.querySelectorAll('[data-target]');
    
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-target'));
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

// ============ TYPING EFFECT ============

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

// Add typing effect to hero title on home page
document.addEventListener('click', function() {
    if (currentPage === 'home') {
        const heroTitle = document.getElementById('heroTitle');
        if (heroTitle && heroTitle.textContent === '') {
            typeWriter(heroTitle, 'Find Your Dream Job Today');
        }
    }
});

// ============ LOADING ANIMATION ============

function showLoadingAnimation() {
    const loadingHTML = `
        <div style="display: flex; justify-content: center; align-items: center; min-height: 200px;">
            <div style="width: 50px; height: 50px; border: 5px solid var(--border-color); 
                border-top-color: var(--primary-color); border-radius: 50%; 
                animation: spin 1s linear infinite;"></div>
        </div>
    `;
    return loadingHTML;
}

// ============ UTILITY FUNCTIONS ============

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatSalary(salary) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0
    }).format(salary);
}

// ============ KEYBOARD SHORTCUTS ============

document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('filterSearch') || document.getElementById('searchJobTitle');
        if (searchInput) searchInput.focus();
    }

    // Esc to close modal
    if (e.key === 'Escape') {
        closeJobModal();
    }
});

// ============ PAGE VISIBILITY ============

// Add fade animation to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// ============ INITIAL PAGE LOAD ============

console.log('JobHub Application Initialized Successfully');