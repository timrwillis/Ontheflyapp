function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Approximate coordinates for common US cities used in worker/business profiles
const CITY_COORDS: Record<string, readonly [number, number]> = {
  'Kansas City': [39.0997, -94.5786],
  'Kansas City, MO': [39.0997, -94.5786],
  'Kansas City, KS': [39.1155, -94.6268],
  'New York': [40.7128, -74.006],
  'New York City': [40.7128, -74.006],
  'Los Angeles': [34.0522, -118.2437],
  'Chicago': [41.8781, -87.6298],
  'Houston': [29.7604, -95.3698],
  'Phoenix': [33.4484, -112.074],
  'Philadelphia': [39.9526, -75.1652],
  'San Antonio': [29.4241, -98.4936],
  'San Diego': [32.7157, -117.1611],
  'Dallas': [32.7767, -96.797],
  'Austin': [30.2672, -97.7431],
  'Nashville': [36.1627, -86.7816],
  'Denver': [39.7392, -104.9903],
  'Miami': [25.7617, -80.1918],
  'Seattle': [47.6062, -122.3321],
  'Portland': [45.5051, -122.675],
  'Atlanta': [33.749, -84.388],
  'Boston': [42.3601, -71.0589],
  'Las Vegas': [36.1699, -115.1398],
  'Minneapolis': [44.9778, -93.265],
  'St. Louis': [38.627, -90.1994],
  'Tampa': [27.9506, -82.4572],
  'Orlando': [28.5383, -81.3792],
  'Charlotte': [35.2271, -80.8431],
  'Raleigh': [35.7796, -78.6382],
  'Indianapolis': [39.7684, -86.1581],
  'Columbus': [39.9612, -82.9988],
  'San Francisco': [37.7749, -122.4194],
};

export function getCityCoords(city: string): readonly [number, number] | null {
  const normalized = city.trim();
  return CITY_COORDS[normalized] ?? null;
}
