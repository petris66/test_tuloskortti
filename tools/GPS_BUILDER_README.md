# GPS Builder 0.4.2

Development-only tool for creating static Golf Voice Scorecard AI GPS Library files.

## Fix from 0.4.1

- Corrected Course Library path to match the repository structure:
  - Course Library manifest: `data/source/manifest.json`
  - Course files: `data/source/FI/...`
- GPS Library remains separate under `data/gps/`.
- Overpass fallback, map and green assignment logic are unchanged.

## Porvoo test

1. Open `tools/gps-builder.html?v=402`.
2. Select **Porvoo-esiasetus**.
3. Press **Hae greenit OpenStreetMapista**.
4. Expected:
   - Course Library: 18/18 holes loaded
   - OSM: approximately 19 greens found
5. Then assign the 18 playing greens and mark the extra green unused.
