import { runDTTP, runEOAA, runLOSA } from './algorithms.js';
import { userProfile, loadEvents, saveEvent, updateEvent, loadUserProfile } from './data.js';
import { requestNotificationPermission, startNotificationLoop } from './notifications.js';
import { initDragDrop } from './dragDrop.js';

// Debug Logger
const logDebug = (msg) => {
    console.log(msg);
};

const state = {
    events: [],
    currentDate: new Date(),
    weekStart: (() => {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
        return new Date(today.setDate(diff));
    })(),
    filterBy: 'all',
    sortBy: 'time-asc',
    viewMode: 'list' // 'list' or 'month'
};

// --- Data Processing Helpers ---

const getProcessedEvents = () => {
    let events = [...state.events];

    // Filter
    if (state.filterBy !== 'all') {
        events = events.filter(e => e.type === state.filterBy);
    }

    // Sort
    events.sort((a, b) => {
        if (state.sortBy === 'time-asc') {
            const dateCmp = a.date.localeCompare(b.date);
            if (dateCmp !== 0) return dateCmp;
            return a.startTime.localeCompare(b.startTime);
        } else if (state.sortBy === 'time-desc') {
            const dateCmp = b.date.localeCompare(a.date);
            if (dateCmp !== 0) return dateCmp;
            return b.startTime.localeCompare(a.startTime);
        } else if (state.sortBy === 'priority') {
            const pA = a.priority_score || 0;
            const pB = b.priority_score || 0;
            if (pA !== pB) return pB - pA;
            return a.startTime.localeCompare(b.startTime);
        }
        return 0;
    });

    return events;
};


// --- Date Utilities ---
const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { local: 'en-US', weekday: 'short', day: 'numeric', month: 'short' });
};

const getMonthStart = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
};

const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

const getFullDateString = (date) => {
    return date.toISOString().split('T')[0];
};

const formatTime12h = (time24) => {
    if (!time24) return 'Unscheduled';
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h >= 12 ? (h % 12 || 12) : (h || 12);
    return `${h12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${suffix}`;
};

// --- DOM Rendering ---

