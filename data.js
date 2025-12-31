// data.js - Data management with backend integration
import { authAPI, eventsAPI, profileAPI } from './api.js';

// Default user profile
const defaultUserProfile = {
    energy_curve: [
        50, 50, 50, 50, 60, 70, 90, 100, 100, 90, 80, 70, // 00:00 - 11:00
        60, 50, 40, 50, 60, 70, 70, 60, 50, 40, 30, 30  // 12:00 - 23:00
    ],
    remaining_energy: 800,
    start_hour: 8,
    end_hour: 22
};

export const userProfile = { ...defaultUserProfile };

// Data transformation helpers
const transformEventFromBackend = (event) => ({
    id: event.id.toString(),
    title: event.title,
    description: event.description || '',
    date: event.date,
    startTime: event.start_time || '',
    endTime: event.end_time || '',
    type: event.type || 'work',
    location: event.location || '',
    is_scheduled: event.is_scheduled,
    completed: event.completed,
    priority_score: event.priority_score || 50,
    estimated_energy_cost: event.estimated_energy_cost || 50,
    time_required: event.time_required || 60,
    participants: event.participants || [],
    last_triage_date: event.last_triage_date,
    due_date: event.due_date
});

const transformEventToBackend = (event) => ({
    title: event.title,
    description: event.description || '',
    date: event.date,
    start_time: event.startTime || null,
    end_time: event.endTime || null,
    due_date: event.due_date || null,
    last_triage_date: event.last_triage_date || null,
    participants: event.participants || [],
    type: event.type || 'work',
    location: event.location || '',
    is_scheduled: event.is_scheduled !== undefined ? event.is_scheduled : true,
    completed: event.completed || false,
    priority_score: event.priority_score || 50,
    estimated_energy_cost: event.estimated_energy_cost || 50,
    time_required: event.time_required || 60
});

// Load user profile from API
export const loadUserProfile = async () => {
    try {
        const profile = await profileAPI.get();
        Object.assign(userProfile, profile);
        // Also save to localStorage as backup
        localStorage.setItem('scheduleWise_profile', JSON.stringify(userProfile));
        return userProfile;
    } catch (error) {
        console.error('Failed to load profile from API:', error);
        // Fallback to localStorage
        const storedProfile = localStorage.getItem('scheduleWise_profile');
        if (storedProfile) {
            Object.assign(userProfile, JSON.parse(storedProfile));
        }
        return userProfile;
    }
};

// Save user profile to API
export const saveUserProfile = async (profile) => {
    try {
        const updated = await profileAPI.update(profile);
        Object.assign(userProfile, updated);
        localStorage.setItem('scheduleWise_profile', JSON.stringify(userProfile));
        return userProfile;
    } catch (error) {
        console.error('Failed to save profile to API:', error);
        // Fallback to localStorage
        Object.assign(userProfile, profile);
        localStorage.setItem('scheduleWise_profile', JSON.stringify(userProfile));
        throw error;
    }
};

// Load events from API
export const loadEvents = async () => {
    try {
        const backendEvents = await eventsAPI.getAll();
        const events = backendEvents.map(transformEventFromBackend);
        // Save to localStorage as backup
        localStorage.setItem('scheduleWise_events', JSON.stringify(events));
        return events;
    } catch (error) {
        console.error('Failed to load events from API:', error);
        // Fallback to localStorage
        const stored = localStorage.getItem('scheduleWise_events');
        return stored ? JSON.parse(stored) : [];
    }
};

// Save event to API
export const saveEvent = async (event) => {
    try {
        const backendEvent = transformEventToBackend(event);
        const savedEvent = await eventsAPI.create(backendEvent);
        const transformedEvent = transformEventFromBackend(savedEvent);

        // Update localStorage
        const stored = localStorage.getItem('scheduleWise_events');
        const events = stored ? JSON.parse(stored) : [];
        events.push(transformedEvent);
        localStorage.setItem('scheduleWise_events', JSON.stringify(events));

        return events;
    } catch (error) {
        console.error('Failed to save event to API:', error);
        throw error;
    }
};

// Update event in API
export const updateEvent = async (event) => {
    try {
        const backendEvent = transformEventToBackend(event);
        await eventsAPI.update(event.id, backendEvent);

        // Update localStorage
        const stored = localStorage.getItem('scheduleWise_events');
        const events = stored ? JSON.parse(stored) : [];
        const index = events.findIndex(e => e.id === event.id);
        if (index !== -1) {
            events[index] = event;
            localStorage.setItem('scheduleWise_events', JSON.stringify(events));
        }

        return events;
    } catch (error) {
        console.error('Failed to update event in API:', error);
        throw error;
    }
};

// Delete event from API
export const deleteEvent = async (eventId) => {
    try {
        await eventsAPI.delete(eventId);

        // Update localStorage
        const stored = localStorage.getItem('scheduleWise_events');
        const events = stored ? JSON.parse(stored) : [];
        const filtered = events.filter(e => e.id !== eventId.toString());
        localStorage.setItem('scheduleWise_events', JSON.stringify(filtered));

        return filtered;
    } catch (error) {
        console.error('Failed to delete event from API:', error);
        throw error;
    }
};

// Get current user
export const getCurrentUser = async () => {
    try {
        return await authAPI.getCurrentUser();
    } catch (error) {
        console.error('Failed to get current user:', error);
        return null;
    }
};
