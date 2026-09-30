import type { YatmoLanguage, YatmoTravelMode } from './config';
import { TRAVEL_MODE_SUMMARY_CODES } from './config';

// ---- /Points ----------------------------------------------------------------------------------

/** Wire shape of GET /Points (compact keys). */
interface PoiWire {
  n: string; t: string; la: number; ln: number; p: string; i: string; si: string; g: boolean;
  rpt?: string | null; sd?: string | null; fid?: string | null;
}

/** One point of interest. */
export interface YatmoPoi {
  id: string;
  name: string;
  /** Translated type, for example "Preschool" or "Bus stop (Dansaert)". */
  type: string;
  latitude: number;
  longitude: number;
  /** Category id, the value to pass in `poiTypeIds`. */
  categoryId: string;
  /** Icon ids (several when POIs share the same position). */
  iconIds: string[];
  /** Sub-icon ids (transit lines). */
  subIconIds: string[];
  grouped: boolean;
  /** Specific data as a JSON string (transit lines, brand...), "{}" when empty. */
  specificData: string | null;
  filterId: string | null;
}

export function poiFromWire(w: PoiWire): YatmoPoi {
  return {
    id: `${w.la},${w.ln},${w.n}`,
    name: w.n, type: w.t, latitude: w.la, longitude: w.ln, categoryId: w.p,
    iconIds: (w.i ?? '').split(',').filter(Boolean),
    subIconIds: (w.si ?? '').split(',').filter(Boolean),
    grouped: !!w.g, specificData: w.sd ?? null, filterId: w.fid ?? null,
  };
}

// ---- /Summary ---------------------------------------------------------------------------------

export interface YatmoTravelData {
  hasTravelInformation: boolean;
  /** 1 driving, 2 walking, 3 bicycling, 4 transit. */
  travelModeCode: number;
  travelMode: YatmoTravelMode | null;
  translatedTravelMode: string | null;
  distanceMeters: number | null;
  distanceLongLabel: string | null;
  distanceShortLabel: string | null;
  travelTimeSeconds: number | null;
  travelTimeLongLabel: string | null;
  travelTimeShortLabel: string | null;
  travelTimeExtraShortLabel: string | null;
}

export interface YatmoSummaryPlace {
  categoryId: number;
  icon: number;
  subIcon: number;
  latitude: number;
  longitude: number;
  name: string;
  specificData: string | null;
  travelData: YatmoTravelData[];
}

export interface YatmoSummarySubCategory {
  subType: number;
  label: string;
  singularLabel: string | null;
  places: YatmoSummaryPlace[];
}

export interface YatmoSummaryCategory {
  categoryType: number;
  label: string;
  subCategories: YatmoSummarySubCategory[];
}

export interface YatmoCloseCity {
  /** City name per language code (EN, FR, NL...). */
  names: Record<string, string>;
  travelData: YatmoTravelData[];
  center: { latitude: number; longitude: number } | null;
}

export interface YatmoPlaceInformation {
  streetName: string | null;
  isLocality: boolean;
  cityName: string | null;
  zipCode: string | null;
  localizedStreetNames: Record<string, string> | null;
  localizedCityNames: Record<string, string> | null;
}

/** GET /Summary: nearby places grouped by category, closest cities and reverse-geocoded place. */
export interface YatmoSummary {
  categories: YatmoSummaryCategory[];
  closeCities: YatmoCloseCity[];
  placeInformation: YatmoPlaceInformation | null;
}

