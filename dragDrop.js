import { formatTime, getMinutesFromMidnight } from './algorithms.js';

// Helper to convert time "HH:mm" to mins
const timeToMins = (str) => {
    const [h, m] = str.split(':').map(Number);
    return h * 60 + m;
};

// Helper to mins to "HH:mm"
const minsToTime = (total) => {
    // Wrap around 24h
    total = total % 1440;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return formatTime(h, m);
};

export const initDragDrop = (events, updateCallback) => {
    const containers = document.querySelectorAll('.events-list');

    containers.forEach(container => {
        // Prevent re-init (if already sortable?)
        // SortableJS handles this gracefully or we can check a property

        new Sortable(container, {
            group: 'shared', // Allows dragging between lists (days)
            animation: 150,
            ghostClass: 'bg-black/5',
            onEnd: (evt) => {
                const item = evt.item;
                const toList = evt.to;
                const newDate = toList.dataset.date;
                const eventId = item.dataset.id;

                // Get new index
                const newIndex = evt.newIndex;

                // Find prev and next items in the DOM to calculate time
                const children = Array.from(toList.children);
                // "item" is already in the new position in DOM because Sortable moved it

                let prevEl = children[newIndex - 1];
                let nextEl = children[newIndex + 1];

                // Find the Event Object
                const event = events.find(e => e.id === eventId);
                if (!event) return;

                // Duration
                const duration = timeToMins(event.endTime) - timeToMins(event.startTime);

                let newStartTimeMins;

                if (!prevEl) {
                    // Dropped at top
                    // Default to 08:00 or stay same if date changed?
                    // Let's settle on 08:00 if empty, or just before the next one
                    if (nextEl) {
                        // Dropped before first item
                        // Try to put it immediately before next item? Or standard start?
                        // Let's use 08:00 or Current Time if today?
                        // Simplest: 08:00 AM
                        newStartTimeMins = 8 * 60; // 08:00
                    } else {
                        // List was empty
                        newStartTimeMins = 8 * 60;
                    }
                } else {
                    // Dropped after something
                    // Get prev event ID
                    const prevId = prevEl.dataset.id;
                    const prevEvent = events.find(e => e.id === prevId);

                    if (prevEvent) {
                        // Start 15 mins after prev ends, or immediately?
                        // Let's say 0 buffer for tightness, or 15.
                        // Let's use 0 buffer - immediately after.
                        newStartTimeMins = timeToMins(prevEvent.endTime);
                    } else {
                        newStartTimeMins = 8 * 60;
                    }
                }

                // Logic check needed: What if we drop between A (10-11) and B (12-13)?
                // Above logic: starts at 11:00.

                // What if we drop between A (10-11) and B (10:30-11:30) [Overlap]?
                // Above logic: starts at 11:00. New event (11-12) will overlap B. 
                // That's fine, user can fix or LOSA runs (but we aren't running LOSA here to keep it simple).

                const newStart = minsToTime(newStartTimeMins);
                const newEnd = minsToTime(newStartTimeMins + duration);

                // Update Event
                const updatedEvent = {
                    ...event,
                    date: newDate,
                    startTime: newStart,
                    endTime: newEnd
                };

                // Optimistic UI update already happened by Sortable (DOM moved)
                // We need to sync state and SAVE.

                // Update State array
                const idx = events.findIndex(e => e.id === eventId);
                if (idx !== -1) events[idx] = updatedEvent;

                // Persist
                updateCallback(events);
            }
        });
    });
};
