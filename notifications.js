import { userProfile } from './data.js';

let notificationInterval = null;

// Function to request permission
export const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
        alert("This browser does not support desktop notifications");
        return false;
    }

    if (Notification.permission === "granted") {
        return true;
    }

    if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        return permission === "granted";
    }

    return false;
};

// Send a notification
const sendNotification = (title, options = {}) => {
    if (Notification.permission === "granted") {
        new Notification(title, {
            icon: 'https://cdn-icons-png.flaticon.com/512/3239/3239952.png', // Generic calendar icon
            badge: 'https://cdn-icons-png.flaticon.com/512/3239/3239952.png',
            ...options
        });
    }
};

// Check for events starting in ~10 minutes
const checkEventReminders = (events) => {
    const now = new Date();
    // Round down to current minute
    now.setSeconds(0, 0);

    events.forEach(event => {
        if (!event.is_scheduled || event.completed) return;
        if (event.date !== now.toISOString().split('T')[0]) return;

        const [h, m] = event.startTime.split(':').map(Number);
        const eventTime = new Date(now);
        eventTime.setHours(h, m, 0, 0);

        const diffMinutes = (eventTime - now) / (1000 * 60);

        // Notify exactly 10 minutes before
        if (diffMinutes === 10) {
            sendNotification(`Upcoming: ${event.title}`, {
                body: `Starts at ${event.startTime}. Energy Cost: ${event.estimated_energy_cost || 'N/A'}`,
                tag: `reminder-${event.id}` // Prevent duplicates
            });
        }
    });
};

// Check for Energy Zones
const checkEnergyZone = () => {
    const now = new Date();
    const currentHour = now.getHours();

    // Check if entered a new hour exactly (minute 0)
    if (now.getMinutes() === 0) {
        const energyLevel = userProfile.energy_curve[currentHour];

        // High Energy Zone (Peak Focus)
        if (energyLevel >= 80) {
            sendNotification("⚡ Entering Peak Focus Zone", {
                body: `Your energy is high (${energyLevel}%). Tackle your hardest tasks now!`,
                tag: 'energy-high'
            });
        }

        // Low Energy warning (if strictly dropping)
        // Simplified: just check if low
        if (energyLevel <= 30) {
            sendNotification("🌙 Low Energy Zone", {
                body: `Energy is dipping (${energyLevel}%). Good time for a break or light tasks.`,
                tag: 'energy-low'
            });
        }
    }
};

export const startNotificationLoop = (events) => {
    if (notificationInterval) clearInterval(notificationInterval);

    // Run immediately once
    if (Notification.permission === "granted") {
        console.log("Notifications active. Loop started.");
    }

    // Tick every minute
    notificationInterval = setInterval(() => {
        if (Notification.permission !== "granted") return;

        // Re-fetch events in case state changed? 
        // For now, we assume 'events' passed is a reference or we fetch from localStorage
        const stored = localStorage.getItem('scheduleWise_events');
        const currentEvents = stored ? JSON.parse(stored) : events;

        checkEventReminders(currentEvents);
        checkEnergyZone();
    }, 60 * 1000);
};
