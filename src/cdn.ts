import type { YatmoCountry } from './config';

/** POI icons are served from one CDN for every country: cdn/<iso code>/ (same rule as the web plugin's getCdnUrl). */
export const CDN_HOST = 'https://beprod-chh6e6e9hhg8bwha.z01.azurefd.net/';

export function cdnBaseUrl(country: YatmoCountry): string {
  return `${CDN_HOST}cdn/${String(country || 'BE').toLowerCase()}/`;
}

/** `{cdn}/icons{size}/{iconId}@2x.png`, size 24 or 32. */
export function poiIconUrl(country: YatmoCountry, iconId: string, size: 24 | 32 = 24): string {
  return `${cdnBaseUrl(country)}icons${size}/${iconId}@2x.png`;
}

/** `{cdn}/subicons24/{subIconId}@2x.png`: transit line badges. */
export function poiSubIconUrl(country: YatmoCountry, subIconId: string): string {
  return `${cdnBaseUrl(country)}subicons24/${subIconId}@2x.png`;
}
