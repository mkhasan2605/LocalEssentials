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


// Load Search State

const raw = sessionStorage.getItem('LE_search');
const search = raw ? JSON.parse(raw) : null;

if (!search) { window.location.href = 'index.html'; }

document.getElementById('resultsSummary').textContent =
    `For: ${search.postcode} • Sorted by nearest`;

document.getElementById('selectedRadius').textContent =
    `${search.radiusKm ?? 3} km`;

const catChipsEl = document.getElementById('selectedCategories');
(search.categories || []).forEach(cat => {
    const cfg = CATEGORY_CONFIG[cat];
    const chip = document.createElement('span');
    chip.className = 'chip selected';
    chip.textContent = cfg ? `${cfg.icon} ${cfg.label}` : cat;
    catChipsEl.appendChild(chip);
});


// FETCH NEARBY PLACES

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

    try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query),
    });
    const data = await response.json();

        if (!data.elements || data.elements.length === 0) {
            showStatus('<p>No results found. Try a wider radius or a different category.</p>');
        return;
    }

    const sorted = data.elements
        .map(el => ({
            ...el,
                distanceM: calcDistance(
                    lat, lng,
                    el.lat ?? el.center?.lat,
                    el.lon ?? el.center?.lon
                ),
        }))
        .sort((a, b) => a.distanceM - b.distanceM);

        showStatus(`<p>${sorted.length} place(s) found.</p>`);
    showResults(sorted);

    } catch (err) {
        showStatus('<p>Could not load results. Please check your connection and try again.</p>');
        console.error(err);
    }
}


// 4. RENDER LIST RESULTS (with icons)

function showResults(elements) {
    const list = document.getElementById('resultsList');
    const favs = getFavourites();

    list.innerHTML = elements.map(el => {
        const rawCategory = el.tags?.amenity ?? el.tags?.shop ?? '';
        const catKey = getCategoryKey(rawCategory);
        const cfg = CATEGORY_CONFIG[catKey] ?? { icon: '📍', label: rawCategory };

        const name = el.tags?.name ?? 'Unnamed';
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
        const isSaved = favs.some(f => f.id === el.id);

        return `
      <div class="card result-card">
        <div class="result-card-inner">
          <span class="result-icon" title="${cfg.label}">${cfg.icon}</span>
          <div class="result-body">
            <h3 class="result-name">${name}</h3>
            <p class="result-meta">
              <span class="result-category">${cfg.label}</span>
              <span class="result-dist">&middot; ${dist} away</span>
            </p>
            ${address ? `<p class="result-address">${address}</p>` : ''}
          </div>
        </div>
        <div class="result-actions">
          <a href="${directionsUrl}" target="_blank" class="btn btn-secondary">Directions</a>
          <button class="btn btn-secondary btn-save ${isSaved ? 'saved' : ''}"
                  data-id="${el.id}"
                  data-name="${name}"
                  data-category="${cfg.label}"
                  data-lat="${elLat}"
                  data-lng="${elLng}"
                  data-address="${address}">
            ${isSaved ? '★ Saved' : '☆ Save'}
          </button>
        </div>
      </div>`;
    }).join('');

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
            this.classList.toggle('saved', added);
            playFeedback(added);
        });
    });
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

// ─────────────────────────────────────────────
// 7. HELPERS
// ─────────────────────────────────────────────
function getCategoryKey(osmValue) {
    return Object.keys(CATEGORY_CONFIG).find(
        k => CATEGORY_CONFIG[k].tag.split('=')[1] === osmValue
    ) ?? osmValue;
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
        localStorage.setItem('LE_favs', JSON.stringify(favs.filter(f => f.id !== item.id)));
        return false;
    }
        favs.push(item);
        localStorage.setItem('LE_favs', JSON.stringify(favs));
    return true;
}