const renderDateStrip = () => {
    const container = document.getElementById('date-strip-container');
    const monthDisplay = document.getElementById('current-month-display');
    if (!container && !document.getElementById('current-month-display-schedule')) return; // Check for both page containers

    const targetContainer = container;
    const targetMonthDisplay = monthDisplay || document.getElementById('current-month-display-schedule');

    if (!targetContainer) return;

    targetContainer.innerHTML = '';

    // Update Month Display
    const midWeek = new Date(state.weekStart);
    midWeek.setDate(state.weekStart.getDate() + 3);
    if (targetMonthDisplay) {
        targetMonthDisplay.textContent = midWeek.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    // Generate 7 days
    logDebug(`Rendering Date Strip: Start ${state.weekStart.toISOString()}`);
    for (let i = 0; i < 7; i++) {
        const date = new Date(state.weekStart);
        date.setDate(state.weekStart.getDate() + i);
        const dateStr = getFullDateString(date);
        const isSelected = dateStr === getFullDateString(state.currentDate);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = date.getDate();

        // Check for events to show dots
        const dayEvents = state.events.filter(e => (e.date === dateStr && e.is_scheduled));
        const dotsHtml = dayEvents.length > 0 ? `
            <div class="flex h-2 gap-1 mt-1">
                ${dayEvents.slice(0, 3).map(e => `
                    <div class="h-1.5 w-1.5 rounded-full ${e.type === 'work' ? 'bg-primary' : (e.type === 'personal' ? 'bg-orange-400' : 'bg-purple-400')} ${isSelected ? 'bg-white' : ''}"></div>
                `).join('')}
            </div>
        ` : `<div class="flex h-2 gap-1 mt-1"></div>`;

        const card = document.createElement('div');
        // Base classes
        let classes = "group relative flex min-w-[110px] flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md";

        // Active vs Inactive styles
        if (isSelected) {
            classes += " bg-primary shadow-primary/25 hover:shadow-primary/40 text-white ring-2 ring-offset-2 ring-primary ring-offset-background-light dark:ring-offset-background-dark";
        } else {
            classes += " border border-transparent bg-white dark:bg-surface-dark dark:shadow-none dark:hover:bg-[#23353b]";
        }
        card.className = classes;

        card.innerHTML = `
            <span class="text-sm font-medium ${isSelected ? 'text-white/90' : 'text-text-sub dark:text-gray-400'}">${dayName}</span>
            <span class="text-2xl font-extrabold ${isSelected ? 'text-white' : 'text-text-main dark:text-white'}">${dayNum}</span>
            ${dotsHtml}
        `;

        card.addEventListener('click', () => {
            state.currentDate = date;
            renderDateStrip();
            renderUpcoming();
            renderSchedule(); // Ensure schedule view updates if current date changes
        });

        targetContainer.appendChild(card);
    }
};

const createEventCard = (event) => {
    const isWork = event.type === 'work';
    const colorClass = isWork ? 'bg-primary' : (event.type === 'personal' ? 'bg-orange-400' : 'bg-purple-400');
    const borderClass = isWork ? 'hover:border-primary/20' : (event.type === 'personal' ? 'hover:border-orange-400/20' : 'hover:border-purple-400/20');
    const completedClass = event.completed ? 'opacity-50 grayscale' : '';
    const isPriority = event.priority_score && event.priority_score > 50;

    // Participants HTML
    let participantsHtml = '';
    if (event.participants && event.participants.length > 0) {
        participantsHtml = `
            <div class="flex -space-x-2">
                ${event.participants.map(url => `
                    <img alt="Participant" class="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-[#1a2c32]" src="${url}" />
                `).join('')}
            </div>
        `;
    }

    const card = document.createElement('div');
    card.dataset.id = event.id; // For Drag and Drop
    card.className = `group relative flex flex-col md:flex-row md:items-center gap-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-surface-dark p-4 shadow-sm hover:shadow-md ${borderClass} transition-all ${completedClass}`;

    card.innerHTML = `
        <div class="absolute left-0 top-3 bottom-3 w-1 rounded-r-lg ${colorClass}"></div>
        <div class="ml-2 flex items-center gap-3 md:gap-4 self-start md:self-center">
             <input type="checkbox" class="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer z-20" ${event.completed ? 'checked' : ''}>
             <div class="flex flex-row md:flex-col min-w-[80px] gap-2 md:gap-0">
                <span class="text-sm font-bold text-text-main dark:text-white">${formatTime12h(event.startTime)}</span>
                <span class="text-xs font-medium text-text-sub dark:text-gray-500">${formatTime12h(event.endTime)}</span>
            </div>
        </div>
        
        <div class="flex grow flex-col gap-1 w-full">
            <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2">
                    <h5 class="text-base font-bold text-text-main dark:text-white group-hover:text-primary transition-colors ${event.completed ? 'line-through text-gray-500' : ''}">${event.title}</h5>
                    ${isPriority ? '<span class="material-symbols-outlined text-orange-500 text-[18px]" title="High Priority">priority_high</span>' : ''}
                </div>
                <button class="edit-btn p-1 rounded-full text-text-sub hover:bg-black/5 dark:hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" title="Edit Event">
                    <span class="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button class="delete-btn p-1 rounded-full text-text-sub hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete Event">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
            </div>
            
            <div class="flex items-center gap-2 text-xs text-text-sub dark:text-gray-500">
                 ${event.estimated_energy_cost ? `<span class="flex items-center gap-0.5" title="Energy Cost"><span class="material-symbols-outlined text-[14px]">bolt</span> ${event.estimated_energy_cost}%</span>` : ''}
                 ${event.time_required ? `<span>• ${event.time_required}m</span>` : ''}
            </div>

            <p class="text-sm text-text-sub dark:text-gray-400 line-clamp-1 mt-1">${event.description}</p>
            <div class="mt-2 flex items-center gap-3">
                ${participantsHtml}
                ${event.location ? `
                <div class="flex items-center gap-1 text-xs font-medium text-text-sub dark:text-gray-400">
                    <span class="material-symbols-outlined text-[16px]">location_on</span>
                    ${event.location}
                </div>
                ` : ''}
            </div>
        </div>
    `;

    // Attach Listeners
    const checkbox = card.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', async (e) => {
        e.stopPropagation();
        const updatedEvent = { ...event, completed: e.target.checked };
        try {
            state.events = await updateEvent(updatedEvent);
            renderUpcoming();
            renderSchedule();
            renderDateStrip();
        } catch (error) {
            console.error('Failed to update event:', error);
            e.target.checked = !e.target.checked; // Revert checkbox
            alert('Failed to update event. Please try again.');
        }
    });

    const editBtn = card.querySelector('.edit-btn');
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(event);
    });

    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this event?')) {
            try {
                await eventsAPI.delete(event.id); // Call API
                // Remove from local state
                state.events = state.events.filter(ev => ev.id !== event.id);
                // Update UI
                renderUpcoming();
                renderSchedule();
                renderDateStrip();
            } catch (error) {
                console.error('Failed to delete event:', error);
                alert('Failed to delete event. Please try again.');
            }
        }
    });


    return card;
};