function travelModeFromCode(code: number): YatmoTravelMode | null {
  const entry = (Object.entries(TRAVEL_MODE_SUMMARY_CODES) as [YatmoTravelMode, number][]).find(([, c]) => c === code);
  return entry ? entry[0] : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function travelDataFromWire(t: any): YatmoTravelData {
  return {
    hasTravelInformation: !!t.hti, travelModeCode: t.tm ?? 0, travelMode: travelModeFromCode(t.tm ?? 0),
    translatedTravelMode: t.ttm ?? null, distanceMeters: t.ptdd ?? null, distanceLongLabel: t.ptdll ?? null,
    distanceShortLabel: t.ptdsl ?? null, travelTimeSeconds: t.tt ?? null, travelTimeLongLabel: t.ttll ?? null,
    travelTimeShortLabel: t.ttsl ?? null, travelTimeExtraShortLabel: t.ttesl ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function summaryFromWire(w: any): YatmoSummary {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    categories: (w.AvailableCategoriesAroundPosition ?? []).map((c: any) => ({
      categoryType: c.ct ?? 0, label: c.l ?? '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subCategories: (c.sc ?? []).map((s: any) => ({
        subType: s.st ?? 0, label: s.l ?? '', singularLabel: s.lb ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        places: (s.d ?? []).map((d: any) => ({
          categoryId: d.id ?? 0, icon: d.i ?? 0, subIcon: d.si ?? 0, latitude: d.la, longitude: d.lo, name: d.n ?? '',
          specificData: d.sd ?? null, travelData: (d.td ?? []).map(travelDataFromWire),
        })),
      })),
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    closeCities: (w.CloseCities ?? []).map((c: any) => ({
      names: c.n ?? {}, travelData: (c.td ?? []).map(travelDataFromWire),
      center: c.c ? { latitude: c.c.Latitude, longitude: c.c.Longitude } : null,
    })),
    placeInformation: w.PlaceInformation ? {
      streetName: w.PlaceInformation.StreetName ?? null, isLocality: !!w.PlaceInformation.IsLocality,
      cityName: w.PlaceInformation.CityName ?? null, zipCode: w.PlaceInformation.ZipCode ?? null,
      localizedStreetNames: w.PlaceInformation.LocalizedStreetNames ?? null, localizedCityNames: w.PlaceInformation.LocalizedCityNames ?? null,
    } : null,
  };
}

// ---- /Summary/text ----------------------------------------------------------------------------

/** Generated neighbourhood paragraphs, resolved to the configured language by the client. */
export interface YatmoSummaryText {
  paragraphs: { sentences: string[]; text: string }[];
  text: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function summaryTextFromWire(w: any, language: YatmoLanguage): YatmoSummaryText {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paragraphs = (w.Paragraphs ?? []).map((p: any) => {
    const sentences: string[] = (p.Sentences ?? [])
      .map((s: Record<string, string>) => s[language] ?? s.EN ?? Object.values(s)[0] ?? '')
      .filter((s: string) => s.length > 0);
    return { sentences, text: sentences.join(' ') };
  });
  return { paragraphs, text: paragraphs.map((p: { text: string }) => p.text).join('\n\n') };
}

// ---- /Scores ----------------------------------------------------------------------------------

export interface YatmoScore {
  /** Stable key: publicTransport, trains, motorways, nurseries, schools, supermarkets... */
  key: string;
  label: string;
  /** 0 to 10. */
  value: number;
  iconId: number | null;
  categoryType: number | null;
  subTypes: number[];
}

export interface YatmoScores {
  scores: YatmoScore[];
  language: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function scoresFromWire(w: any): YatmoScores {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    scores: (w.scores ?? []).map((s: any) => ({
      key: s.k ?? '', label: s.l ?? '', value: s.v ?? 0, iconId: s.iconId ?? null, categoryType: s.pt ?? null, subTypes: s.st ?? [],
    })),
    language: w.language ?? null,
  };
}

// ---- /Enrichment (camelCase on the wire, used as is) -------------------------------------------

export interface YatmoTravelInfo { distanceMeters: number; durationSeconds: number; durationMinutes: number }

export interface YatmoNearestPoi {
  name: string; latitude: number; longitude: number; straightLineDistanceMeters: number;
  walking?: YatmoTravelInfo | null; bicycling?: YatmoTravelInfo | null; driving?: YatmoTravelInfo | null; transit?: YatmoTravelInfo | null;
}

export interface YatmoEnrichedCategory { id: number; key: string; group: string; label: string; nearest?: YatmoNearestPoi | null }

/** GET /Enrichment: the nearest place of each category with routed distances and times. */
export interface YatmoEnrichment {
  latitude: number; longitude: number; country: string; language: string; searchRadiusMeters: number;
  categories: YatmoEnrichedCategory[];
}

// ---- /Isochrone/GetMultipleTimes --------------------------------------------------------------

/** One reachable area. `geometry` is the GeoJSON geometry (Polygon or MultiPolygon) returned by the API. */
/** Minimal GeoJSON geometry shape, to avoid a dependency on @types/geojson. */
export interface YatmoGeometry { type: 'Polygon' | 'MultiPolygon' | string; coordinates: unknown }

export interface YatmoIsochrone { label: string; geometry: YatmoGeometry }

// ---- /Geolocation/GetClose (Photon) -----------------------------------------------------------

export interface YatmoPlace {
  name: string | null; street: string | null; houseNumber: string | null; postcode: string | null; city: string | null;
  country: string | null; countryCode: string | null; type: string | null; latitude: number; longitude: number;
  /** "Rue Neuve, 1000 Brussels" style single line. */
  label: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function placeFromFeature(f: any): YatmoPlace | null {
  const coordinates = f?.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const p = f.properties ?? {};
  const cityLine = [p.postcode, p.city].filter(Boolean).join(' ');
  return {
    name: p.name ?? null, street: p.street ?? null, houseNumber: p.housenumber ?? null, postcode: p.postcode ?? null,
    city: p.city ?? null, country: p.country ?? null, countryCode: p.countrycode ?? null, type: p.type ?? null,
    latitude: coordinates[1], longitude: coordinates[0],
    label: [p.name ?? p.street, cityLine].filter(Boolean).join(', '),
  };
}

// ---- /SimplifiedCategories --------------------------------------------------------------------

/** Category ids grouped by family (Education, Transports, Motorways, Shopping, Tourism...). */
export interface YatmoCategoryGroup { name: string; poiTypeIds: number[] }
