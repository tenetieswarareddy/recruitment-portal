# JobHub Full Stack

This package converts your uploaded JobHub frontend into a GitHub-ready full stack project with:

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express, MongoDB Atlas, Mongoose, JWT
- Roles: job-seeker and recruiter
- Features: signup, login, profile, post jobs, browse jobs, save jobs, apply for jobs, recruiter applicant view

## Folder structure

```
jobhub-fullstack/
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── script.localstorage.backup.js
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── .env.example
│   ├── package.json
│   └── server.js
└── README.md
```

## MongoDB Atlas setup

1. Create a free cluster in MongoDB Atlas.
2. Create a database user.
3. In **Network Access**, allow your IP or use `0.0.0.0/0` for testing.
4. Copy the connection string.
5. In `backend`, create `.env` from `.env.example`.
6. Replace `MONGODB_URI` with your Atlas connection string.

Example `.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/jobhub?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=jobhub_super_secret_key_12345
JWT_EXPIRE=7d
CORS_ORIGIN=*
```

## Run locally

### Backend

```bash
cd backend
npm install
npm run dev
```

Optional: seed sample jobs

```bash
npm run seed
```

### Frontend

Open `frontend/index.html` with Live Server or a simple local server.

Keep this line in `frontend/script.js`:

```js
const API_URL = 'http://localhost:5000/api';
```

## GitHub upload

From the project root:

```bash
git init
git add .
git commit -m "Initial JobHub full stack project"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/jobhub-fullstack.git
git push -u origin main
```

## Important

Do not upload `backend/.env` to GitHub.
Only upload `backend/.env.example`.

Create a `.gitignore` containing:

```gitignore
node_modules/
.env
.DS_Store
```

## Notes

- Resume upload UI is present, but real file storage is not added.
- Forgot password UI is present, but email reset flow is not added.
- Contact form is frontend-only right now.
