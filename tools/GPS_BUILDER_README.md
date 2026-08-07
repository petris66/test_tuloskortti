# GPS Builder 0.3.0

Development-only tool for creating static Golf Voice Scorecard AI GPS Library files.

## Changes from 0.2.0

- Added an interactive OpenStreetMap map using Leaflet.
- All fetched golf greens are shown as map markers.
- A marker can be assigned directly to hole 1-18.
- A marker can be marked as extra / unused (for example a practice green).
- Table and map assignments stay synchronized.
- GPS Library JSON export is enabled only when exactly one active green exists for every hole 1-18.

## Porvoo workflow

1. Open `tools/gps-builder.html`.
2. Select **Porvoo-esiasetus**.
3. Press **Hae greenit OpenStreetMapista**.
4. Use the map to identify each green.
5. Click a marker and assign the correct hole number.
6. Mark the one extra green as **Ylimääräinen**.
7. Continue until validation shows **18/18**.
8. Press **Muodosta JSON** and then **Lataa JSON**.
9. Add downloaded `porvoogolf.json` to `data/gps/FI/`.
10. Field-test Green Center distances against Garmin before marking the data verified.

OpenStreetMap is community-maintained data. Map assignment is a development aid, not field validation.
