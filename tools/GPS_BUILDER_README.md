# GPS Builder 0.4.1

Development-only tool for creating static Golf Voice Scorecard AI GPS Library files.

## Fixes from 0.4.0

- Course Library is now resolved through `data/courses/manifest.json`.
- GitHub Pages repository base path is derived automatically.
- Course files are loaded from the path declared in the Course Library manifest.
- Overpass requests now retry using both POST and GET.
- Multiple Overpass endpoints remain available as fallbacks.
- Map, G1-Gn markers, manual hole assignment and JSON generation are unchanged.

## Porvoo workflow

1. Open `tools/gps-builder.html?v=401`.
2. Select **Porvoo-esiasetus**.
3. Press **Hae greenit OpenStreetMapista**.
4. Confirm Course Library shows `18/18 reikää`.
5. Confirm the green search returns the Porvoo greens.
6. Assign G-markers to holes 1-18 and mark the extra green unused.
7. Generate and download `porvoogolf.json`.
