# GPS Builder 0.1.0

Development-only tool for building Golf Voice Scorecard AI GPS Library files.

## Purpose

The scorecard should not depend on live Overpass API calls during a golf round. GPS Builder is used separately to fetch OpenStreetMap green geometry, assign hole numbers and export a static JSON file for `data/gps/<country>/`.

## Workflow

1. Open `tools/gps-builder.html` through GitHub Pages.
2. Select Porvoo or Gumböle preset, or enter another course manually.
3. Fetch greens from OpenStreetMap.
4. Confirm the returned greens and assign missing hole numbers.
5. Build JSON.
6. Download `<courseId>.json`.
7. Review it before adding it to `data/gps/FI/`.
8. Field-test Green Center distances against Garmin before marking the data verified.

## Important

This is a development tool and should not be linked from the user-facing application. OpenStreetMap is community-maintained data, so generated coordinates must be field-tested.
