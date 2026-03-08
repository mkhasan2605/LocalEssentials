# LocalEssentials - Initial readme file 

LocalEssentials is a statically hosted web app that helps users in the UK quickly find essential services near a location. Users can search by UK postcode or use their current location, then view nearby essentials such as GP surgeries, hospitals, pharmacies, police stations, fire stations, and supermarkets.

## Features

### Core
- UK postcode search (postcode → latitude/longitude)
- "Use my location" (browser geolocation) with fallback to postcode
- Essential category selection (GP, hospital, pharmacy, police, fire, supermarket)
- Radius selection (1, 3, 5, 10 km)
- Results list shown as cards (sorted by nearest)
- Directions link to Google Maps
- Multi-page site: Home/Search, Results, Help, About

### Stretch (Above & Beyond)
- Favourites saved in LocalStorage (view/remove + directions)
- Settings saved in LocalStorage (default radius/categories, optional theme)


## Tech stack
- HTML, CSS, JavaScript (no backend)
- Static hosting (GitHub Pages)
- APIs:
  - Postcodes.io (postcode lookup)
  - OpenStreetMap / Overpass (nearby places)
