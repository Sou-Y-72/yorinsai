import { Spot, ConditionInput, TransitStatusInfo } from '@/types';
import { timeToMinutes, minutesToTime, getMinutesBetween, addMinutesToTime } from './travel';
import { evaluateTransitStatus } from './transit-schedule';

export interface SpotTravelEvaluation {
  spot: Spot;
  travelFromOrigin: number;
  travelToDestination: number;
  arrivalTimeAtSpot: string;
  departureTimeFromSpot: string;
  mustLeaveSpotTime: string;
  arrivalTimeAtDestination: string;
  arrivalBufferMinutes: number;
  openMarginMinutes: number;
  openingStatusText: string;
  closingWarning?: string;
  transitStatus: TransitStatusInfo;
  travelReliability: 'high' | 'medium' | 'low';
}

/**
 * 足切り判定および時間計算を行う
 * 1. 到着希望時刻に間に合うか（安全バッファ15分）
 * 2. 営業時間内に十分滞在できるか
 * 3. 帰りの公共交通（最終便）が運行しているか
 */
export function evaluateAndFilterSpots(
  spots: Spot[],
  condition: ConditionInput,
  travelMatrix: Map<string, { fromOrigin: number; toDest: number; reliability: 'high' | 'medium' | 'low' }>,
  safetyBufferMinutes = 15
): { passed: SpotTravelEvaluation[]; filteredOutCount: number } {
  const availableTotalMinutes = getMinutesBetween(
    condition.currentTime,
    condition.targetArrivalTime
  );
  const targetArrivalMins = timeToMinutes(condition.targetArrivalTime);

  const passed: SpotTravelEvaluation[] = [];
  let filteredOutCount = 0;

  for (const spot of spots) {
    const travel = travelMatrix.get(spot.spotId) || {
      fromOrigin: 25,
      toDest: 25,
      reliability: 'low' as const,
    };

    const stayMinutes = spot.recommendedStayMinutes;
    const requiredTotalMinutes =
      travel.fromOrigin + stayMinutes + travel.toDest + safetyBufferMinutes;

    // 1. 到着希望時刻による足切り
    if (requiredTotalMinutes > availableTotalMinutes) {
      filteredOutCount++;
      continue;
    }

    // 各時刻を計算
    const arrivalTimeAtSpot = addMinutesToTime(
      condition.currentTime,
      travel.fromOrigin
    );
    const departureTimeFromSpot = addMinutesToTime(
      arrivalTimeAtSpot,
      stayMinutes
    );
    const arrivalTimeAtDestination = addMinutesToTime(
      departureTimeFromSpot,
      travel.toDest
    );

    // スポット出発推奨時刻 = 到着希望時刻 - 移動時間 - 安全バッファ
    const mustLeaveMins = targetArrivalMins - travel.toDest - safetyBufferMinutes;
    const mustLeaveSpotTime = minutesToTime(mustLeaveMins);

    // 到着希望時刻までの余裕分数
    const arrivalAtDestMins = timeToMinutes(arrivalTimeAtDestination);
    const arrivalBufferMinutes = Math.max(0, targetArrivalMins - arrivalAtDestMins);

    // 2. 営業時間による足切り
    const arrivalMinutes = timeToMinutes(arrivalTimeAtSpot);
    const departureMinutes = timeToMinutes(departureTimeFromSpot);
    const openMinutes = timeToMinutes(spot.openTime);
    let closeMinutes = timeToMinutes(spot.closeTime);

    // 終日利用・屋外スポットの場合
    const isAlwaysOpen =
      spot.openingType === 'always_open' ||
      spot.closeTime === '24:00' ||
      (spot.openTime === '00:00' && spot.closeTime === '00:00');

    if (isAlwaysOpen) {
      closeMinutes = 1440;
    } else if (closeMinutes < openMinutes) {
      closeMinutes += 1440; // 深夜営業
    }

    // 開店前または閉店時間を超えてしまう場合は足切り
    if (!isAlwaysOpen && (arrivalMinutes < openMinutes || departureMinutes > closeMinutes)) {
      filteredOutCount++;
      continue;
    }

    const openMarginMinutes = isAlwaysOpen ? 120 : Math.max(0, closeMinutes - departureMinutes);

    // 自然な営業時間ステータステキストの構築
    let openingStatusText = spot.openingLabel || `${spot.openTime}〜${spot.closeTime}`;
    let closingWarning: string | undefined;

    if (!isAlwaysOpen && spot.openingType !== 'depends_on_facility') {
      if (openMarginMinutes <= 35) {
        closingWarning = `⚠️ 閉館${openMarginMinutes}分前`;
        openingStatusText = `${spot.closeTime}まで (閉館まで${openMarginMinutes}分の余裕)`;
      } else {
        openingStatusText = `${spot.closeTime}まで (閉館まで${openMarginMinutes}分の余裕)`;
      }
    }

    // 3. 帰りの公共交通（最終便）の運行可否判定
    const transitStatus = evaluateTransitStatus(
      spot.name,
      condition.destination,
      departureTimeFromSpot,
      condition.transitModes
    );

    // 最終便終了済みの場合は足切り
    if (transitStatus.status === 'ended') {
      filteredOutCount++;
      continue;
    }

    passed.push({
      spot,
      travelFromOrigin: travel.fromOrigin,
      travelToDestination: travel.toDest,
      arrivalTimeAtSpot,
      departureTimeFromSpot,
      mustLeaveSpotTime,
      arrivalTimeAtDestination,
      arrivalBufferMinutes,
      openMarginMinutes,
      openingStatusText,
      closingWarning,
      transitStatus,
      travelReliability: travel.reliability,
    });
  }

  return { passed, filteredOutCount };
}
