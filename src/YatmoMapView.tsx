import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type NativeSyntheticEvent, type StyleProp, type ViewStyle } from 'react-native';
import {
  Camera, GeoJSONSource, Images, Layer, Map,
  type CameraRef, type LngLatBounds, type MapRef, type PressEventWithFeatures, type ViewState, type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';
import type { YatmoClient } from './client';
import { mapStyleUrl, type YatmoMapStyle, type YatmoTravelMode } from './config';
import { poiIconUrl } from './cdn';
import type { YatmoIsochrone, YatmoPoi } from './models';

export interface YatmoMapViewProps {
  client: YatmoClient;
  /** Position of the pin and initial centre. */
  property: { latitude: number; longitude: number };
  zoom?: number;
  mapStyle?: YatmoMapStyle;
  /** Category ids from `client.simplifiedCategories()`. Undefined = all. */
  poiTypeIds?: number[];
  poiIconSize?: 24 | 32;
  /** Draws the 5 / 10 / 20 minute areas when set. */
  isochrones?: YatmoTravelMode;
  /** No POI request below this zoom. */
  minZoomForPois?: number;
  /** Fill colours from the smallest area to the largest (default = the web plugin palette: 5 min blue, 10 min orange, 20 min pink). */
  isochroneColors?: [string, string, string];
  /** Like the web plugin: once drawn, the camera fits the largest area; removing `isochrones` restores the previous view. */
  fitIsochrones?: boolean;
  /** Padding around the isochrones when the camera fits them, in points. */
  isochronePadding?: number;
  onPoiSelected?: (poi: YatmoPoi) => void;
  onError?: (error: unknown) => void;
  style?: StyleProp<ViewStyle>;
  /** Passed through to the MapLibre Map (your own sources and layers). */
  children?: React.ReactNode;
}

const DEBOUNCE_MS = 300;

/** Bounding box [west, south, east, north] of a GeoJSON Polygon or MultiPolygon, whatever its nesting depth. */
function boundsOf(geometry: { coordinates: unknown }): LngLatBounds | undefined {
  let west = 180, south = 90, east = -180, north = -90, count = 0;
  const walk = (node: unknown) => {
    if (!Array.isArray(node)) return;
    if (node.length >= 2 && typeof node[0] === 'number' && typeof node[1] === 'number') {
      west = Math.min(west, node[0]); east = Math.max(east, node[0]); south = Math.min(south, node[1]); north = Math.max(north, node[1]); count++;
    } else {
      node.forEach(walk);
    }
  };
  walk(geometry.coordinates);
  return count >= 2 ? [west, south, east, north] : undefined;
}

/** rgba(r,g,b,a) -> rgb(r,g,b): the outline of an isochrone is its fill colour, opaque. */
function opaque(color: string): string {
  const m = /^rgba\((\s*\d+\s*,\s*\d+\s*,\s*\d+)\s*,[^)]*\)$/.exec(color);
  return m ? `rgb(${m[1]})` : color;
}

/**
 * MapLibre map (maplibre-react-native 11) with the Yatmo style, the property pin, POI markers that follow
 * the camera and optional isochrones. The component draws no popup: handle `onPoiSelected` with your own UI.
 */