const renderUpcoming = () => {
    const container = document.getElementById('upcoming-events-container');
    if (!container) return;
    container.innerHTML = '';

    const dateStr = getFullDateString(state.currentDate);
    const todaysEvents = state.events
        .filter(e => e.date === dateStr && e.is_scheduled) // Only show scheduled!
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
        .slice(0, 4);

    if (todaysEvents.length === 0) {
        container.innerHTML = `<p class="col-span-2 text-center text-text-sub dark:text-gray-400 py-8">No scheduled events.</p>`;
    } else {
        // Since event cards are already functional, we simply use the existing logic
        // The homepage structure expects a grid, so we wrap cards to match the existing content structure
        todaysEvents.forEach(event => {
            // Replicate the grid item structure from HomePage.html for consistency
            const gridItem = document.createElement('div');
            gridItem.className = 'flex flex-col gap-4 rounded-xl bg-white dark:bg-surface-dark p-5 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800 transition-all hover:shadow-md hover:ring-primary/20';

            // Simplified card structure for the home page (without checkbox/edit)
            const isWork = event.type === 'work';
            const colorClass = isWork ? 'bg-primary' : (event.type === 'personal' ? 'bg-orange-400' : 'bg-purple-400');
            const hasParticipants = event.participants && event.participants.length > 0;

            gridItem.innerHTML = `
                 <div class="flex items-start justify-between">
                     <div class="flex flex-col gap-1">
                         <div class="flex items-center gap-2">
                             <span class="inline-flex h-2 w-2 rounded-full ${colorClass}"></span>
                             <p class="text-xs font-semibold uppercase tracking-wider text-text-sub dark:text-gray-400">${formatTime12h(event.startTime)} - ${formatTime12h(event.endTime)}</p>
                         </div>
                         <h4 class="text-lg font-bold text-text-main dark:text-white">${event.title}</h4>
                         <p class="text-sm text-text-sub dark:text-gray-400 line-clamp-1">${event.description}</p>
                     </div>
                     ${hasParticipants ? `
                     <div class="flex -space-x-2">
                         ${event.participants.slice(0, 2).map(url => `<img alt="Participant" class="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-[#1a2c32]" src="${url}" />`).join('')}
                         ${event.participants.length > 2 ? `<div class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 ring-2 ring-white dark:ring-[#1a2c32]"><span class="text-xs font-medium text-gray-500 dark:text-gray-300">+${event.participants.length - 2}</span></div>` : ''}
                     </div>
                     ` : ''}
                 </div>
                 <div class="mt-auto flex items-center gap-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                     ${event.location ? `
                     <div class="flex items-center gap-1.5 text-text-sub dark:text-gray-400">
                         <span class="material-symbols-outlined text-[18px]">${event.location.includes('Meet') || event.location.includes('Online') ? 'videocam' : 'location_on'}</span>
                         <span class="text-xs font-medium">${event.location}</span>
                     </div>
                     ` : ''}
                     ${event.location && (event.location.includes('Meet') || event.location.includes('Online')) ? `
                     <button class="ml-auto rounded-md bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition-colors">Join</button>
                     ` : ''}
                 </div>
             `;
            container.appendChild(gridItem);
        });
    }
};

