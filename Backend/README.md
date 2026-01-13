# ScheduleWise Flask Backend

✅ **Server is running on http://127.0.0.1:8000**

## Quick Start

```bash
# Activate virtual environment
venv\Scripts\activate

# Run server
python flask_app.py
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
  ```json
  {"email": "user@example.com", "password": "password123"}
  ```

- `POST /api/auth/login` - Login
  ```json
  {"email": "user@example.com", "password": "password123"}
  ```
  Returns: `{"access_token": "...", "token_type": "bearer"}`

- `GET /api/auth/me` - Get current user (requires auth header)

### Events
- `GET /api/events` - Get all events (requires auth)
- `POST /api/events` - Create event (requires auth)
- `GET /api/events/<id>` - Get specific event
- `PUT /api/events/<id>` - Update event
- `DELETE /api/events/<id>` - Delete event

### Profile
- `GET /api/profile` - Get user energy profile
- `PUT /api/profile` - Update energy profile

## Authentication

Include the token in requests:
```
Authorization: Bearer <your_token_here>
```

## Database

SQLite database `schedulewise.db` is created automatically on first run.

## Features

✅ JWT authentication
✅ CORS enabled for frontend
✅ SQLite database
✅ User registration & login
✅ Events CRUD operations
✅ User energy profiles
✅ Password hashing with bcrypt
