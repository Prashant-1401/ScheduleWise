from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import jwt
import bcrypt
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production-12345'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///schedulewise.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app)
db = SQLAlchemy(app)

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Event(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    date = db.Column(db.String(20))
    start_time = db.Column(db.String(10))
    end_time = db.Column(db.String(10))
    type = db.Column(db.String(50))
    location = db.Column(db.String(200))
    is_scheduled = db.Column(db.Boolean, default=False)
    completed = db.Column(db.Boolean, default=False)
    priority_score = db.Column(db.Float, default=50.0)
    estimated_energy_cost = db.Column(db.Float, default=50.0)
    time_required = db.Column(db.Integer, default=60)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class UserProfile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), unique=True, nullable=False)
    energy_curve = db.Column(db.JSON)
    remaining_energy = db.Column(db.Integer, default=800)
    start_hour = db.Column(db.Integer, default=8)
    end_hour = db.Column(db.Integer, default=22)

# Helper functions
def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password, password_hash):
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def create_token(user_id, email):
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def verify_token(token):
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload
    except:
        return None

def get_current_user():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    token = auth_header.replace('Bearer ', '')
    payload = verify_token(token)
    if not payload:
        return None
    return User.query.get(payload['user_id'])

# Routes
@app.route('/')
def index():
    return jsonify({'message': 'ScheduleWise Flask API', 'status': 'running'})

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 400
    
    user = User(
        email=data['email'],
        password_hash=hash_password(data['password'])
    )
    db.session.add(user)
    db.session.commit()
    
    return jsonify({
        'id': user.id,
        'email': user.email,
        'created_at': user.created_at.isoformat()
    }), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not verify_password(data['password'], user.password_hash):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    token = create_token(user.id, user.email)
    return jsonify({'access_token': token, 'token_type': 'bearer'})

@app.route('/api/auth/me')
def get_me():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    return jsonify({
        'id': user.id,
        'email': user.email,
        'created_at': user.created_at.isoformat()
    })

@app.route('/api/events', methods=['GET', 'POST'])
def events():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    
    if request.method == 'GET':
        events = Event.query.filter_by(user_id=user.id).all()
        return jsonify([{
            'id': e.id,
            'title': e.title,
            'description': e.description,
            'date': e.date,
            'start_time': e.start_time,
            'end_time': e.end_time,
            'type': e.type,
            'location': e.location,
            'is_scheduled': e.is_scheduled,
            'completed': e.completed,
            'priority_score': e.priority_score,
            'estimated_energy_cost': e.estimated_energy_cost,
            'time_required': e.time_required
        } for e in events])
    
    data = request.json
    event = Event(user_id=user.id, **data)
    db.session.add(event)
    db.session.commit()
    return jsonify({'id': event.id, 'message': 'Event created'}), 201

@app.route('/api/events/<int:event_id>', methods=['GET', 'PUT', 'DELETE'])
def event_detail(event_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    
    event = Event.query.filter_by(id=event_id, user_id=user.id).first()
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    if request.method == 'DELETE':
        db.session.delete(event)
        db.session.commit()
        return jsonify({'message': 'Event deleted'})
    
    if request.method == 'PUT':
        data = request.json
        for key, value in data.items():
            setattr(event, key, value)
        db.session.commit()
    
    return jsonify({
        'id': event.id,
        'title': event.title,
        'description': event.description,
        'date': event.date,
        'start_time': event.start_time,
        'end_time': event.end_time,
        'type': event.type,
        'location': event.location,
        'is_scheduled': event.is_scheduled,
        'completed': event.completed
    })

@app.route('/api/profile', methods=['GET', 'PUT'])
def profile():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    
    profile = UserProfile.query.filter_by(user_id=user.id).first()
    
    if request.method == 'GET':
        if not profile:
            # Create default profile
            default_curve = [50, 50, 50, 50, 60, 70, 90, 100, 100, 90, 80, 70,
                            60, 50, 40, 50, 60, 70, 70, 60, 50, 40, 30, 30]
            profile = UserProfile(
                user_id=user.id,
                energy_curve=default_curve,
                remaining_energy=800,
                start_hour=8,
                end_hour=22
            )
            db.session.add(profile)
            db.session.commit()
        
        return jsonify({
            'id': profile.id,
            'user_id': profile.user_id,
            'energy_curve': profile.energy_curve,
            'remaining_energy': profile.remaining_energy,
            'start_hour': profile.start_hour,
            'end_hour': profile.end_hour
        })
    
    data = request.json
    if not profile:
        profile = UserProfile(user_id=user.id, **data)
        db.session.add(profile)
    else:
        for key, value in data.items():
            setattr(profile, key, value)
    db.session.commit()
    return jsonify({'message': 'Profile updated'})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=8000)