const renderSchedule = (searchEvents = null) => {
    const container = document.getElementById('schedule-events-container');
    if (!container) return;
    container.innerHTML = '';

    // If search is active, use filtered events, otherwise use state events
    const sourceEvents = searchEvents || getProcessedEvents();

    // Only render Scheduled events in the timeline
    let events = sourceEvents.filter(e => e.is_scheduled);

    // Group by Date for display
    const grouped = {};
    events.forEach(event => {
        if (!grouped[event.date]) grouped[event.date] = [];
        grouped[event.date].push(event);
    });

    const sortedDates = Object.keys(grouped);

    // Sort sections
    if (state.sortBy === 'time-desc') {
        sortedDates.sort((a, b) => b.localeCompare(a));
    } else {
        sortedDates.sort((a, b) => a.localeCompare(b));
    }

    if (sortedDates.length === 0) {
        container.innerHTML = `<div class="flex flex-col items-center justify-center py-12 text-center">
            <span class="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600 mb-2">calendar_today</span>
            <p class="text-text-sub dark:text-gray-400">No scheduled events found.</p>
            <p class="text-xs text-gray-400 mt-1">Check your backlog or run Smart Schedule.</p>
        </div>`;
        return;
    }

    sortedDates.forEach(dateStr => {
        const dayEvents = grouped[dateStr];
        // Re-sort events within day to maintain visual order based on time
        dayEvents.sort((a, b) => a.startTime.localeCompare(b.startTime));

        const dateObj = new Date(dateStr);
        const isToday = dateStr === getFullDateString(new Date());

        const section = document.createElement('div');
        section.className = "flex flex-col gap-3";
        section.innerHTML = `
            <div class="flex items-center gap-3 pb-2 border-b border-gray-100 dark:border-gray-800/50">
                <h4 class="text-sm font-bold uppercase tracking-wider text-text-sub dark:text-primary">
                    ${isToday ? 'Today, ' : ''}${dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </h4>
                <span class="rounded-full ${isToday ? 'bg-primary/10 text-primary' : 'bg-gray-100 dark:bg-gray-800 text-text-sub'} px-2 py-0.5 text-[10px] font-bold">
                    ${dayEvents.length} Events
                </span>
            </div>
            <div class="events-list flex flex-col gap-3" data-date="${dateStr}"></div>
        `;

        const listContainer = section.querySelector('.events-list');
        dayEvents.forEach(ev => listContainer.appendChild(createEventCard(ev)));

        container.appendChild(section);
    });

    // Initialize Drag & Drop functionality
    initDragDrop(state.events, (updatedEvents) => {
        state.events = updatedEvents;
        localStorage.setItem('scheduleWise_events', JSON.stringify(state.events));
        // We do NOT call renderSchedule here to avoid infinite loops or losing the drag animation state
        // But we DO need to refresh date strip or stats if dates changed.
        // For smoothness, maybe just log it.
        console.log('Events reordered via Drag & Drop');
        renderUpcoming(); // Update Dashboard view
    });
};

