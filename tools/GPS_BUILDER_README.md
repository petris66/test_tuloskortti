# GPS Builder 0.4.3

Development-only tool for creating static Golf Voice Scorecard AI GPS Library files.

## Fix from 0.4.2

- Fixed Leaflet stylesheet loading.
- Force Leaflet to recalculate map size after Builder layout changes.
- Added a resize observer for the map container.
- Refit map bounds after green markers are rendered.
- Green markers are displayed as G1-Gn for easier manual identification.
- Course Library, Overpass and JSON logic are unchanged.

## Porvoo test

1. Open `tools/gps-builder.html?v=403`.
2. Select **Porvoo-esiasetus**.
3. Press **Hae greenit OpenStreetMapista**.
4. Expected:
   - Course Library: 18/18 holes loaded
   - OSM: approximately 19 greens found
   - Full golf-course map visible with G1-G19 markers
5. Assign the 18 playing greens and mark the extra green unused.