export function YatmoMapView({
  client, property, zoom = 15, mapStyle = 'liberty', poiTypeIds, poiIconSize = 24, isochrones,
  minZoomForPois = 13, isochroneColors = ['rgba(112,173,240,0.5)', 'rgba(245,166,35,0.4)', 'rgba(239,66,127,0.3)'],
  fitIsochrones = true, isochronePadding = 40,
  onPoiSelected, onError, style, children,
}: YatmoMapViewProps) {
  const [pois, setPois] = useState<YatmoPoi[]>([]);
  const [areas, setAreas] = useState<YatmoIsochrone[]>([]);
  const cameraRef = useRef<CameraRef>(null);
  const mapRef = useRef<MapRef>(null);
  const viewBeforeIsochrones = useRef<ViewState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);
  const poiTypeIdsKey = (poiTypeIds ?? []).join(',');
  const country = client.configuration.country;

  const loadPois = useCallback((bounds: [west: number, south: number, east: number, north: number], currentZoom: number) => {
    if (timer.current) clearTimeout(timer.current);
    if (currentZoom < minZoomForPois) { setPois([]); return; }
    const id = ++requestId.current;
    timer.current = setTimeout(async () => {
      try {
        const result = await client.points({
          southWest: [bounds[1], bounds[0]], northEast: [bounds[3], bounds[2]],
          poiTypeIds: poiTypeIdsKey ? poiTypeIdsKey.split(',').map(Number) : undefined,
        });
        if (id === requestId.current) setPois(result);
      } catch (e) {
        onError?.(e);
      }
    }, DEBOUNCE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, minZoomForPois, poiTypeIdsKey]);

  useEffect(() => { viewBeforeIsochrones.current = null; }, [property.latitude, property.longitude]);

  useEffect(() => {
    if (!isochrones) {
      setAreas([]);
      const before = viewBeforeIsochrones.current;
      if (before) { viewBeforeIsochrones.current = null; cameraRef.current?.easeTo({ center: before.center, zoom: before.zoom }); }
      return;
    }
    let cancelled = false;
    client.isochrones({ mode: isochrones, latitude: property.latitude, longitude: property.longitude })
      .then(async (result) => {
        if (cancelled) return;
        setAreas(result);
        const largest = result[result.length - 1];
        const bounds = largest ? boundsOf(largest.geometry) : undefined;
        if (fitIsochrones && bounds) {
          if (!viewBeforeIsochrones.current) viewBeforeIsochrones.current = (await mapRef.current?.getViewState()) ?? null;
          cameraRef.current?.fitBounds(bounds, { padding: { top: isochronePadding, right: isochronePadding, bottom: isochronePadding, left: isochronePadding } });
        }
      })
      .catch((e) => onError?.(e));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, isochrones, property.latitude, property.longitude]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const images = useMemo(() => {
    const map: Record<string, { source: { uri: string } }> = {};
    for (const poi of pois) {
      const iconId = poi.iconIds[0];
      if (iconId && !map[`yatmo-icon-${iconId}`]) map[`yatmo-icon-${iconId}`] = { source: { uri: poiIconUrl(country, iconId, poiIconSize) } };
    }
    return map;
  }, [pois, country, poiIconSize]);

  const poiCollection = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: pois.filter((p) => p.iconIds.length > 0).map((p) => ({
      type: 'Feature',
      id: p.id,
      properties: { id: p.id, icon: `yatmo-icon-${p.iconIds[0]}` },
      geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
    })),
  }), [pois]);

  const areaCollection = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: [...areas].reverse().map((a, index) => ({
      type: 'Feature',
      properties: { rank: areas.length - 1 - index, label: a.label },
      geometry: a.geometry as GeoJSON.Geometry,
    })),
  }), [areas]);

  const propertyFeature = useMemo<GeoJSON.Feature>(() => ({
    type: 'Feature', properties: {},
    geometry: { type: 'Point', coordinates: [property.longitude, property.latitude] },
  }), [property.latitude, property.longitude]);

  const poiById = useMemo(() => new globalThis.Map(pois.map((p) => [p.id, p])), [pois]);

  const onRegionDidChange = useCallback((event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    const { bounds, zoom: currentZoom } = event.nativeEvent;
    if (bounds) loadPois(bounds, currentZoom ?? zoom);
  }, [loadPois, zoom]);

  const onPoiPress = useCallback((event: NativeSyntheticEvent<PressEventWithFeatures>) => {
    const id = event.nativeEvent.features?.[0]?.properties?.id as string | undefined;
    const poi = id ? poiById.get(id) : undefined;
    if (poi) onPoiSelected?.(poi);
  }, [poiById, onPoiSelected]);

  return (
    <View style={[styles.container, style]}>
      <Map
        ref={mapRef}
        style={styles.map}
        mapStyle={mapStyleUrl(mapStyle)}
        logo={false}
        attribution
        onRegionDidChange={onRegionDidChange}
      >
        <Camera ref={cameraRef} initialViewState={{ center: [property.longitude, property.latitude], zoom }} />

        <GeoJSONSource id="yatmo-isochrones" data={areaCollection}>
          <Layer
            id="yatmo-isochrones-fill"
            type="fill"
            style={{ fillColor: ['step', ['get', 'rank'], isochroneColors[0], 1, isochroneColors[1], 2, isochroneColors[2]] }}
          />
          <Layer
            id="yatmo-isochrones-line"
            type="line"
            style={{ lineColor: ['step', ['get', 'rank'], opaque(isochroneColors[0]), 1, opaque(isochroneColors[1]), 2, opaque(isochroneColors[2])], lineWidth: 3 }}
          />
        </GeoJSONSource>

        <Images images={images} />
        <GeoJSONSource id="yatmo-pois" data={poiCollection} onPress={onPoiPress}>
          <Layer
            id="yatmo-pois-symbols"
            type="symbol"
            style={{ iconImage: ['get', 'icon'], iconSize: 0.5, iconAllowOverlap: true, iconIgnorePlacement: true }}
          />
        </GeoJSONSource>

        <GeoJSONSource id="yatmo-property" data={propertyFeature}>
          <Layer
            id="yatmo-property-circle"
            type="circle"
            style={{ circleRadius: 9, circleColor: '#428BFF', circleStrokeColor: '#FFFFFF', circleStrokeWidth: 3 }}
          />
        </GeoJSONSource>

        {children}
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  map: { flex: 1 },
});
