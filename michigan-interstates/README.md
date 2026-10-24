# Michigan Interstates by Year Opened

Static, self-contained page. Upload `index.html` to any static host
(GitHub Pages, Netlify, S3, Azure Static Web Apps, etc.). No build step,
no server code. The only external request is Google Fonts (Overpass);
it falls back to system fonts if blocked.

## source/
- `segments.py` – segment endpoints, opening years, notes and the ≈ flags. Edit this to correct a date.
- `build_geo.py` – splits Natural Earth highway lines at those endpoints and writes the map data.
- `template.html` – the page; `__DATA__` is replaced with the JSON from build_geo.py.

To rebuild after editing (Python 3, `pip install shapely networkx pyshp`):
1. Download from github.com/nvkelso/natural-earth-vector into a folder `dl/`:
   `10m_cultural/ne_10m_roads_north_america.{shp,dbf,shx,prj}` (rename to `na.*`),
   `geojson/ne_10m_admin_1_states_provinces.geojson` (as `states.geojson`),
   `geojson/ne_10m_lakes.geojson` (as `lakes.geojson`).
2. Edit the hard-coded `sys.path` line in build_geo.py to point at this folder, then
   `python3 build_geo.py dl geo.json`
3. Substitute geo.json for `__DATA__` in template.html, and wrap in a normal
   `<!doctype html><html><head>…</head><body>…</body></html>` shell as index.html does.

Dates: michiganhighways.org and Wikipedia route articles (linked on the page).
Geometry: Natural Earth (public domain).
