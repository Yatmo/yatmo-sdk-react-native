import {
  MAP_STYLE_IDS, TRAVEL_MODE_API_NAMES, YATMO_SDK_VERSION, YatmoError, resolveBaseUrl,
  type YatmoConfiguration, type YatmoMapStyle, type YatmoTravelMode,
} from './config';
import {
  placeFromFeature, poiFromWire, scoresFromWire, summaryFromWire, summaryTextFromWire,
  type YatmoCategoryGroup, type YatmoEnrichment, type YatmoIsochrone, type YatmoPlace, type YatmoPoi,
  type YatmoScores, type YatmoSummary, type YatmoSummaryText,
} from './models';

export interface Position { latitude: number; longitude: number }

/** Options of the iframe plugin for `pluginUrl` and the WebView component. */
export interface YatmoPluginOptions extends Position {
  mode?: 'overlay' | 'overlay-scores' | 'map-top' | 'map' | 'summary' | 'summary-tabs';
  zoom?: number;
  /** Hex colour, for example "#428BFF". */
  accentColor?: string;
  /** "pin" or "circle". */
  marker?: string;
  mapStyle?: YatmoMapStyle;
  /** Any extra iframe parameter, appended as is. */
  extraParameters?: Record<string, string>;
}

/**
 * Typed client for the Yatmo REST API. Every call sends the licence and the mobile headers
 * (LicenseKey, X-Yatmo-App-Id, X-Yatmo-Platform, X-Yatmo-SDK) and throws a `YatmoError` on failure.
 */
export class YatmoClient {
  constructor(public readonly configuration: YatmoConfiguration) {}

  /** GET /Summary: nearby places by category with travel times, closest cities, reverse-geocoded place. */
  async summary(p: Position): Promise<YatmoSummary> {
    return summaryFromWire(await this.getJson('Summary', this.position(p)));
  }

  /** GET /Summary/text: generated paragraphs, resolved to the configured language. */
  async summaryText(p: Position): Promise<YatmoSummaryText> {
    return summaryTextFromWire(await this.getJson('Summary/text', this.position(p)), this.configuration.language);
  }

  /** GET /Scores: one 0 to 10 score per category. */
  async scores(p: Position): Promise<YatmoScores> {
    return scoresFromWire(await this.getJson('Scores', this.position(p)));
  }

  /** GET /Enrichment: nearest place of each category with distances and times for four travel modes. */
  async enrichment(p: Position): Promise<YatmoEnrichment> {
    return (await this.getJson('Enrichment', this.position(p))) as YatmoEnrichment;
  }

  /** GET /Points inside a bounding box (`[latitude, longitude]` corners). Only ask from zoom 13 upwards and debounce camera events. */
  async points(args: { southWest: [number, number]; northEast: [number, number]; poiTypeIds?: number[] }): Promise<YatmoPoi[]> {
    const query: Record<string, string> = {
      bound1: `${fmt(args.southWest[0])},${fmt(args.southWest[1])}`,
      bound2: `${fmt(args.northEast[0])},${fmt(args.northEast[1])}`,
      groupSamePositions: 'true',
      caringForBigResponse: 'true',
    };
    if (args.poiTypeIds?.length) query.poiTypesIds = args.poiTypeIds.join(',');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wire = (await this.getJson('Points', query)) as any[];
    return wire.map(poiFromWire);
  }

  /** GET /Isochrone/GetMultipleTimes: the 5, 10 and 20 minute areas, smallest first. */
  async isochrones(args: Position & { mode: YatmoTravelMode }): Promise<YatmoIsochrone[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wire = (await this.getJson('Isochrone/GetMultipleTimes', { ...this.position(args), travelMode: TRAVEL_MODE_API_NAMES[args.mode] })) as any[];
    return wire.map((item) => ({ label: item.label, geometry: item.iso }));
  }

  /** GET /Geolocation/GetClose: address autocomplete near a position, inside the configured country. */
  async geocode(args: Position & { query: string }): Promise<YatmoPlace[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const root = (await this.getJson('Geolocation/GetClose', { ...this.position(args), address: args.query })) as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((root.features ?? []) as any[]).map(placeFromFeature).filter((p): p is YatmoPlace => p !== null);
  }

  /** GET /SimplifiedCategories: category ids grouped by family, the values accepted by `poiTypeIds`. */
  async simplifiedCategories(): Promise<YatmoCategoryGroup[]> {
    const root = (await this.getJson('SimplifiedCategories', {})) as Record<string, number[]>;
    return Object.entries(root).map(([name, poiTypeIds]) => ({ name, poiTypeIds })).sort((a, b) => a.name.localeCompare(b.name));
  }

  /** URL of the iframe plugin, for a WebView. */
  pluginUrl(options: YatmoPluginOptions): string {
    const c = this.configuration;
    const params: Record<string, string> = {
      licenseKey: c.licenseKey, country: c.country, language: c.language,
      latitude: fmt(options.latitude), longitude: fmt(options.longitude),
      mode: options.mode ?? 'overlay', zoom: String(options.zoom ?? 15),
    };
    if (options.accentColor) params.accentColor = options.accentColor;
    if (options.marker) params.marker = options.marker;
    if (options.mapStyle) params.mapStyle = String(MAP_STYLE_IDS[options.mapStyle]);
    Object.assign(params, options.extraParameters ?? {});
    return 'https://map.yatmo.com/plugin.html?' + toQuery(params);
  }

  /** Headers sent with every request, for callers that need an endpoint not wrapped above. */
  headers(): Record<string, string> {
    const c = this.configuration;
    return {
      LicenseKey: c.licenseKey,
      'X-Yatmo-App-Id': c.appId,
      'X-Yatmo-Platform': c.platform ?? 'react-native',
      'X-Yatmo-SDK': `yatmo-react-native/${YATMO_SDK_VERSION}`,
      Accept: 'application/json',
    };
  }

  /** Full URL of an endpoint with the language appended. */
  url(path: string, query: Record<string, string>): string {
    return resolveBaseUrl(this.configuration) + path + '?' + toQuery({ ...query, language: this.configuration.language });
  }

  private async getJson(path: string, query: Record<string, string>): Promise<unknown> {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    const timer = controller ? setTimeout(() => controller.abort(), this.configuration.timeoutMs ?? 15000) : undefined;
    let response: Response;
    try {
      response = await fetch(this.url(path, query), { headers: this.headers(), signal: controller?.signal });
    } catch (e) {
      throw new YatmoError(0, e instanceof Error ? e.message : 'network error', e);
    } finally {
      if (timer) clearTimeout(timer);
    }
    const text = await response.text();
    if (!response.ok) {
      let message = text;
      try { message = JSON.parse(text)?.Error ?? text; } catch { /* plain text body */ }
      throw new YatmoError(response.status, `Yatmo API ${response.status}: ${message}`);
    }
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new YatmoError(response.status, 'Yatmo API: unreadable response', e);
    }
  }

  private position(p: Position): Record<string, string> {
    return { latitude: fmt(p.latitude), longitude: fmt(p.longitude) };
  }
}

/** Creates a client. Pass `appId` explicitly (bundle id on iOS, application id on Android). */
export function createYatmoClient(configuration: YatmoConfiguration): YatmoClient {
  return new YatmoClient(configuration);
}

function fmt(value: number): string {
  return value.toFixed(7);
}

function toQuery(params: Record<string, string>): string {
  return Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}
