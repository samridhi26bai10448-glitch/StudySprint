# StudySprint 📚

**StudySprint** is a full-stack study planner designed to help students organize their academic tasks, manage deadlines, and track their progress.

It includes user authentication, private task management, a calendar, and a progress dashboard.

## ✨ Features

- **User Authentication:** Register and log in securely.
- **Private Tasks:** Each user can access only their own tasks.
- **Task Management:** Create, view, edit, complete, and delete tasks.
- **Priority Levels:** Organize tasks by Low, Medium, and High priority.
- **Due Dates:** Set deadlines for your tasks.
- **Calendar:** View tasks by date.
- **Dashboard:** Get an overview of your study activities.
- **Progress Tracking:** Monitor completed and remaining tasks.

## 🛠️ Tech Stack

**Frontend**
- HTML
- CSS
- JavaScript

**Backend**
- Python
- FastAPI
- SQLAlchemy
- SQLite
- JWT Authentication

## 📁 Project Structure

```text
StudySprint/
│
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── tasks.html
│   ├── calendar.html
│   ├── progress.html
│   ├── style.css
│   └── script.js
│
├── database.py
├── dependencies.py
├── init_db.py
├── main.py
├── models.py
├── security.py
├── update_database.py
├── requirements.txt
└── .gitignore
```

## 🚀 Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/samridhi26bai10448-glitch/StudySprint.git
cd StudySprint
```

### 2. Create a virtual environment

```bash
python -m venv .venv
```

### 3. Activate the virtual environment

For Windows PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

### 4. Install dependencies

```bash
pip install -r requirements.txt
```

### 5. Set the secret key

For Windows PowerShell:

```powershell
$env:STUDYSPRINT_SECRET_KEY = python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 6. Initialize the database

```bash
python init_db.py
```

### 7. Start the backend

```bash
python -m uvicorn main:app --reload
```

The backend will run at:

`http://127.0.0.1:8000`

### 8. Start the frontend

Open a **second terminal**, navigate to the project folder, and run:

```bash
python -m http.server 5500 --directory frontend
```

Open the application at:

`http://127.0.0.1:5500/login.html`

## 🎯 Project Goal

StudySprint was built as a learning project to explore full-stack web development, REST APIs, database management, authentication, and frontend-backend integration.

---

**Built with 💚 for students who want to make their study routines more organized.**
