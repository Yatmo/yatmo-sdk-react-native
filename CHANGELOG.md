# Changelog

## 1.0.1 (2026-10-10)

- One CDN for every country: POI icon URLs are now `https://beprod-chh6e6e9hhg8bwha.z01.azurefd.net/cdn/<country>/...`
  with the lower-case ISO code, the same host for every country (`YatmoCdn`). The former per-country hosts keep
  working during a transition period; upgrade before they are retired.

## 1.0.0 (2026-09-30)

- First release: `YatmoClient` (Summary, Summary text, Scores, Listing enrichment, Points, Isochrones,
  Geocoding, Simplified categories), `YatmoMapView` (Yatmo map styles on MapLibre, property pin, POI markers
  following the camera, isochrones fitted like the web plugin, tap callback) and the WebView helper for the
  iframe plugin.
- Mobile authentication: the frontend key is sent with the `X-Yatmo-App-Id` header, locked to the app ids
  registered on the licence. See https://documentation.yatmo.com/mobile/app-ids
