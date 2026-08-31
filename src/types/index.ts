export type WeatherType = 'sunny' | 'cloudy' | 'rain';

export type RecommendationLevel = 'かなりおすすめ' | 'おすすめ' | '条件に合っています';

export type OpeningType = 'always_open' | 'fixed_hours' | 'depends_on_facility' | 'unknown';

export interface Spot {
  spotId: string;
  name: string;
  description: string;
  shortDescription?: string;
  area: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  categories: string[];
  features: string[];
  recommendedStayMinutes: number;
  openTime: string; // "09:00"
  closeTime: string; // "18:00"
  openingType?: OpeningType;
  openingLabel?: string; // "公園は終日利用可", "10:00〜18:00", "店舗により異なります"
  closedDays: string[]; // ["水", "年末年始"]
  priceMin: number;
  priceMax: number;
  priceText?: string;
  indoorLevel: 'indoor' | 'outdoor' | 'semi';
  weatherSuitability: {
    sunny: number;
    cloudy: number;
    rain: number;
  };
  hiroshimaScore: number; // 0 - 100
  imageUrl: string;
  googleMapsUrl: string;
  transitTypeHint?: 'car' | 'bus' | 'train' | 'walk';
}

export type TransitMode = 'transit' | 'car' | 'walk';

export interface ConditionInput {
  origin: string;
  destination: string;
  targetArrivalTime: string; // "18:30"
  currentTime: string; // "15:00"
  interests: string[];
  freeText?: string;
  weather: WeatherType;
  transitModes?: TransitMode[]; // ['transit', 'car', 'walk']
}

export interface ConfidenceBreakdownItem {
  score: number;
  label: string;
  description: string;
  verified: boolean;
}

export interface ConfidenceInfo {
  score: number; // 0-100
  level: '高' | '中' | '低';
  badgeText: string;
  breakdown: {
    dataCompleteness: ConfidenceBreakdownItem;
    travelReliability: ConfidenceBreakdownItem;
    preferenceConfidence: ConfidenceBreakdownItem;
    timeStability: ConfidenceBreakdownItem;
  };
}

export interface TransitStatusInfo {
  lineName: string;
  status: 'operating' | 'close_to_last' | 'ended';
  lastDepartureTime?: string; // "23:15"
  minutesUntilLast?: number; // 45
  badgeText: string; // "JR山陽本線 利用可能", "⚠️ 最終便まで残り25分"
  isWarning: boolean;
}

export interface RecommendedSpot {
  spot: Spot;
  rank: number; // 1, 2, 3
  recommendationExpression: RecommendationLevel;
  totalScore: number;
  travelMinutesFromOrigin: number;
  stayMinutes: number;
  travelMinutesToDestination: number;
  directTravelMinutes: number;
  detourCostMinutes: number;
  arrivalTimeAtSpot: string; // "15:20"
  departureTimeFromSpot: string; // "16:20"
  mustLeaveSpotTime: string; // "16:15" (スポット出発推奨時刻 = targetArrivalTime - travelToDest - safetyBuffer)
  arrivalTimeAtDestination: string; // "17:42"
  arrivalBufferMinutes: number; // 18 (到着希望時刻までの余裕分数)
  openMarginMinutes: number;
  openingStatusText: string; // "18:00まで（閉館まで50分の余裕）" / "終日利用可"
  closingWarning?: string; // "⚠️ 閉館30分前"
  transitStatus: TransitStatusInfo;
  shortReason: string; // 40〜60文字（おすすめ一覧用）
  detailReason: string; // 100〜150文字（詳細画面用）
  reason: string; // 互換用
  confidence: ConfidenceInfo;
  scores: {
    preferenceScore: number;
    efficiencyScore: number;
    timeFitScore: number;
    weatherScore: number;
    openMarginScore: number;
    hiroshimaScore: number;
  };
}

export interface RecommendationResponse {
  recommendations: RecommendedSpot[];
  searchParams: ConditionInput;
  availableTotalMinutes: number;
  totalCandidatesEvaluated: number;
  totalPassedFilter: number;
  fallbackUsed: boolean;
}

export interface DemoPreset {
  id: string;
  label: string;
  badge: string;
  description: string;
  data: ConditionInput;
}
