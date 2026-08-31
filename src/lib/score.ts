import { Spot, RecommendationLevel, ConfidenceInfo, WeatherType } from '@/types';
import { SpotTravelEvaluation } from './filter';

export interface ScoreBreakdown {
  preferenceScore: number;
  efficiencyScore: number;
  timeFitScore: number;
  weatherScore: number;
  openMarginScore: number;
  hiroshimaScore: number;
  totalScore: number;
  recommendationExpression: RecommendationLevel;
  confidence: ConfidenceInfo;
  detourCostMinutes: number;
}

/**
 * 観光効率スコア (0-100)
 * stay / (stay + detourCost) * 100
 */
export function calculateEfficiencyScore(
  stayMinutes: number,
  detourCostMinutes: number
): number {
  const cost = Math.max(0, detourCostMinutes);
  const efficiency = (stayMinutes / (stayMinutes + cost)) * 100;
  return Math.round(Math.min(100, Math.max(0, efficiency)));
}

/**
 * 時間適合度スコア (0-100)
 * 利用率 80-90% を最高評価
 */
export function calculateTimeFitScore(
  usedMinutes: number,
  availableTotalMinutes: number
): number {
  if (availableTotalMinutes <= 0) return 50;
  const usageRate = (usedMinutes / availableTotalMinutes) * 100;

  if (usageRate >= 80 && usageRate <= 90) return 100;
  if (usageRate >= 70 && usageRate < 80) return 90;
  if (usageRate > 90 && usageRate <= 100) return 85; // 少しタイト
  if (usageRate >= 60 && usageRate < 70) return 75;
  if (usageRate >= 50 && usageRate < 60) return 60;
  if (usageRate >= 30 && usageRate < 50) return 40;
  return 20;
}

/**
 * 営業余裕度スコア (0-100)
 */
export function calculateOpenMarginScore(marginMinutes: number): number {
  if (marginMinutes >= 60) return 100;
  if (marginMinutes >= 30) return 80;
  if (marginMinutes >= 15) return 60;
  if (marginMinutes >= 5) return 30;
  if (marginMinutes >= 0) return 10;
  return 0;
}

/**
 * 情報信頼度 (0-100) とその詳細内訳を算出
 */
export function calculateConfidence(
  spot: Spot,
  travelReliability: 'high' | 'medium' | 'low',
  preferenceConfidence: number,
  availableTotalMinutes: number,
  usedMinutes: number
): ConfidenceInfo {
  // 1. データ充足度 (35%)
  let dataPoints = 0;
  const totalPoints = 6;
  if (spot.openTime && spot.closeTime) dataPoints++;
  if (spot.priceText || spot.priceMin !== undefined) dataPoints++;
  if (spot.latitude && spot.longitude) dataPoints++;
  if (spot.recommendedStayMinutes > 0) dataPoints++;
  if (spot.imageUrl) dataPoints++;
  if (spot.features && spot.features.length > 0) dataPoints++;
  const dataCompletenessScore = Math.round((dataPoints / totalPoints) * 100);

  // 2. 移動時間の信頼度 (35%)
  const travelRelScore =
    travelReliability === 'high' ? 100 : travelReliability === 'medium' ? 85 : 70;

  // 3. AI嗜好理解確信度 (20%)
  const prefConfScore = Math.round(Math.min(100, Math.max(50, preferenceConfidence)));

  // 4. 時間情報の安定性 (10%)
  const slackMinutes = availableTotalMinutes - usedMinutes;
  const timeStabilityScore =
    slackMinutes >= 20 ? 100 : slackMinutes >= 10 ? 85 : 70;

  // 加重合算
  const totalConfidenceScore = Math.round(
    dataCompletenessScore * 0.35 +
      travelRelScore * 0.35 +
      prefConfScore * 0.20 +
      timeStabilityScore * 0.10
  );

  const level: '高' | '中' | '低' =
    totalConfidenceScore >= 85 ? '高' : totalConfidenceScore >= 70 ? '中' : '低';

  return {
    score: totalConfidenceScore,
    level,
    badgeText: `情報信頼度: ${level} (${totalConfidenceScore}%)`,
    breakdown: {
      dataCompleteness: {
        score: dataCompletenessScore,
        label: '施設・営業データ',
        description: '営業時間・料金・施設情報の確認済み度',
        verified: dataCompletenessScore >= 80,
      },
      travelReliability: {
        score: travelRelScore,
        label: '移動経路データ',
        description:
          travelReliability === 'high'
            ? '主要交通ダイヤに基づく確定移動時間'
            : '距離と交通機関による推計移動時間',
        verified: travelReliability === 'high',
      },
      preferenceConfidence: {
        score: prefConfScore,
        label: 'ご希望との照合度',
        description: '興味タグ・自由記述に対するAIの理解の確かさ',
        verified: prefConfScore >= 75,
      },
      timeStability: {
        score: timeStabilityScore,
        label: 'スケジュール余裕度',
        description: `目的地到着前に約${Math.max(15, slackMinutes)}分のゆとりを確保`,
        verified: timeStabilityScore >= 85,
      },
    },
  };
}

/**
 * おすすめ表現の判定
 */
export function getRecommendationExpression(score: number): RecommendationLevel {
  if (score >= 85) return 'かなりおすすめ';
  if (score >= 70) return 'おすすめ';
  return '条件に合っています';
}

/**
 * 総合スコアと全スコア内訳を算出
 */
export function calculateSpotScores(
  evalData: SpotTravelEvaluation,
  directTravelMinutes: number,
  availableTotalMinutes: number,
  weather: WeatherType,
  preferenceScore: number,
  preferenceConfidence: number
): ScoreBreakdown {
  const spot = evalData.spot;
  const stay = spot.recommendedStayMinutes;

  // 寄り道コスト
  const detourCostMinutes = Math.max(
    0,
    evalData.travelFromOrigin + evalData.travelToDestination - directTravelMinutes
  );

  // 1. 好み一致度 (35%)
  const pref = Math.min(100, Math.max(0, preferenceScore));

  // 2. 観光効率 (20%)
  const efficiencyScore = calculateEfficiencyScore(stay, detourCostMinutes);

  // 3. 時間適合度 (15%)
  const usedMinutes =
    evalData.travelFromOrigin + stay + evalData.travelToDestination;
  const timeFitScore = calculateTimeFitScore(usedMinutes, availableTotalMinutes);

  // 4. 天候適合度 (10%)
  const weatherScore = spot.weatherSuitability[weather] || 80;

  // 5. 営業余裕度 (10%)
  const openMarginScore = calculateOpenMarginScore(evalData.openMarginMinutes);

  // 6. 広島ならでは度 (10%)
  const hiroshimaScore = spot.hiroshimaScore;

  // 総合推薦スコア (0-100)
  const totalScore = Math.round(
    pref * 0.35 +
      efficiencyScore * 0.20 +
      timeFitScore * 0.15 +
      weatherScore * 0.10 +
      openMarginScore * 0.10 +
      hiroshimaScore * 0.10
  );

  const recommendationExpression = getRecommendationExpression(totalScore);

  const confidence = calculateConfidence(
    spot,
    evalData.travelReliability,
    preferenceConfidence,
    availableTotalMinutes,
    usedMinutes
  );

  return {
    preferenceScore: pref,
    efficiencyScore,
    timeFitScore,
    weatherScore,
    openMarginScore,
    hiroshimaScore,
    totalScore,
    recommendationExpression,
    confidence,
    detourCostMinutes,
  };
}