const renderMonthView = () => {
    const container = document.getElementById('calendar-grid');
    const monthDisplay = document.getElementById('current-month-display-schedule');

    if (!container || !monthDisplay) return;

    container.innerHTML = '';

    // Update Header
    monthDisplay.textContent = state.weekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const year = state.weekStart.getFullYear();
    const month = state.weekStart.getMonth(); // 0-indexed

    const firstDayOfMonth = new Date(year, month, 1);
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)

    // Adjust for Monday start (0=Mon, 6=Sun)
    // JS getDay(): 0=Sun, 1=Mon...
    // We want 0=Mon...
    const adjustedStartDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

    const daysInMonth = getDaysInMonth(state.weekStart);

    // Previous Month Fillers
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = adjustedStartDay - 1; i >= 0; i--) {
        const dayDiv = document.createElement('div');
        dayDiv.className = "min-h-[100px] border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black/20 p-2 text-gray-300 dark:text-gray-700 rounded-lg";
        dayDiv.innerHTML = `<span class="text-sm font-medium">${prevMonthDays - i}</span>`;
        container.appendChild(dayDiv);
    }

    // Current Month Days
    for (let day = 1; day <= daysInMonth; day++) {
        const currentLoopDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = currentLoopDateStr === getFullDateString(new Date());

        const dayDiv = document.createElement('div');
        dayDiv.className = `min-h-[100px] border ${isToday ? 'border-primary ring-1 ring-primary' : 'border-gray-100 dark:border-gray-800'} bg-white dark:bg-surface-dark p-2 rounded-lg transition-all hover:shadow-md flex flex-col gap-1 overflow-visible relative group`;

        dayDiv.innerHTML = `<span class="text-sm font-bold ${isToday ? 'text-primary' : 'text-text-main dark:text-white'} mb-1">${day}</span>`;

        // Render events for this day
        const dayEvents = state.events.filter(e => e.date === currentLoopDateStr && e.is_scheduled);
        // Sort by time
        dayEvents.sort((a, b) => a.startTime.localeCompare(b.startTime));

        dayEvents.forEach(ev => {
            const evEl = document.createElement('div');
            const isWork = ev.type === 'work';
            const bgClass = isWork ? 'bg-primary/10 text-primary border-primary/20' : (ev.type === 'personal' ? 'bg-orange-400/10 text-orange-500 border-orange-400/20' : 'bg-purple-400/10 text-purple-500 border-purple-400/20');

            evEl.className = `text-[10px] px-1.5 py-0.5 rounded border ${bgClass} truncate font-medium cursor-pointer hover:opacity-80`;
            evEl.textContent = ev.title;
            evEl.title = `${ev.title} (${formatTime12h(ev.startTime)})`;

            evEl.addEventListener('click', (e) => {
                e.stopPropagation();
                openEditModal(ev);
            });

            dayDiv.appendChild(evEl);
        });

        // Add create event on click empty space
        dayDiv.addEventListener('click', () => {
            // Open modal pre-filled with this date
            const modal = document.getElementById('add-event-modal');
            const form = document.getElementById('add-event-form');
            if (modal && form) {
                // Manually trigger the "Add Event" logic but pre-fill date
                const addBtn = document.querySelector('button'); // Just to reuse logic if needed, or call direct
                // Better: Reuse initModal logic by calling showModal if exposed, or re-implementing basic open
                // For now, let's just trigger the modal helper manually if possible or simulate click
                // Actually, let's just set the date input and show modal
                const dateInput = form.querySelector('[name="date"]');
                if (dateInput) dateInput.value = currentLoopDateStr;

                // Show modal logic duplicate (simplified)
                form.querySelector('[name="id"]').value = '';
                modal.classList.remove('hidden');
                modal.classList.add('flex');
                document.querySelector('#add-event-modal h3').textContent = 'Add New Event';
                form.querySelector('button[type="submit"]').textContent = 'Save Event';
            }
        });

        container.appendChild(dayDiv);
    }
};

const updateView = () => {
    const listContainer = document.getElementById('schedule-events-container');
    const monthContainer = document.getElementById('month-view-container');
    const dateStrip = document.getElementById('date-strip-container').parentElement; // Parent wrapper

    const listBtn = document.getElementById('view-list-btn');
    const monthBtn = document.getElementById('view-month-btn');

    if (state.viewMode === 'list') {
        listContainer.classList.remove('hidden');
        monthContainer.classList.add('hidden');
        dateStrip.classList.remove('hidden');

        // Update buttons
        listBtn.className = "p-1.5 rounded-md text-primary bg-primary/10 transition-colors";
        monthBtn.className = "p-1.5 rounded-md text-text-sub dark:text-gray-400 hover:text-primary transition-colors";

        renderSchedule();
    } else {
        listContainer.classList.add('hidden');
        monthContainer.classList.remove('hidden');
        dateStrip.classList.add('hidden'); // Hide weekly strip in month view

        // Update buttons
        listBtn.className = "p-1.5 rounded-md text-text-sub dark:text-gray-400 hover:text-primary transition-colors";
        monthBtn.className = "p-1.5 rounded-md text-primary bg-primary/10 transition-colors";

        renderMonthView();
    }
};

// --- Scheduling Logic Integration ---

const handleAutoSchedule = () => {
    // 1. Run Triage (DTTP)
    // Update global state events with fresh priority scores
    const triagedEvents = runDTTP(state.events);

    // 2. Run Assignment (EOAA)
    // Try to schedule for 'Current Selected Date' (or ideally iterate next few days)
    // For demo, we schedule for today
    const targetDateStr = getFullDateString(state.currentDate);

    // NOTE: The current EOAA implementation schedules for the targetDateStr which is currently hardcoded to 2023-10-25.
    const scheduledEvents = runEOAA(triagedEvents, userProfile, targetDateStr);

    // Save everything
    state.events = scheduledEvents;
    localStorage.setItem('scheduleWise_events', JSON.stringify(state.events));

    renderUpcoming();
    renderSchedule();
    renderDateStrip();

    alert('AI Scheduling Complete! Backlog items have been assigned to optimal energy slots.');
};

