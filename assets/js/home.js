loadHeader("index.html");

// home.js 
const saved = JSON.parse(localStorage.getItem('LE_settings') || '{}');

// Pre-select saved radius radio
if (saved.radiusKm) {
    const radio = document.querySelector(`input[name="radiusKm"][value="${saved.radiusKm}"]`);
    if (radio) radio.checked = true;
}

// Pre-activate saved category chips
if (saved.categories?.length) {
    document.querySelectorAll('.chip[data-category]').forEach(chip => {
        if (saved.categories.includes(chip.dataset.category)) {
            chip.classList.add('selected');
        }
    });
}



const form = document.getElementById('searchForm');
const pcInput = document.getElementById('postcode');

//  - makes chips toggleable
document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', function () {
        this.classList.toggle('selected');
    });
});

document.getElementById('useLocationBtn').addEventListener('click', function () {
    const categories = getSelectedCategories();

    if (categories.length === 0) {
        showMessage('Please select at least one category first.');
        return;
    }

    if (!navigator.geolocation) {
        showMessage('Your browser does not support location. Please enter a postcode.');
        return;
    }

    showMessage('Getting your location…');

    navigator.geolocation.getCurrentPosition(
        // ── Success ──────────────────────────────────
        async function (position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            // Reverse geocode to get the postcode
            const response = await fetch(
                `https://api.postcodes.io/postcodes?lon=${lng}&lat=${lat}&limit=1`
            );
            const data = await response.json();

            if (!data.result || data.result.length === 0) {
                showMessage('Could not find a postcode at your location. Please enter one manually.');
                return;
            }

            const postcode = data.result[0].postcode;

            // Show it in the input field so the user can see it
            document.getElementById('postcode').value = postcode;

            sessionStorage.setItem('LE_search', JSON.stringify({
                postcode: postcode,
                lat: lat,
                lng: lng,
                categories: categories,
                radiusKm: getSelectedRadius(),
            }));

            window.location.href = 'results.html';
        },
        // ── Error ─────────────────────────────────────
        function (err) {
            if (err.code === 1) {
                // User clicked "Block"
                showMessage('Location access was denied. Please enter a postcode instead.');
            } else if (err.code === 2) {
                // No GPS / can't determine location (common on desktop)
                showMessage('Your device could not determine your location. Please enter a postcode instead.');
            } else if (err.code === 3) {
                // Took too long
                showMessage('Location request timed out. Please enter a postcode instead.');
            }
        }

    );
});


form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const postcode = pcInput.value.trim().toUpperCase();
    const categories = getSelectedCategories();

    if (!postcode) {
        showMessage('Please enter a postcode.');
        return;
    }

    if (categories.length === 0) {
        showMessage('Please select at least one category.');
        return;
    }

    showMessage('Looking up postcode…');

    const response = await fetch(`https://api.postcodes.io/postcodes/${postcode}`);
    const data = await response.json();

    if (data.status !== 200) {
        showMessage('Postcode not found. Please check and try again.');
        return;
    }

    sessionStorage.setItem('LE_search', JSON.stringify({
        postcode: data.result.postcode,
        lat: data.result.latitude,
        lng: data.result.longitude,
        categories: categories,
        radiusKm: getSelectedRadius(),
    }));

    window.location.href = 'results.html';
});

function getSelectedCategories() {
    return [...document.querySelectorAll('.chip.selected')]
        .map(chip => chip.dataset.category);
}

function showMessage(text) {
    document.getElementById('messageText').textContent = text;
}

function getSelectedRadius() {
    const checked = document.querySelector('input[name="radiusKm"]:checked');
    return checked ? Number(checked.value) : 3; // fallback to 3km
}