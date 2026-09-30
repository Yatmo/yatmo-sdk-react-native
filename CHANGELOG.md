# Changelog

## 1.0.0 (2026-09-30)

- First release: `YatmoClient` (Summary, Summary text, Scores, Listing enrichment, Points, Isochrones,
  Geocoding, Simplified categories), `YatmoMapView` (Yatmo map styles on MapLibre, property pin, POI markers
  following the camera, isochrones fitted like the web plugin, tap callback) and the WebView helper for the
  iframe plugin.
- Mobile authentication: the frontend key is sent with the `X-Yatmo-App-Id` header, locked to the app ids
  registered on the licence. See https://documentation.yatmo.com/mobile/app-ids