// --- Modal & Form Handling ---

// Helper to open modal with data
const openEditModal = (event) => {
    const modal = document.getElementById('add-event-modal');
    const form = document.getElementById('add-event-form');
    const title = modal.querySelector('h3');
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!modal || !form) return;

    // Fill inputs
    form.querySelector('[name="id"]').value = event.id;
    form.querySelector('[name="title"]').value = event.title;
    form.querySelector('[name="date"]').value = event.date;
    form.querySelector('[name="type"]').value = event.type;
    form.querySelector('[name="startTime"]').value = event.startTime;
    form.querySelector('[name="endTime"]').value = event.endTime;
    form.querySelector('[name="location"]').value = event.location || '';
    form.querySelector('[name="description"]').value = event.description || '';

    // Update Title & Button
    title.textContent = 'Edit Event';
    submitBtn.textContent = 'Update Event';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

const initModal = () => {
    const modal = document.getElementById('add-event-modal');
    const form = document.getElementById('add-event-form');
    // Select all buttons that contain "Add Event" text
    const addBtns = Array.from(document.querySelectorAll('button')).filter(btn => btn.textContent.includes('Add Event'));
    const cancelBtn = document.getElementById('cancel-modal-btn');
    const title = modal ? modal.querySelector('h3') : null;
    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

    if (!modal || !form) return;

    const showModal = () => {
        form.reset();
        form.querySelector('[name="id"]').value = ''; // Clear ID for new event
        // Clear date/time fields to prevent bugs
        form.querySelector('[name="date"]').value = '';
        form.querySelector('[name="startTime"]').value = '';
        form.querySelector('[name="endTime"]').value = '';

        // NEW: Reset required attributes if they were modified (they are now optional in HTML)
        form.querySelector('[name="startTime"]').required = false;
        form.querySelector('[name="endTime"]').required = false;

        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        const dateInput = form.querySelector('[name="date"]');
        if (dateInput) {
            dateInput.setAttribute('min', today);
        }

        if (title) title.textContent = 'Add New Event';
        if (submitBtn) submitBtn.textContent = 'Save Event';
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    };

    const hideModal = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        form.reset();
        form.querySelector('[name="id"]').value = '';
    };

    addBtns.forEach(btn => btn.addEventListener('click', showModal));

    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideModal);
    }

    // Close on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) hideModal();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const eventId = formData.get('id');

        let newEvent = {
            id: eventId || Date.now().toString(),
            title: formData.get('title'),
            date: formData.get('date'),
            type: formData.get('type'),
            startTime: formData.get('startTime') || '',
            endTime: formData.get('endTime') || '',
            location: formData.get('location'),
            description: formData.get('description'),
            participants: eventId ? (state.events.find(e => e.id === eventId)?.participants || []) : [],
            completed: eventId ? (state.events.find(e => e.id === eventId)?.completed || false) : false,
            // Defaults for manual entry
            is_scheduled: !!(formData.get('startTime') && formData.get('endTime')),
            priority_score: 50,
            estimated_energy_cost: 50,
            time_required: 60
        };

        // Show loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        try {
            // LOSA Trigger Check: Conflict?
            // Simple logic: If manual entry overlaps with existing, run LOSA
            const hasOverlap = state.events.some(e =>
                e.date === newEvent.date &&
                e.id !== newEvent.id &&
                e.is_scheduled &&
                // Overlap check
                (newEvent.startTime < e.endTime && newEvent.endTime > e.startTime)
            );

            if (hasOverlap) {
                // Run LOSA
                const updatedWithDisplacement = runLOSA(newEvent, state.events, userProfile);
                state.events = updatedWithDisplacement;
                localStorage.setItem('scheduleWise_events', JSON.stringify(state.events));
                alert('Notice: High priority event inserted. Conflicting tasks have been shifted (LOSA).');
            } else {
                if (eventId) {
                    state.events = await updateEvent(newEvent);
                } else {
                    state.events = await saveEvent(newEvent);
                }
            }

            renderUpcoming();
            renderSchedule();
            renderDateStrip(); // In case date matches
            hideModal();
        } catch (error) {
            console.error('Failed to save event:', error);
            alert('Failed to save event: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = eventId ? 'Update Event' : 'Save Event';
        }
    });
};

