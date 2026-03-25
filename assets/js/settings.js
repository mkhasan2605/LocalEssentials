loadHeader("settings.html");

// settings.js

const SETTINGS_KEY = 'LE_settings';

// ── 1. Load saved settings when page opens ────
const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');

// Restore radius chip
const defaultRadius = saved.radiusKm ?? 3;
document.querySelectorAll('.chip[data-radius]').forEach(chip => {
    if (Number(chip.dataset.radius) === defaultRadius) {
        chip.classList.add('selected');
    }
    chip.addEventListener('click', function () {
        // Deselect all radius chips, then select this one
        document.querySelectorAll('.chip[data-radius]').forEach(c => c.classList.remove('selected'));
        this.classList.add('selected');
        document.getElementById('defaultRadius').value = this.dataset.radius;
    });
});
document.getElementById('defaultRadius').value = defaultRadius;

// Restore checkboxes
const savedCategories = saved.categories ?? [];
document.querySelectorAll('input[name="essentials"]').forEach(checkbox => {
    if (savedCategories.includes(checkbox.value)) {
        checkbox.checked = true;
    }
});

// Restore theme and text size
if (saved.theme) document.getElementById('theme').value = saved.theme;
if (saved.textSize) document.getElementById('textSize').value = saved.textSize;

// ── 2. Save when form is submitted ────────────
document.getElementById('settingsForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const radiusKm = Number(document.getElementById('defaultRadius').value);

    const categories = [...document.querySelectorAll('input[name="essentials"]:checked')]
        .map(cb => cb.value);

    const theme = document.getElementById('theme').value;
    const textSize = document.getElementById('textSize').value;

    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        radiusKm,
        categories,
        theme,
        textSize,
    }));

    document.getElementById('settingsMessage').textContent = 'Settings saved!';

    // Clear the message after 2 seconds
    setTimeout(() => {
        document.getElementById('settingsMessage').textContent = '';
    }, 2000);
});