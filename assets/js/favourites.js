loadHeader("favourites.html");

// favourites.js

const list = document.getElementById('favouritesList');
const emptyState = document.getElementById('emptyState');

const favs = JSON.parse(localStorage.getItem('LE_favs') || '[]');

// Show empty state or the list
if (favs.length === 0) {
    emptyState.style.display = 'block';
} else {
    emptyState.style.display = 'none';
    showFavourites(favs);
}

function showFavourites(items) {
    list.innerHTML = items.map(item => {
        const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`;

        return `
      <div class="card" data-id="${item.id}">
        <h3>${item.name}</h3>
        <p>${item.category}</p>
        ${item.address ? `<p>${item.address}</p>` : ''}
        <div style="display:flex; gap:8px; margin-top:8px;">
          <a href="${directionsUrl}" target="_blank" class="btn btn-secondary">Directions</a>
          <button class="btn btn-secondary btn-remove" data-id="${item.id}">Remove</button>
        </div>
      </div>
    `;
    }).join('');

    // Wire up remove buttons
    list.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', function () {
            removeFromFavourites(Number(this.dataset.id));
        });
    });
}

function removeFromFavourites(id) {
    const updated = JSON.parse(localStorage.getItem('LE_favs') || '[]')
        .filter(f => f.id !== id);

    localStorage.setItem('LE_favs', JSON.stringify(updated));

    // Remove the card from the page without re-rendering everything
    document.querySelector(`.card[data-id="${id}"]`).remove();

    // Show empty state if nothing left
    if (updated.length === 0) {
        emptyState.style.display = 'block';
    }
}