const initFilterSort = () => {
    const filterBtn = document.getElementById('filter-btn');
    const sortBtn = document.getElementById('sort-btn');
    const filterDropdown = document.getElementById('filter-dropdown');
    const sortDropdown = document.getElementById('sort-dropdown');

    if (!filterBtn || !sortBtn) return;

    // --- NEW: Function to manage active state classes ---
    const setActiveDropdownState = () => {
        // Handle Filter Dropdown (State: state.filterBy)
        filterDropdown.querySelectorAll('button').forEach(btn => {
            const isActive = btn.dataset.filter === state.filterBy;
            if (isActive) {
                // Active classes
                btn.classList.add('bg-primary/10', 'text-primary', 'font-semibold');
                btn.classList.remove('text-text-main', 'dark:text-white', 'hover:bg-gray-50', 'dark:hover:bg-white/5', 'font-medium');
            } else {
                // Inactive classes
                btn.classList.remove('bg-primary/10', 'text-primary', 'font-semibold');
                btn.classList.add('text-text-main', 'dark:text-white', 'hover:bg-gray-50', 'dark:hover:bg-white/5', 'font-medium');
            }
        });

        // Handle Sort Dropdown (State: state.sortBy)
        sortDropdown.querySelectorAll('button').forEach(btn => {
            const isActive = btn.dataset.sort === state.sortBy;
            if (isActive) {
                // Active classes
                btn.classList.add('bg-primary/10', 'text-primary', 'font-semibold');
                btn.classList.remove('text-text-main', 'dark:text-white', 'hover:bg-gray-50', 'dark:hover:bg-white/5', 'font-medium');
            } else {
                // Inactive classes
                btn.classList.remove('bg-primary/10', 'text-primary', 'font-semibold');
                btn.classList.add('text-text-main', 'dark:text-white', 'hover:bg-gray-50', 'dark:hover:bg-white/5', 'font-medium');
            }
        });
    };
    // --- END setActiveDropdownState ---


    // 1. Initial State Check
    setActiveDropdownState();

    // Toggle Handlers
    filterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        filterDropdown.classList.toggle('hidden');
        filterDropdown.classList.toggle('flex');
        sortDropdown.classList.add('hidden'); // Close other
        sortDropdown.classList.remove('flex');
    });

    sortBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sortDropdown.classList.toggle('hidden');
        sortDropdown.classList.toggle('flex');
        filterDropdown.classList.add('hidden'); // Close other
        filterDropdown.classList.remove('flex');
    });

    // Option Clicks
    filterDropdown.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            state.filterBy = btn.dataset.filter;
            renderSchedule();
            setActiveDropdownState(); // Update active state after click
            filterDropdown.classList.add('hidden');
            filterDropdown.classList.remove('flex');
        });
    });

    sortDropdown.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            state.sortBy = btn.dataset.sort;
            renderSchedule();
            setActiveDropdownState(); // Update active state after click
            sortDropdown.classList.add('hidden');
            sortDropdown.classList.remove('flex');
        });
    });

    // Close on click outside
    document.addEventListener('click', () => {
        if (filterDropdown) {
            filterDropdown.classList.add('hidden');
            filterDropdown.classList.remove('flex');
        }
        if (sortDropdown) {
            sortDropdown.classList.add('hidden');
            sortDropdown.classList.remove('flex');
        }
    });
};

const initViewToggle = () => {
    const listBtn = document.getElementById('view-list-btn');
    const monthBtn = document.getElementById('view-month-btn');

    if (listBtn && monthBtn) {
        listBtn.addEventListener('click', () => {
            state.viewMode = 'list';
            updateView();
        });

        monthBtn.addEventListener('click', () => {
            state.viewMode = 'month';
            state.weekStart.setDate(1);
            updateView();
        });
    }
};

