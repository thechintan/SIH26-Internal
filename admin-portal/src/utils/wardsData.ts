export interface WardPolygon {
  name: string;
  color: string;
  coordinates: [number, number][]; // [lat, lng] for Leaflet
  center: [number, number];
}

export const AHMEDABAD_WARDS: WardPolygon[] = [
  {
    name: 'Ward 1 - Navrangpura',
    color: '#6366f1',
    coordinates: [
      [23.040, 72.540],
      [23.040, 72.560],
      [23.060, 72.560],
      [23.060, 72.540],
    ],
    center: [23.050, 72.550],
  },
  {
    name: 'Ward 2 - Maninagar',
    color: '#06b6d4',
    coordinates: [
      [23.040, 72.560],
      [23.040, 72.580],
      [23.060, 72.580],
      [23.060, 72.560],
    ],
    center: [23.050, 72.570],
  },
  {
    name: 'Ward 3 - Satellite',
    color: '#ec4899',
    coordinates: [
      [23.020, 72.540],
      [23.020, 72.560],
      [23.040, 72.560],
      [23.040, 72.540],
    ],
    center: [23.030, 72.550],
  },
  {
    name: 'Ward 4 - Bopal',
    color: '#8b5cf6',
    coordinates: [
      [23.020, 72.560],
      [23.020, 72.580],
      [23.040, 72.580],
      [23.040, 72.560],
    ],
    center: [23.030, 72.570],
  },
];

export const CITY_DEFAULT_CENTER: [number, number] = [23.040, 72.560];
export const CITY_DEFAULT_ZOOM = 13;
