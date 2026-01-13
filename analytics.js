import { userProfile } from './data.js';

// --- Global Data Loading ---
// We need to load events similarly to app.js
let events = [];
try {
    const stored = localStorage.getItem('scheduleWise_events');
    if (stored) {
        events = JSON.parse(stored);
    }
} catch (e) {
    console.error("Failed to load events", e);
}

// --- Metrics Calculation ---

// 1. Burnout Metric: Today's scheduled energy vs Daily Capacity
const calculateBurnout = () => {
    // Capacity comes from userProfile
    // Note: If userProfile.remaining_energy is "current available", we want "total daily budget"
    // So we sum the custom curve or use a fixed budget assumption. 
    // Let's sum the curve to get "Total Potential Energy Units". 
    // Since curve values are 0-100 arbitrary units per hour, the sum is a proxy for daily capacity.
    const totalCapacity = userProfile.energy_curve.reduce((acc, val) => acc + val, 0);

    // Calculate Today's Demand
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysEvents = events.filter(e => e.date === todayStr && e.is_scheduled && !e.completed);

    const energyDemand = todaysEvents.reduce((acc, e) => acc + (e.estimated_energy_cost || 50), 0);

    // Percentage
    const percentage = Math.round((energyDemand / totalCapacity) * 100);

    return {
        percentage: Math.min(percentage, 100), // Cap visual at 100
        rawPercentage: percentage,
        demand: energyDemand,
        capacity: totalCapacity
    };
};

// 2. Completion Stats (All Time or This Week) - Let's do All Time for simplicity demo
const calculateCompletion = () => {
    const total = events.length;
    if (total === 0) return { done: 0, pending: 0 };

    const done = events.filter(e => e.completed).length;
    const pending = total - done;

    return { done, pending };
};

// 3. Focus Distribution (Work vs Personal vs Health)
const calculateFocus = () => {
    const counts = { Work: 0, Personal: 0, Health: 0, Other: 0 };

    events.forEach(e => {
        // Normalize type
        let type = (e.type || 'Other').charAt(0).toUpperCase() + (e.type || 'Other').slice(1);
        if (!counts[type]) type = 'Other';
        counts[type]++;
    });

    return counts;
};


// --- Rendering Charts ---

const renderBurnoutChart = (metric) => {
    const ctx = document.getElementById('burnoutChart');
    if (!ctx) return;

    const color = metric.percentage < 60 ? '#4ade80' : (metric.percentage < 90 ? '#fb923c' : '#ef4444');

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Scheduled', 'Remaining Budget'],
            datasets: [{
                data: [metric.percentage, 100 - metric.percentage],
                backgroundColor: [color, '#f3f4f6'],
                borderWidth: 0,
                cutout: '75%',
                circumference: 180,
                rotation: 270,
            }]
        },
        options: {
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Text Labels
    document.getElementById('energy-percentage').innerText = `${metric.rawPercentage}%`;
    document.getElementById('energy-percentage').style.color = color;

    const feedback = document.getElementById('burnout-feedback');
    if (metric.rawPercentage < 50) feedback.innerText = "You have plenty of energy left!";
    else if (metric.rawPercentage < 90) feedback.innerText = "Optimal load. Stay focused.";
    else feedback.innerText = "Warning: High burnout risk. Consider rescheduling.";
};

const renderCompletionChart = (stats) => {
    const ctx = document.getElementById('completionChart');
    if (!ctx) return;

    // Update DOM counters
    document.getElementById('tasks-done-count').innerText = stats.done;
    document.getElementById('tasks-pending-count').innerText = stats.pending;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Done', 'Pending'],
            datasets: [{
                data: [stats.done, stats.pending],
                backgroundColor: ['#30c9e8', '#e5e7eb'],
                borderWidth: 0,
                cutout: '70%'
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            responsive: true,
            maintainAspectRatio: false
        }
    });
};

const renderFocusChart = (counts) => {
    const ctx = document.getElementById('focusChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Work', 'Personal', 'Health'],
            datasets: [{
                label: 'Tasks',
                data: [counts.Work, counts.Personal, counts.Health],
                backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981'],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { display: false } },
                x: { grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
};

// --- AI Insight Generator ---
const generateInsight = (burnout, completion, focus) => {
    const el = document.getElementById('ai-insight-text');
    if (!el) return;

    let text = "";

    if (burnout.rawPercentage > 100) {
        text = "Your schedule is overloaded today. The AI suggests pushing non-urgent tasks to tomorrow to protect your energy.";
    } else if (completion.pending > completion.done * 2) {
        text = "You have a backlog of pending tasks. Try 'Smart Schedule' to redistribute them to optimal slots.";
    } else if (focus.Work > (focus.Personal + focus.Health) * 2) {
        text = "Great hustle, but your schedule is heavily skewed towards Work. Consider adding a 'Health' break.";
    } else {
        text = "Your schedule is well-balanced! Your energy efficiency is optimal for today.";
    }

    el.innerText = text;
};

const init = () => {
    const burnout = calculateBurnout();
    const completion = calculateCompletion();
    const focus = calculateFocus();

    renderBurnoutChart(burnout);
    renderCompletionChart(completion);
    renderFocusChart(focus);

    generateInsight(burnout, completion, focus);
};

document.addEventListener('DOMContentLoaded', init);