const injectSmartButton = () => {
    // Inject "Smart Schedule" button near the "Filter" area on Schedule Page
    // Look for the "Filter" button container
    const filterBtn = document.getElementById('filter-btn');
    if (filterBtn && filterBtn.parentElement && filterBtn.parentElement.parentElement) {
        const container = filterBtn.parentElement.parentElement;

        // Prevent duplicate injection
        if (document.getElementById('smart-schedule-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'smart-schedule-btn';
        // Using Primary color for consistency instead of a hardcoded indigo/purple gradient
        btn.className = "flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white shadow-md shadow-primary/20 hover:shadow-primary/40 border border-transparent text-sm font-bold transition-all active:scale-95 ml-2";
        btn.innerHTML = `<span class="material-symbols-outlined text-[18px]">auto_awesome</span> Smart Schedule`;

        btn.addEventListener('click', handleAutoSchedule);

        // Insert before Filter
        container.insertBefore(btn, container.firstChild);
    }
};

const initDateNavigation = () => {
    // Event Listeners for Date Navigation (Dashboard Page)
    const prevBtnHome = document.getElementById('prev-week-btn');
    const nextBtnHome = document.getElementById('next-week-btn');

    if (prevBtnHome) {
        prevBtnHome.addEventListener('click', () => {
            state.weekStart.setDate(state.weekStart.getDate() - 7);
            renderDateStrip();
            renderUpcoming();
            renderSchedule();
        });
    }

    if (nextBtnHome) {
        nextBtnHome.addEventListener('click', () => {
            state.weekStart.setDate(state.weekStart.getDate() + 7);
            renderDateStrip();
            renderUpcoming();
            renderSchedule();
        });
    }

    // Event Listeners for Date Navigation (Schedule Page)
    const prevBtnSchedule = document.getElementById('prev-week-btn-schedule');
    const nextBtnSchedule = document.getElementById('next-week-btn-schedule');

    if (prevBtnSchedule) {
        prevBtnSchedule.addEventListener('click', () => {
            if (state.viewMode === 'month') {
                // Move by month
                state.weekStart.setMonth(state.weekStart.getMonth() - 1);
                state.weekStart.setDate(1);
                renderMonthView();
            } else {
                state.weekStart.setDate(state.weekStart.getDate() - 7);
                renderDateStrip();
                renderSchedule();
            }
        });
    }

    if (nextBtnSchedule) {
        nextBtnSchedule.addEventListener('click', () => {
            if (state.viewMode === 'month') {
                // Move by month
                state.weekStart.setMonth(state.weekStart.getMonth() + 1);
                state.weekStart.setDate(1);
                renderMonthView();
            } else {
                state.weekStart.setDate(state.weekStart.getDate() + 7);
                renderDateStrip();
                renderSchedule();
            }
        });
    }
};


const initNotificationUI = () => {
    const bellBtn = document.getElementById('notification-btn');
    if (bellBtn) {
        // Check current state
        if (Notification.permission === "granted") {
            bellBtn.querySelector('span').classList.add('text-primary', 'fill-current');
            startNotificationLoop(state.events);
        }

        bellBtn.addEventListener('click', async () => {
            // If already granted, maybe just say "Active"
            if (Notification.permission === "granted") {
                alert("Notifications are already active.");
                return;
            }

            const granted = await requestNotificationPermission();
            if (granted) {
                bellBtn.querySelector('span').classList.add('text-primary', 'fill-current');
                alert("Notifications Enabled! You'll get reminders 10m before events.");
                startNotificationLoop(state.events);
            }
        });
    }
};

const init = async () => {
    try {
        // Load data from backend
        state.events = await loadEvents();
        await loadUserProfile();

        // Render UI
        renderUpcoming();
        renderSchedule();
        renderDateStrip();
        initModal();
        initFilterSort();
        initViewToggle();
        injectSmartButton(); // Add the magic button
        initDateNavigation(); // Initialize date arrows
        initNotificationUI();

        // Event Listeners for Search
        const searchInput = document.querySelector('input[placeholder="Search events..."]');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const filtered = state.events.filter(ev =>
                    ev.title.toLowerCase().includes(query) ||
                    ev.description.toLowerCase().includes(query)
                );
                renderSchedule(filtered);
            });
        }
    } catch (error) {
        console.error('Initialization error:', error);
        alert('Failed to load data. Please refresh the page.');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    try {
        if (document.getElementById('debug-log')) document.getElementById('debug-log').innerHTML = 'Init Started...';
        init();
    } catch (e) {
        alert("Init Error: " + e.message + "\n" + e.stack);
    }
});