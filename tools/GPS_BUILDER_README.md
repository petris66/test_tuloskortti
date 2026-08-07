# GPS Builder 0.2.0

Development-only tool for creating static Golf Voice Scorecard AI GPS Library files.

## Changes from 0.1.0

- Fetches both `golf=green` and numbered `golf=hole` geometry from OpenStreetMap.
- Detects missing hole numbers and duplicate green candidates.
- Scores duplicate candidates by distance to the matching hole-line endpoint.
- Automatically selects one best candidate for each hole 1–18 when possible.
- Allows manual candidate selection before JSON export.
- JSON export is enabled only when exactly one selected green exists for every hole 1–18.

## Porvoo workflow

1. Open `tools/gps-builder.html`.
2. Select **Porvoo-esiasetus**.
3. Press **Hae greenit OpenStreetMapista**.
4. Check the validation summary.
5. If it says 18/18 and one selected green per hole, press **Muodosta JSON**.
6. Press **Lataa JSON**.
7. Add the downloaded `porvoogolf.json` to `data/gps/FI/`.
8. Field-test Green Center distances against Garmin before marking the data verified.

OpenStreetMap is community-maintained data. Automatic selection is a development aid, not field validation.
