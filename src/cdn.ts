import type { YatmoCountry } from './config';

/** POI icons are served from one CDN endpoint per country (same list as the web plugin's getCdnUrl). */
const HOSTS: Record<YatmoCountry, string> = {
  BE: 'https://beprod-chh6e6e9hhg8bwha.z01.azurefd.net/',
  FR: 'https://frprod-atf6hrhkezbhdqem.z01.azurefd.net/',
  NL: 'https://nlprod-euexhcaedwekb9g9.z01.azurefd.net/',
  LU: 'https://luprod-d3azhthcdgc5d7e2.z01.azurefd.net/',
  CH: 'https://chprod-ebercaa7bddnbvbz.z01.azurefd.net/',
  DE: 'https://deprod.azureedge.net/',
  IT: 'https://itprod2.azureedge.net/',
  ES: 'https://esprod.azureedge.net/',
  PT: 'https://ptprod.azureedge.net/',
  IE: 'https://ieprod.azureedge.net/',
  UK: 'https://ukprod.azureedge.net/',
  AT: 'https://atprod.azureedge.net/',
  CA: 'https://caprod-hba9fuctcmdqcfea.z01.azurefd.net/',
  GR: 'https://yatmogrprod-egf4hqdje7a8f4hd.z01.azurefd.net/',
  MA: 'https://yatmomaprod-ecesacfgcmc3dugj.z01.azurefd.net/',
  HR: 'https://yatmohrprod-aebpfxd3crhcfeh6.z01.azurefd.net/',
  MT: 'https://yatmomtprod-bveegpf9csapdcdp.z01.azurefd.net/',
  SI: 'https://yatmosiprod-cxftg7d7g5bua8hv.z01.azurefd.net/',
  RS: 'https://yatmorsprod-cdguargcaqcxhcgg.z01.azurefd.net/',
  CY: 'https://yatmocyprod-bkg4g7f2b6hwahav.z01.azurefd.net/',
  BA: 'https://yatmobaprod-d8duf5bffkdvg5b0.z01.azurefd.net/',
  ME: 'https://yatmomeprod-eafne6d5g3g0h3g2.z01.azurefd.net/',
  BG: 'https://yatmobgprod-dqbzcte0aeg3c2b7.z01.azurefd.net/',
  AL: 'https://yatmoalprod-b4cpebdzd2cnerfu.z01.azurefd.net/',
  AU: 'https://yatmoauprod-g5gfbkbjhhduewdk.z01.azurefd.net/',
};

export function cdnBaseUrl(country: YatmoCountry): string {
  return HOSTS[country] ?? HOSTS.BE;
}

/** `{cdn}/icons{size}/{iconId}@2x.png`, size 24 or 32. */
export function poiIconUrl(country: YatmoCountry, iconId: string, size: 24 | 32 = 24): string {
  return `${cdnBaseUrl(country)}icons${size}/${iconId}@2x.png`;
}

/** `{cdn}/subicons24/{subIconId}@2x.png`: transit line badges. */
export function poiSubIconUrl(country: YatmoCountry, subIconId: string): string {
  return `${cdnBaseUrl(country)}subicons24/${subIconId}@2x.png`;
}
