# ScheduleWise
Just a Simple Project With The ExtraOrdinary Feature 
A smart, energy-aware scheduling application that helps you optimize your daily tasks based on your personal energy levels throughout the day.

![Made with Flask](https://img.shields.io/badge/Backend-Flask-000000?style=for-the-badge&logo=flask)
![TailwindCSS](https://img.shields.io/badge/Frontend-TailwindCSS-38B2AC?style=for-the-badge&logo=tailwind-css)
![SQLite](https://img.shields.io/badge/Database-SQLite-003B57?style=for-the-badge&logo=sqlite)

## ✨ Features

- **🔐 User Authentication** - Secure registration and login with JWT tokens
- **📆 Smart Scheduling** - Create, edit, and manage events with drag-and-drop functionality
- **⚡ Energy-Based Planning** - Schedule tasks based on your personal energy curve throughout the day
- **📊 Analytics Dashboard** - Track productivity metrics and visualize your performance
- **🌙 Dark/Light Mode** - Toggle between themes for comfortable viewing
- **🔔 Notifications** - Stay reminded of upcoming events
- **📱 Responsive Design** - Works seamlessly on desktop and mobile devices

## 🖼️ Screenshots

| Dashboard | Schedule | Analytics |
|-----------|----------|-----------|
| Home page with upcoming events | Calendar view with drag-drop | Productivity insights |

## 🛠️ Tech Stack

### Frontend
- **HTML5** with semantic markup
- **TailwindCSS** for styling
- **Vanilla JavaScript** (ES6 Modules)
- **Material Symbols** for icons
- **Plus Jakarta Sans** font

### Backend
- **Python Flask** - Web framework
- **Flask-SQLAlchemy** - ORM for database
- **Flask-CORS** - Cross-origin support
- **JWT** - Token-based authentication
- **bcrypt** - Password hashing
- **SQLite** - Database

## 📁 Project Structure

```
ScheduleWise/
├── Frontend/
│   ├── HomePage.html          # Main dashboard
│   ├── Schedule-page.html     # Calendar/schedule view
│   ├── Analytics.html         # Productivity analytics
│   ├── Settings.html          # User settings & energy profile
│   ├── login.html             # Login page
│   ├── register.html          # Registration page
│   ├── app.js                 # Main application logic
│   ├── algorithms.js          # Scheduling algorithms
│   ├── analytics.js           # Analytics calculations
│   ├── api.js                 # API communication
│   ├── auth-guard.js          # Route protection
│   ├── data.js                # Data management
│   ├── dragDrop.js            # Drag and drop functionality
│   ├── notifications.js       # Notification system
│   ├── settings.js            # Settings logic
│   ├── logout-button.js       # Logout handling
│   └── theme-toggle.js        # Dark/light mode toggle
│
└── Backend/
    ├── flask_app.py           # Main Flask application
    ├── requirements.txt       # Python dependencies
    ├── requirements-flask.txt # Flask-specific dependencies
    ├── README.md              # Backend documentation
    └── app/                   # Application modules
        ├── config.py          # Configuration
        ├── database.py        # Database setup
        ├── main.py            # Entry point
        ├── models/            # Database models
        ├── routers/           # API routes
        ├── schemas/           # Data schemas
        └── utils/             # Utility functions
```

## 🚀 Getting Started

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Modern web browser

### Backend Setup

1. **Navigate to the Backend folder**
   ```bash
   cd Backend
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment**
   - Windows:
     ```bash
     venv\Scripts\activate
     ```
   - macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

4. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

5. **Run the server**
   ```bash
   python flask_app.py
   ```
   
   The server will start at `http://127.0.0.1:8000`

### Frontend Setup

1. **Open the Frontend folder**
2. **Open `login.html`** in your browser, or use a local development server:
   ```bash
   # Using Python
   python -m http.server 5500
   
   # Or using VS Code Live Server extension
   ```

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and get JWT token |
| GET | `/api/auth/me` | Get current user info |

### Events
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events` | Get all user events |
| POST | `/api/events` | Create new event |
| GET | `/api/events/<id>` | Get specific event |
| PUT | `/api/events/<id>` | Update event |
| DELETE | `/api/events/<id>` | Delete event |

### Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile` | Get user energy profile |
| PUT | `/api/profile` | Update energy profile |

## 🔒 Environment Variables

Create a `.env` file in the Backend folder (do not commit to repository):

```env
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///schedulewise.db
```
