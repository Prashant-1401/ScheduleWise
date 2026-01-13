import { userProfile, saveUserProfile } from './data.js';

// --- Presets ---
const PRESETS = {
    lark: [
        50, 50, 50, 50, 60, 90, 100, 100, 90, 80, 70, 60, // 0-11
        60, 50, 40, 50, 60, 50, 40, 30, 20, 20, 20, 20   // 12-23
    ],
    owl: [
        80, 70, 60, 40, 30, 20, 20, 30, 40, 50, 60, 60, // 0-11
        60, 70, 80, 90, 100, 100, 100, 90, 80, 70, 60, 80 // 12-23
    ],
    balanced: [
        40, 40, 40, 40, 50, 60, 70, 80, 90, 90, 90, 80, // 0-11
        70, 70, 70, 70, 70, 70, 60, 50, 40, 30, 30, 30  // 12-23
    ]
};

// --- DOM Elements ---
const graphContainer = document.getElementById('equalizer-graph');
const sliderRow = document.getElementById('slider-row');
const saveBtn = document.getElementById('save-profile-btn');
const resetBtn = document.getElementById('reset-btn');

// --- Helper: Get Color from value ---
const getColor = (value) => {
    // Gradient from Purple (Low) to Primary/Cyan (High)
    // Low (0-30): #a855f7 (Purple-500)
    // Mid (31-70): #3b82f6 (Blue-500)
    // High (71-100): #30c9e8 (Primary)
    if (value < 40) return 'bg-purple-400';
    if (value < 75) return 'bg-blue-400';
    return 'bg-primary'; // Cyan
};

const renderUI = (curve) => {
    graphContainer.innerHTML = '';
    sliderRow.innerHTML = '';

    curve.forEach((value, hour) => {
        // 1. Bar Visualization
        const barWrapper = document.createElement('div');
        barWrapper.className = "flex flex-col items-center justify-end h-full flex-1 gap-1 group relative";

        const bar = document.createElement('div');
        bar.className = `w-full rounded-t-sm transition-all duration-300 ${getColor(value)} opacity-80 group-hover:opacity-100`;
        bar.style.height = `${value}%`;

        // Tooltip
        const tooltip = document.createElement('div');
        tooltip.className = "absolute -top-8 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none";
        tooltip.textContent = `${hour}:00 - ${value}%`;

        barWrapper.appendChild(tooltip);
        barWrapper.appendChild(bar);
        graphContainer.appendChild(barWrapper);

        // 2. Slider Input
        const sliderWrapper = document.createElement('div');
        sliderWrapper.className = "flex flex-col items-center flex-1 min-w-[20px]";

        const range = document.createElement('input');
        range.type = 'range';
        range.min = 0;
        range.max = 100;
        range.value = value;
        range.step = 5;
        // Vertical hack handled in CSS mostly, but classes help structure
        range.className = "accent-primary cursor-pointer hover:accent-purple-500 h-24 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md";
        // Note: Tailwind accent util handles color, custom CSS in HTML handles orientation for webkit

        range.style.writingMode = 'bt-lor';
        range.setAttribute('orient', 'vertical');

        range.addEventListener('input', (e) => {
            const newVal = parseInt(e.target.value, 10);
            bar.style.height = `${newVal}%`;
            bar.className = `w-full rounded-t-sm transition-all duration-300 ${getColor(newVal)} opacity-80 group-hover:opacity-100`;
            tooltip.textContent = `${hour}:00 - ${newVal}%`;
            userProfile.energy_curve[hour] = newVal;
        });

        const label = document.createElement('span');
        label.className = "text-[10px] text-text-sub dark:text-gray-500 mt-2 font-mono";
        label.textContent = hour % 6 === 0 ? hour : '·'; // Only show label every 6 hours

        sliderWrapper.appendChild(range);
        sliderWrapper.appendChild(label);
        sliderRow.appendChild(sliderWrapper);
    });
};

const init = () => {
    // Initial Render
    renderUI(userProfile.energy_curve);

    // Preset Handlers
    document.getElementById('preset-lark').addEventListener('click', async () => {
        try {
            Object.assign(userProfile.energy_curve, PRESETS.lark);
            await saveUserProfile({ energy_curve: PRESETS.lark });
            renderUI(PRESETS.lark);
        } catch (error) {
            console.error('Failed to save preset:', error);
            alert('Failed to save preset. Please try again.');
        }
    });

    document.getElementById('preset-owl').addEventListener('click', async () => {
        try {
            Object.assign(userProfile.energy_curve, PRESETS.owl);
            await saveUserProfile({ energy_curve: PRESETS.owl });
            renderUI(PRESETS.owl);
        } catch (error) {
            console.error('Failed to save preset:', error);
            alert('Failed to save preset. Please try again.');
        }
    });

    document.getElementById('preset-balanced').addEventListener('click', async () => {
        try {
            Object.assign(userProfile.energy_curve, PRESETS.balanced);
            await saveUserProfile({ energy_curve: PRESETS.balanced });
            renderUI(PRESETS.balanced);
        } catch (error) {
            console.error('Failed to save preset:', error);
            alert('Failed to save preset. Please try again.');
        }
    });

    // Save Button
    saveBtn.addEventListener('click', async () => {
        const originalText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        try {
            await saveUserProfile(userProfile);
            // Visual feedback
            saveBtn.innerHTML = `<span class="material-symbols-outlined text-[20px]">check</span> Saved!`;
            saveBtn.classList.add('bg-green-500', 'hover:bg-green-600');
            saveBtn.classList.remove('bg-primary', 'hover:bg-primary/90');

            setTimeout(() => {
                saveBtn.innerHTML = originalText;
                saveBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
                saveBtn.classList.add('bg-primary', 'hover:bg-primary/90');
                saveBtn.disabled = false;
            }, 2000);
        } catch (error) {
            console.error('Failed to save profile:', error);
            alert('Failed to save profile: ' + error.message);
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    });

    // Reset Button
    resetBtn.addEventListener('click', () => {
        // Reload default curve from data.js (simulated by just reloading page or re-fetching default if we kept it)
        // For simplicity: Load "Balanced" on reset
        Object.assign(userProfile.energy_curve, PRESETS.balanced);
        renderUI(PRESETS.balanced);
    });
};

document.addEventListener('DOMContentLoaded', init);
