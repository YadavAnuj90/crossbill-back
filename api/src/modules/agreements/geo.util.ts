/** Great-circle distance between two lat/lng points, in kilometres (Haversine). */
export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface Geofence { label: string; lat: number; lng: number; radiusKm: number; }

/**
 * 'ok'      → no fences configured, or the point is inside at least one fence
 * 'outside' → fences configured and the point is outside all of them
 * 'unknown' → no point supplied
 */
export function evaluateGeofence(
  fences: Geofence[],
  lat?: number | null,
  lng?: number | null,
): 'ok' | 'outside' | 'unknown' {
  if (lat == null || lng == null) return 'unknown';
  if (!fences || fences.length === 0) return 'ok';
  const inside = fences.some((f) => haversineKm(f.lat, f.lng, lat, lng) <= f.radiusKm);
  return inside ? 'ok' : 'outside';
}
