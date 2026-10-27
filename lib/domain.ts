export type Place = { name: string; latitude: number; longitude: number; country?: string };
export const cities: Place[] = [
  { name: 'New Delhi', latitude: 28.6139, longitude: 77.209, country: 'India' },
  { name: 'Mumbai', latitude: 19.076, longitude: 72.8777, country: 'India' },
  { name: 'Bengaluru', latitude: 12.9716, longitude: 77.5946, country: 'India' },
  { name: 'Kolkata', latitude: 22.5726, longitude: 88.3639, country: 'India' },
  { name: 'Chennai', latitude: 13.0827, longitude: 80.2707, country: 'India' },
  { name: 'Lucknow', latitude: 26.8467, longitude: 80.9462, country: 'India' },
];
export const defaultCity = cities.find(city => city.name === 'Lucknow')!;
export const pollutants = ['pm2_5', 'pm10', 'nitrogen_dioxide', 'ozone', 'sulphur_dioxide', 'carbon_monoxide'] as const;
export type Hour = { time: number; us_aqi: number | null; pm2_5: number | null; pm10: number | null; nitrogen_dioxide: number | null; ozone: number | null; sulphur_dioxide: number | null; carbon_monoxide: number | null; temperature_2m: number | null; relative_humidity_2m: number | null; wind_speed_10m: number | null };
export type Validation = { horizon:number; folds:number; ridgeMae:number|null; persistenceMae:number|null; seasonalMae:number|null; selectedMae:number|null; radius80:number|null };
export type ModelResult = { method: string; samples: number; mae: number | null; persistenceMae: number | null; selected?:string; validation?:Validation[]; points: { time: number; pm2_5: number; lower?:number|null; upper?:number|null }[] };
export type AirData = { place: Place; fetchedAt: number; validAt: number; timezone: string; current: Hour; hours: Hour[]; cache: 'fresh' | 'cached' | 'stale'; warning?: string; model: ModelResult; provenance: { provider: string; type: string; resolution: string; aqiStandard: string; url: string } };
export function aqiCategory(aqi: number | null) {
  if (aqi === null || !Number.isFinite(aqi)) return { label: 'Unavailable', color: '#87928e' };
  if (aqi <= 50) return { label: 'Good', color: '#49a888' };
  if (aqi <= 100) return { label: 'Moderate', color: '#e7b64b' };
  if (aqi <= 150) return { label: 'Unhealthy for sensitive groups', color: '#e79453' };
  if (aqi <= 200) return { label: 'Unhealthy', color: '#de726e' };
  if (aqi <= 300) return { label: 'Very unhealthy', color: '#a58acb' };
  return { label: 'Hazardous', color: '#a35e7a' };
}
export function simulate(base: number, shares: number[], cuts: number[]) {
  if (!Number.isFinite(base) || base < 0 || shares.length !== 3 || cuts.length !== 3 || [...shares, ...cuts].some(v => !Number.isFinite(v) || v < 0 || v > 100) || shares.reduce((a,b)=>a+b,0) > 100) throw new Error('Invalid simulation inputs');
  const reduction = shares.reduce((sum, share, i) => sum + share / 100 * cuts[i] / 100, 0);
  return { baseline: base, projected: base * (1-reduction), reductionPercent: reduction * 100, backgroundShare: 100 - shares.reduce((a,b)=>a+b,0) };
}
