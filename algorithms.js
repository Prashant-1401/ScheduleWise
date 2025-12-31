// algorithms.js

// --- Helper Utilities ---

const parseDate = (dateStr) => new Date(dateStr);
const getHours = (timeStr) => parseInt(timeStr.split(':')[0], 10);
const getMinutes = (timeStr) => parseInt(timeStr.split(':')[1], 10);
export const formatTime = (h, m) => `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

const addMinutes = (timeStr, minutes) => {
    let [h, m] = timeStr.split(':').map(Number);
    m += minutes;
    while (m >= 60) {
        m -= 60;
        h += 1;
    }
    // Handle day rollover (24:00 -> 00:00) strictly for display if needed
    h = h % 24;
    return formatTime(h, m);
};

export const getMinutesFromMidnight = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
};

// Check if two time ranges overlap
const checkOverlap = (start1, end1, start2, end2) => {
    const s1 = getMinutesFromMidnight(start1);
    const e1 = getMinutesFromMidnight(end1);
    const s2 = getMinutesFromMidnight(start2);
    const e2 = getMinutesFromMidnight(end2);
    return Math.max(s1, s2) < Math.min(e1, e2);
};


// 1. DTTP: Dynamic Task Triage Protocol
export const runDTTP = (events) => {
    const today = new Date();
    const twoDaysMs = 48 * 60 * 60 * 1000;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    return events.map(event => {
        if (event.is_scheduled) return event; // Skip already scheduled

        let newScore = event.priority_score || 0;

        // Calculate Staleness
        if (event.last_triage_date) {
            const lastTriage = parseDate(event.last_triage_date);
            if ((today - lastTriage) > sevenDaysMs) {
                newScore += 1;
            }
        }

        // Check Deadline Proximity
        if (event.due_date) {
            const due = parseDate(event.due_date);
            if ((due - today) > 0 && (due - today) < twoDaysMs) {
                newScore += 3;
            }
        }

        return {
            ...event,
            priority_score: newScore,
            last_triage_date: today.toISOString()
        };
    });
};

// 2. EOAA: Energy-Optimized Assignment Algorithm
export const runEOAA = (events, userProfile, targetDateStr) => {
    // 1. Filter unscheduled and scheduled for the target day
    let unscheduled = events.filter(e => !e.is_scheduled && !e.completed);
    // Sort by priority (Highest First)
    unscheduled.sort((a, b) => b.priority_score - a.priority_score);

    const scheduled = events.filter(e => e.is_scheduled && e.date === targetDateStr);

    // Virtual schedule to track assignments during this run
    let currentSchedule = [...scheduled];
    let updatedEvents = [...events];
    let remainingEnergy = userProfile.remaining_energy;

    // 2. Iterate Unscheduled Tasks
    for (let task of unscheduled) {
        // Energy Check
        if (task.estimated_energy_cost > remainingEnergy) {
            console.log(`Skipping task "${task.title}": Not enough energy.`);
            continue;
        }

        // Energy Slot Search
        let validSlots = [];
        // Use 15-minute increments for higher precision scheduling
        const minuteIncrements = [0, 15, 30, 45];

        for (let hour = userProfile.start_hour; hour < userProfile.end_hour; hour++) {

            for (let min of minuteIncrements) {
                const startT = formatTime(hour, min);
                const endT = addMinutes(startT, task.time_required);

                // Boundary Check
                if (getMinutesFromMidnight(endT) > getMinutesFromMidnight(`${userProfile.end_hour}:00`)) continue;

                // Conflict Check
                const hasConflict = currentSchedule.some(existing =>
                    checkOverlap(startT, endT, existing.startTime, existing.endTime)
                );

                if (!hasConflict) {
                    // Score this slot based on User Energy at this hour
                    const energyAtHour = userProfile.energy_curve[hour] || 50;

                    // Simple alignment score: Check if energy level is sufficient
                    const sufficiency = energyAtHour - task.estimated_energy_cost;

                    if (sufficiency >= -10) { // Allow slight stretching (-10 tolerance)
                        validSlots.push({ start: startT, end: endT, score: energyAtHour });
                    }
                }
            }
        }

        // Sort slots: Pick highest energy slot
        validSlots.sort((a, b) => b.score - a.score);

        if (validSlots.length > 0) {
            const bestSlot = validSlots[0];

            // Assign
            const updatedTask = {
                ...task,
                is_scheduled: true,
                date: targetDateStr,
                startTime: bestSlot.start,
                endTime: bestSlot.end
            };

            // Update local state for next iteration
            currentSchedule.push(updatedTask);
            remainingEnergy -= task.estimated_energy_cost;

            // Update global list
            const idx = updatedEvents.findIndex(e => e.id === task.id);
            updatedEvents[idx] = updatedTask;
        }
    }

    return updatedEvents;
};

// 3. LOSA: Least Disruptive Schedule Adjustment (Simplified)
// Triggered when an urgent task MUST be inserted at specific time (or ASAP)
export const runLOSA = (urgentTask, events, userProfile) => {
    // Note: simplified logic. Real LOSA recurses.

    const targetDate = urgentTask.date;
    const dayEvents = events.filter(e => e.date === targetDate && e.is_scheduled && e.id !== urgentTask.id);

    // Sort by time
    dayEvents.sort((a, b) => a.startTime.localeCompare(b.startTime));

    let updatedEvents = [...events];

    // Find conflicts
    let tasksToShift = [];

    const urgentEnd = getMinutesFromMidnight(urgentTask.endTime);

    dayEvents.forEach(existing => {

        if (checkOverlap(urgentTask.startTime, urgentTask.endTime, existing.startTime, existing.endTime)) {
            tasksToShift.push(existing);
        }
    });

    // Ripple Shift
    let nextAvailableMinute = urgentEnd;

    tasksToShift.forEach(victim => {
        const duration = getMinutesFromMidnight(victim.endTime) - getMinutesFromMidnight(victim.startTime);

        // Helper:
        const toTimeStr = (totalMins) => {
            const h = Math.floor(totalMins / 60);
            const m = totalMins % 60;
            return formatTime(h, m);
        };

        const newStart = toTimeStr(nextAvailableMinute);
        const newEnd = toTimeStr(nextAvailableMinute + duration);

        const updatedVictim = {
            ...victim,
            startTime: newStart,
            endTime: newEnd
        };

        const idx = updatedEvents.findIndex(e => e.id === victim.id);
        updatedEvents[idx] = updatedVictim;

        // Update next available for subsequent shifters (if we had a chain, simplified here)
        nextAvailableMinute += duration;
    });

    // Finally ensure Urgent Task is in the list
    const uIdx = updatedEvents.findIndex(e => e.id === urgentTask.id);
    if (uIdx >= 0) {
        updatedEvents[uIdx] = urgentTask;
    } else {
        updatedEvents.push(urgentTask);
    }

    return updatedEvents;
};