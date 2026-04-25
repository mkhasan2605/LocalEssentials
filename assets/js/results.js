loadHeader("results.html");


// results.js


// CATEGORY CONFIG — tags, icons, display labels

const CATEGORY_CONFIG = {
    hospital: { tag: 'amenity=hospital', icon: '🏥', label: 'Hospital' },
    gp: { tag: 'amenity=doctors', icon: '🩺', label: 'GP Surgery' },
    pharmacy: { tag: 'amenity=pharmacy', icon: '💊', label: 'Pharmacy' },
    police: { tag: 'amenity=police', icon: '🚓', label: 'Police' },
    fire_station: { tag: 'amenity=fire_station', icon: '🚒', label: 'Fire Station' },
    supermarket: { tag: 'shop=supermarket', icon: '🛒', label: 'Supermarket' },
};

const raw = sessionStorage.getItem('LE_search');
const search = raw ? JSON.parse(raw) : null;

if (!search) {
    window.location.href = 'index.html';
}

document.getElementById('resultsSummary').textContent =
    `For: ${search.postcode} • Sorted by nearest`;

fetchNearby(search.lat, search.lng, search.categories);

async function fetchNearby(lat, lng, categories) {
    const statusEl = document.getElementById('resultsStatus');
    showSpinner();

    const radiusMetres = (search.radiusKm ?? 3) * 1000; // ← was hardcoded 3000

    const filters = categories.map(cat => {
        const tag = CATEGORY_TAGS[cat];
        const [key, val] = tag.split('=');
        return `node["${key}"="${val}"](around:${radiusMetres},${lat},${lng});
            way["${key}"="${val}"](around:${radiusMetres},${lat},${lng});`;
    }).join('\n');

    const query = `[out:json][timeout:25];(\n${filters}\n);out center;`;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query),
    });

    const data = await response.json();

    if (data.elements.length === 0) {
        statusEl.innerHTML = '<p>No results found. Try a wider radius.</p>';
        return;
    }

    const sorted = data.elements
        .map(el => ({
            ...el,
            distanceM: calcDistance(lat, lng, el.lat ?? el.center?.lat, el.lon ?? el.center?.lon)
        }))
        .sort((a, b) => a.distanceM - b.distanceM);

    statusEl.innerHTML = `<p>${sorted.length} place(s) found.</p>`;
    showResults(sorted);
}

function showResults(elements) {
    const list = document.getElementById('resultsList');
    const favs = getFavourites();

    list.innerHTML = elements.map(el => {
        const name = el.tags?.name ?? 'Unnamed';
        const category = el.tags?.amenity ?? el.tags?.shop ?? '';
        const dist = formatDistance(el.distanceM);
        const elLat = el.lat ?? el.center?.lat;
        const elLng = el.lon ?? el.center?.lon;

        const address = [
            el.tags?.['addr:housenumber'],
            el.tags?.['addr:street'],
            el.tags?.['addr:city'],
            el.tags?.['addr:postcode'],
        ].filter(Boolean).join(', ');

        const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${elLat},${elLng}`;

        // Check if already saved
        const isSaved = favs.some(f => f.id === el.id);

        return `
      <div class="card">
        <h3>${name}</h3>
        <p>${category}</p>
        ${address ? `<p>${address}</p>` : ''}
        <p>${dist} away</p>
        <div style="display:flex; gap:8px; margin-top:8px;">
          <a href="${directionsUrl}" target="_blank" class="btn btn-secondary">Directions</a>
          <button class="btn btn-secondary btn-save"
                  data-id="${el.id}"
                  data-name="${name}"
                  data-category="${category}"
                  data-lat="${elLat}"
                  data-lng="${elLng}"
                  data-address="${address}">
            ${isSaved ? '★ Saved' : '☆ Save'}
          </button>
        </div>
      </div>
    `;
    }).join('');

    // Wire up save buttons AFTER the HTML is in the page
    list.querySelectorAll('.btn-save').forEach(btn => {
        btn.addEventListener('click', function () {
            const item = {
                id: Number(this.dataset.id),
                name: this.dataset.name,
                category: this.dataset.category,
                lat: this.dataset.lat,
                lng: this.dataset.lng,
                address: this.dataset.address,
            };

            const added = saveFavourite(item);
            this.textContent = added ? '★ Saved' : '☆ Save';
        });
    });
}

function calcDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLng = (lng2 - lng1) * rad;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(a));
}

function formatDistance(metres) {
    return metres < 1000
        ? `${Math.round(metres)} m`
        : `${(metres / 1000).toFixed(1)} km`;
}

function getFavourites() {
    return JSON.parse(localStorage.getItem('LE_favs') || '[]');
}

function saveFavourite(item) {
    const favs = getFavourites();
    const alreadySaved = favs.some(f => f.id === item.id);

    if (alreadySaved) {
        // Remove it
        const updated = favs.filter(f => f.id !== item.id);
        localStorage.setItem('LE_favs', JSON.stringify(updated));
        return false; // removed
    } else {
        // Add it
        favs.push(item);
        localStorage.setItem('LE_favs', JSON.stringify(favs));
        return true; // saved
    }
}

// Loading Spinning wheel 
function showSpinner() {
    document.getElementById('resultsStatus').innerHTML = `
        <div class="spinner-wrap">
            <div class="spinner"></div>
            <p class="spinner-text">Finding nearby places&hellip;</p>
        </div>`;
}

function showStatus(html) {
    document.getElementById('resultsStatus').innerHTML = html;
}