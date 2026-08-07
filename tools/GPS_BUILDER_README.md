# GPS Builder 0.4.0

Development-only helper for producing static GPS Library files for Golf Voice Scorecard AI.

## Changes from 0.3.0

- Loads the selected course from the existing Course Library.
- Shows holes 1–18 with par, HCP and tee distances beside the OSM map.
- Labels unassigned OSM greens as G1, G2, ... for unambiguous discussion and verification.
- Lets you select a map green and attach it directly to a Course Library hole.
- Keeps the 18/18 validation and extra/practice-green handling from 0.3.0.

## Porvoo workflow

1. Open `tools/gps-builder.html?v=400`.
2. Press **Porvoo-esiasetus**.
3. Confirm Course Library shows 18/18 holes.
4. Press **Hae greenit OpenStreetMapista**.
5. Click a G-marker on the map.
6. Press **Valitse Gx ja liitä reiän listasta**.
7. Use the Course Library hole list to attach it to the correct hole.
8. Mark the extra/practice green as **Ylimääräinen**.
9. Continue until validation shows 18/18.
10. Generate and download `porvoogolf.json`.

The Course Library is used as reference data only; GPS coordinates still require map/field verification.
