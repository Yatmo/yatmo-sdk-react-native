import React, { useEffect, useState } from 'react';
import { Platform, SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';
import { createYatmoClient, YatmoMapView } from '@yatmo/react-native';

// Functional test of the Yatmo React Native SDK: a map on a Brussels listing plus every client call,
// each result logged (console, tag YatmoTest) and shown on screen.
// The licence key of the test client lives in licenseKey.local.js (ignored by git).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const YATMO_LICENSE_KEY: string = require('./licenseKey.local.js').key;
const LAT = 50.8520525;
const LNG = 4.3442926;

const yatmo = createYatmoClient({
  licenseKey: YATMO_LICENSE_KEY,
  country: 'BE',
  language: 'FR',
  appId: Platform.select({ ios: 'com.yatmo.test.ios', android: 'com.yatmo.test.android' })!,
});

export default function App() {
  const [lines, setLines] = useState<string[]>([]);
  const log = (line: string) => {
    console.log('YatmoTest: ' + line);
    setLines((l) => [...l, line]);
  };

  useEffect(() => {
    const step = async (name: string, block: () => Promise<string>) => {
      try { log(`OK ${name}: ${await block()}`); } catch (e) { log(`FAIL ${name}: ${e}`); }
    };
    (async () => {
      log(`appId=${yatmo.configuration.appId} key=${yatmo.configuration.licenseKey.slice(0, 6)}...`);
      await step('summary', async () => {
        const s = await yatmo.summary({ latitude: LAT, longitude: LNG });
        const first = s.categories[0]; const place = first.subCategories[0].places[0];
        return `${s.categories.length} categories, ${s.closeCities.length} cities, street=${s.placeInformation?.streetName}, first=${first.label}/${place.name} walk=${place.travelData.find((t) => t.travelMode === 'walking')?.travelTimeShortLabel}`;
      });
      await step('summaryText', async () => { const t = await yatmo.summaryText({ latitude: LAT, longitude: LNG }); return `${t.paragraphs.length} paragraphs, ${t.text.length} chars: ${t.text.slice(0, 80)}`; });
      await step('scores', async () => (await yatmo.scores({ latitude: LAT, longitude: LNG })).scores.map((s) => `${s.key}=${s.value}`).join(', '));
      await step('enrichment', async () => { const e = await yatmo.enrichment({ latitude: LAT, longitude: LNG }); return `${e.categories.length} categories, ${e.categories[0].key} -> ${e.categories[0].nearest?.name} ${e.categories[0].nearest?.walking?.durationMinutes} min`; });
      await step('geocode', async () => { const p = await yatmo.geocode({ query: 'Rue Neuve', latitude: LAT, longitude: LNG }); return `${p.length} places, first=${p[0]?.label}`; });
      await step('simplifiedCategories', async () => (await yatmo.simplifiedCategories()).map((g) => `${g.name}:${g.poiTypeIds.length}`).join(', '));
      await step('points', async () => { const p = await yatmo.points({ southWest: [50.848, 4.338], northEast: [50.856, 4.35] }); return `${p.length} pois, first=${p[0]?.name} icon=${p[0]?.iconIds}`; });
      await step('isochrones', async () => (await yatmo.isochrones({ mode: 'walking', latitude: LAT, longitude: LNG })).map((i) => `${i.label}:${i.geometry.type}`).join(', '));
      await step('pluginUrl', async () => yatmo.pluginUrl({ latitude: LAT, longitude: LNG }));
      log('ALL CLIENT CALLS DONE');
    })();
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <YatmoMapView
        client={yatmo}
        property={{ latitude: LAT, longitude: LNG }}
        zoom={15}
        isochrones="walking"
        onError={(e) => log(`MAP ERROR: ${e}`)}
        onPoiSelected={(poi) => log(`POI TAP: ${poi.name} (${poi.type})`)}
        style={styles.map}
      />
      <ScrollView style={styles.log}>
        {lines.map((l, i) => <Text key={i} style={styles.line}>{l}</Text>)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  map: { height: 520 },
  log: { flex: 1, padding: 8 },
  line: { fontSize: 11, fontFamily: 'monospace', color: '#202020' },
});
