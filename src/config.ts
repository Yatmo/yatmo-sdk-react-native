/** Version sent in the X-Yatmo-SDK header. Keep in sync with package.json. */
export const YATMO_SDK_VERSION = '1.0.0';

/** Countries served by the Yatmo API. The value is the subdomain: `https://{country}.yatmo.com/`. */
export type YatmoCountry =
  | 'BE' | 'FR' | 'NL' | 'LU' | 'CH' | 'DE' | 'IT' | 'ES' | 'PT' | 'IE' | 'UK' | 'AT' | 'CA'
  | 'GR' | 'MA' | 'AU' | 'HR' | 'MT' | 'SI' | 'RS' | 'CY' | 'BA' | 'ME' | 'BG' | 'AL';

/** Languages accepted by the `language` parameter of the API. */
export type YatmoLanguage =
  | 'EN' | 'FR' | 'NL' | 'DE' | 'IT' | 'ES' | 'PT' | 'CA' | 'ZH' | 'HI' | 'AR' | 'RU' | 'JA'
  | 'EL' | 'HR' | 'MT' | 'SL' | 'SR' | 'TR' | 'BS' | 'SQ' | 'BG' | 'CNR';

/** The seven map styles of the web plugin. */
export type YatmoMapStyle = 'liberty' | 'basic' | 'bright' | '3d' | 'positron' | 'dark' | 'liberty_stonehedge';

/** Travel modes of the routing endpoints. */
export type YatmoTravelMode = 'walking' | 'bicycling' | 'driving' | 'transit';

export const MAP_STYLE_IDS: Record<YatmoMapStyle, number> = {
  liberty: 1, basic: 2, bright: 3, '3d': 4, positron: 5, dark: 6, liberty_stonehedge: 7,
};

export function mapStyleUrl(style: YatmoMapStyle): string {
  return `https://map.yatmo.com/osm_${style}.json`;
}

export const TRAVEL_MODE_API_NAMES: Record<YatmoTravelMode, string> = {
  driving: 'Driving', walking: 'Walking', bicycling: 'Bicycling', transit: 'Transit',
};

/** Numeric codes used inside the Summary payload (`td[].tm`). */
export const TRAVEL_MODE_SUMMARY_CODES: Record<YatmoTravelMode, number> = {
  driving: 1, walking: 2, bicycling: 3, transit: 4,
};

export interface YatmoConfiguration {
  /** Your frontend key (the one used by the web plugins). Never the backend key. */
  licenseKey: string;
  country: YatmoCountry;
  language: YatmoLanguage;
  /**
   * The iOS bundle identifier or the Android application id of the running app, sent in X-Yatmo-App-Id.
   * JavaScript cannot read it by itself: use `Platform.select` or `react-native-device-info`'s `getBundleId()`.
   */
  appId: string;
  /** Override the API host, for staging environments. Defaults to `https://{country}.yatmo.com/`. */
  apiBaseUrl?: string;
  /** Request timeout in milliseconds. */
  timeoutMs?: number;
  /** `ios`, `android` or `react-native` (default), sent in X-Yatmo-Platform. */
  platform?: string;
}

export function resolveBaseUrl(configuration: YatmoConfiguration): string {
  return configuration.apiBaseUrl ?? `https://${configuration.country.toLowerCase()}.yatmo.com/`;
}

/** Thrown by the client. `status` 401 = key missing or unknown, 403 = app id or country not allowed, 429 = quota, 0 = network. */
export class YatmoError extends Error {
  constructor(public readonly status: number, message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'YatmoError';
  }
}
