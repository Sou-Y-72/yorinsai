import travelData from '@/data/travel-times.json';
import spotsData from '@/data/spots.json';
import { Spot, TransitMode } from '@/types';

const typedSpots = spotsData as Spot[];

/**
 * "15:00" のようなHH:mm形式の文字列を分数（0〜1440）に変換
 */
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * 分数を "15:20" のようなHH:mm形式に変換
 */
export function minutesToTime(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * 基準時刻に分数を加算
 */
export function addMinutesToTime(timeStr: string, addMinutes: number): string {
  return minutesToTime(timeToMinutes(timeStr) + addMinutes);
}

/**
 * 2つの時刻の間の分数差（endTime - startTime）
 */
export function getMinutesBetween(startTime: string, endTime: string): number {
  let start = timeToMinutes(startTime);
  let end = timeToMinutes(endTime);
  if (end < start) {
    end += 1440; // 翌日またぎ
  }
  return end - start;
}

/**
 * 2地点間の直線距離（km）をハバーサイン公式で計算
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // 地球の半径 (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 緯度経度から最も近い主要地点（ハブ地点・スポット）を探索
 */
export function findNearestLocation(lat: number, lng: number): string {
  let minDistance = Infinity;
  let nearestName = '広島駅'; // デフォルト

  const hubs = travelData.hubLocations as Record<string, { lat: number; lng: number }>;
  for (const [name, coords] of Object.entries(hubs)) {
    const dist = calculateDistanceKm(lat, lng, coords.lat, coords.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearestName = name;
    }
  }

  for (const spot of typedSpots) {
    const dist = calculateDistanceKm(lat, lng, spot.latitude, spot.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      nearestName = spot.name;
    }
  }

  return nearestName;
}

/**
 * 地点名から緯度経度を取得
 */
function getLocationCoords(locationName: string): { lat: number; lng: number } | null {
  const cleanName = locationName.trim();
  
  // hubLocationsから検索
  const hubs = travelData.hubLocations as Record<string, { lat: number; lng: number }>;
  for (const [key, coords] of Object.entries(hubs)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return coords;
    }
  }

  // spotsから検索
  const spot = typedSpots.find(
    (s) => s.name.includes(cleanName) || cleanName.includes(s.name)
  );
  if (spot) {
    return { lat: spot.latitude, lng: spot.longitude };
  }

  return null;
}

/**
 * 指定された地点が車専用・山頂スポットか判定
 */
function isCarHintSpot(locationName: string): boolean {
  const spot = typedSpots.find(
    (s) => s.name.includes(locationName) || locationName.includes(s.name)
  );
  return spot?.transitTypeHint === 'car';
}

/**
 * 共通インターフェース: 2地点間の移動時間を取得（分）
 * 移動媒体（transitModes: 公共交通, 車, 徒歩）に応じた所要時間を計算
 */
export async function getTravelTime(
  origin: string,
  destination: string,
  transitModes: TransitMode[] = ['transit', 'car', 'walk']
): Promise<{ minutes: number; reliability: 'high' | 'medium' | 'low' }> {
  const originClean = origin.trim();
  const destClean = destination.trim();

  if (originClean === destClean) {
    return { minutes: 0, reliability: 'high' };
  }

  const modes = transitModes.length > 0 ? transitModes : (['transit', 'walk'] as TransitMode[]);
  const isCarOnly = modes.length === 1 && modes.includes('car');
  const isWalkOnly = modes.length === 1 && modes.includes('walk');
  const hasCar = modes.includes('car');

  const involvesCarSpot = isCarHintSpot(originClean) || isCarHintSpot(destClean);

  const originCoords = getLocationCoords(originClean);
  const destCoords = getLocationCoords(destClean);
  let distanceKm = 5.0; // デフォルト推定距離

  if (originCoords && destCoords) {
    distanceKm = calculateDistanceKm(
      originCoords.lat,
      originCoords.lng,
      destCoords.lat,
      destCoords.lng
    );
  }

  // 徒歩のみの場合
  if (isWalkOnly) {
    const walkMinutes = Math.max(5, Math.round((distanceKm / 4.5) * 60));
    return { minutes: walkMinutes, reliability: distanceKm < 3.0 ? 'high' : 'medium' };
  }

  const routes = travelData.routes as Record<string, number>;

  // 1. travel-times.jsonからベース時間を取得
  let baseMinutes: number | null = null;
  let reliability: 'high' | 'medium' | 'low' = 'low';

  const directKey = `${originClean}->${destClean}`;
  const reverseKey = `${destClean}->${originClean}`;

  if (routes[directKey] !== undefined) {
    baseMinutes = routes[directKey];
    reliability = 'high';
  } else if (routes[reverseKey] !== undefined) {
    baseMinutes = routes[reverseKey];
    reliability = 'high';
  } else {
    for (const [key, minutes] of Object.entries(routes)) {
      const [from, to] = key.split('->');
      if (
        (originClean.includes(from) || from.includes(originClean)) &&
        (destClean.includes(to) || to.includes(destClean))
      ) {
        baseMinutes = minutes;
        reliability = 'high';
        break;
      }
    }
  }

  // 距離からの補間
  if (baseMinutes === null) {
    if (distanceKm < 1.0) {
      baseMinutes = Math.max(5, Math.round((distanceKm / 4.5) * 60));
      reliability = 'medium';
    } else {
      baseMinutes = Math.round((distanceKm / 25) * 60 + 8);
      reliability = 'medium';
    }
  }

  // 2. 移動手段に応じた時間補正
  let finalMinutes = baseMinutes;

  if (hasCar) {
    if (isCarOnly) {
      // 車のみの場合
      finalMinutes = Math.max(5, Math.round((distanceKm / 35) * 60 + 5));
    } else {
      // 車を含み公共交通もある場合（最速を採用）
      const carEstimate = Math.max(5, Math.round((distanceKm / 35) * 60 + 5));
      finalMinutes = Math.min(baseMinutes, carEstimate);
    }
  } else {
    // 車がない（公共交通・徒歩のみ）場合
    // 山頂・山奥など路線バスがない車専用スポット（筆影山展望台、仏通寺など）への移動
    if (involvesCarSpot) {
      // 最寄駅から山頂への徒歩登山・ローカル山道移動として+55分加算
      finalMinutes = baseMinutes + 55;
    }
  }

  return { minutes: finalMinutes, reliability };
}
