import { NextResponse } from 'next/server';
import spotsData from '@/data/spots.json';
import { Spot, ConditionInput, RecommendedSpot, RecommendationResponse } from '@/types';
import { getTravelTime, getMinutesBetween, timeToMinutes } from '@/lib/travel';
import { evaluateAndFilterSpots } from '@/lib/filter';
import { evaluatePreferenceWithGemini } from '@/lib/ai';
import { calculateSpotScores } from '@/lib/score';

const allSpots = spotsData as Spot[];

export async function POST(request: Request) {
  try {
    const condition: Partial<ConditionInput> = await request.json();

    // 1. 必須入力バリデーション
    if (condition.origin === undefined || condition.origin.trim() === '') {
      return NextResponse.json(
        { error: '今いる場所を選択または入力してください。' },
        { status: 400 }
      );
    }
    if (condition.destination === undefined || condition.destination.trim() === '') {
      return NextResponse.json(
        { error: '次の目的地を選択または入力してください。' },
        { status: 400 }
      );
    }
    if (!condition.currentTime || condition.currentTime.trim() === '') {
      return NextResponse.json(
        { error: '現在時刻を設定してください。' },
        { status: 400 }
      );
    }
    if (!condition.targetArrivalTime || condition.targetArrivalTime.trim() === '') {
      return NextResponse.json(
        { error: '到着希望時刻を設定してください。' },
        { status: 400 }
      );
    }
    if (Array.isArray(condition.transitModes) && condition.transitModes.length === 0) {
      return NextResponse.json(
        { error: '移動手段を1つ以上選択してください。' },
        { status: 400 }
      );
    }

    const currentMins = timeToMinutes(condition.currentTime);
    const targetMins = timeToMinutes(condition.targetArrivalTime);

    // 同一時刻または1分後など極端な時間不足判定
    if (currentMins === targetMins) {
      return NextResponse.json({
        recommendations: [],
        searchParams: condition,
        availableTotalMinutes: 0,
        totalCandidatesEvaluated: allSpots.length,
        totalPassedFilter: 0,
        fallbackUsed: false,
        message: '現在時刻と到着希望時刻が同一です。時間に余裕を持った到着時刻を設定してください。',
      });
    }

    // 過去時刻（同日過去で差分が負）の判定（※23:50〜00:30のような翌日またぎはOK）
    const isOvernight = currentMins > 1320 && targetMins < 360; // 22:00以降〜朝6:00前のまたぎ
    if (targetMins < currentMins && !isOvernight) {
      return NextResponse.json({
        recommendations: [],
        searchParams: condition,
        availableTotalMinutes: 0,
        totalCandidatesEvaluated: allSpots.length,
        totalPassedFilter: 0,
        fallbackUsed: false,
        message: '到着希望時刻が現在時刻より過去に設定されています。正しい時刻を設定してください。',
      });
    }

    // デフォルト値の補完
    const normalizedCondition: ConditionInput = {
      origin: condition.origin.trim(),
      destination: condition.destination.trim(),
      currentTime: condition.currentTime.trim(),
      targetArrivalTime: condition.targetArrivalTime.trim(),
      interests: Array.isArray(condition.interests) && condition.interests.length > 0 ? condition.interests : ['グルメ', '歴史'],
      freeText: condition.freeText?.trim() || '',
      weather: condition.weather || 'sunny',
      transitModes: Array.isArray(condition.transitModes) && condition.transitModes.length > 0
        ? condition.transitModes
        : ['transit', 'walk'],
    };

    const availableTotalMinutes = getMinutesBetween(
      normalizedCondition.currentTime,
      normalizedCondition.targetArrivalTime
    );

    // 2. 直通移動時間の取得
    const directTravel = await getTravelTime(
      normalizedCondition.origin,
      normalizedCondition.destination,
      normalizedCondition.transitModes
    );

    // 空き時間が直通移動時間＋安全バッファ（15分）以下の場合は、寄り道不可として0件を返す
    if (availableTotalMinutes < directTravel.minutes + 15) {
      return NextResponse.json({
        recommendations: [],
        searchParams: normalizedCondition,
        availableTotalMinutes,
        totalCandidatesEvaluated: allSpots.length,
        totalPassedFilter: 0,
        fallbackUsed: false,
        message: '直通移動時間に対して空き時間が不足しているため、直接目的地へ向かうことをおすすめします。',
      });
    }

    // 3. 各スポットの移動時間を並列取得
    const travelMatrix = new Map<
      string,
      { fromOrigin: number; toDest: number; reliability: 'high' | 'medium' | 'low' }
    >();

    await Promise.all(
      allSpots.map(async (spot) => {
        const [fromOrig, toDest] = await Promise.all([
          getTravelTime(normalizedCondition.origin, spot.name, normalizedCondition.transitModes),
          getTravelTime(spot.name, normalizedCondition.destination, normalizedCondition.transitModes),
        ]);

        const combinedReliability: 'high' | 'medium' | 'low' =
          fromOrig.reliability === 'high' && toDest.reliability === 'high'
            ? 'high'
            : fromOrig.reliability === 'low' || toDest.reliability === 'low'
            ? 'low'
            : 'medium';

        travelMatrix.set(spot.spotId, {
          fromOrigin: fromOrig.minutes,
          toDest: toDest.minutes,
          reliability: combinedReliability,
        });
      })
    );

    // 4. 足切りフィルター実行
    const { passed } = evaluateAndFilterSpots(
      allSpots,
      normalizedCondition,
      travelMatrix,
      15 // 安全バッファ15分
    );

    let candidateEvals = passed;

    // 候補が0件の場合、無理に強引な候補表示を行わず空配列を返す
    if (candidateEvals.length === 0) {
      return NextResponse.json({
        recommendations: [],
        searchParams: normalizedCondition,
        availableTotalMinutes,
        totalCandidatesEvaluated: allSpots.length,
        totalPassedFilter: 0,
        fallbackUsed: false,
        message: '指定された時間・移動手段の条件に適合するスポットが見つかりませんでした。',
      });
    }

    const candidateSpots = candidateEvals.map((e) => e.spot);

    // 5. AIによる嗜好一致度 & 推薦理由生成
    const { evaluations: aiEvals, isFallback } = await evaluatePreferenceWithGemini(
      candidateSpots,
      normalizedCondition
    );

    // 6. 各スポットの総合スコア・信頼度を算出
    const scoredSpots: {
      spot: Spot;
      scores: ReturnType<typeof calculateSpotScores>;
      evalData: typeof candidateEvals[0];
    }[] = [];

    for (const evalData of candidateEvals) {
      const aiData = aiEvals.get(evalData.spot.spotId) || {
        spotId: evalData.spot.spotId,
        preferenceScore: 70,
        preferenceConfidence: 80,
        shortReason: `${evalData.spot.shortDescription || evalData.spot.name}。立ち寄りにおすすめのスポットです。`,
        detailReason: `${evalData.spot.description} 隙間時間を有意義に過ごせます。`,
        reason: `${evalData.spot.shortDescription || evalData.spot.name}。立ち寄りにおすすめのスポットです。`,
      };

      const scores = calculateSpotScores(
        evalData,
        directTravel.minutes,
        availableTotalMinutes,
        normalizedCondition.weather,
        aiData.preferenceScore,
        aiData.preferenceConfidence
      );

      scoredSpots.push({
        spot: evalData.spot,
        scores,
        evalData,
      });
    }

    // 7. 総合スコアが高い順にソート
    scoredSpots.sort((a, b) => b.scores.totalScore - a.scores.totalScore);

    // 8. 最大3件を推薦
    const top3 = scoredSpots.slice(0, 3);

    const recommendations: RecommendedSpot[] = top3.map((item, index) => {
      const aiData = aiEvals.get(item.spot.spotId);
      return {
        spot: item.spot,
        rank: index + 1,
        recommendationExpression: item.scores.recommendationExpression,
        totalScore: item.scores.totalScore,
        travelMinutesFromOrigin: item.evalData.travelFromOrigin,
        stayMinutes: item.spot.recommendedStayMinutes,
        travelMinutesToDestination: item.evalData.travelToDestination,
        directTravelMinutes: directTravel.minutes,
        detourCostMinutes: item.scores.detourCostMinutes,
        arrivalTimeAtSpot: item.evalData.arrivalTimeAtSpot,
        departureTimeFromSpot: item.evalData.departureTimeFromSpot,
        mustLeaveSpotTime: item.evalData.mustLeaveSpotTime,
        arrivalTimeAtDestination: item.evalData.arrivalTimeAtDestination,
        arrivalBufferMinutes: item.evalData.arrivalBufferMinutes,
        openMarginMinutes: item.evalData.openMarginMinutes,
        openingStatusText: item.evalData.openingStatusText,
        closingWarning: item.evalData.closingWarning,
        transitStatus: item.evalData.transitStatus,
        shortReason: aiData?.shortReason || `${item.spot.categories.join('や')}好きにおすすめ。${normalizedCondition.destination}への途中で寄りやすい場所です。`,
        detailReason: aiData?.detailReason || `${item.spot.description} ${normalizedCondition.destination}へ無理なく移動できる立地にあり、隙間時間を有意義に過ごせます。`,
        reason: aiData?.shortReason || item.spot.description,
        confidence: item.scores.confidence,
        scores: {
          preferenceScore: item.scores.preferenceScore,
          efficiencyScore: item.scores.efficiencyScore,
          timeFitScore: item.scores.timeFitScore,
          weatherScore: item.scores.weatherScore,
          openMarginScore: item.scores.openMarginScore,
          hiroshimaScore: item.scores.hiroshimaScore,
        },
      };
    });

    const response: RecommendationResponse = {
      recommendations,
      searchParams: normalizedCondition,
      availableTotalMinutes,
      totalCandidatesEvaluated: allSpots.length,
      totalPassedFilter: candidateEvals.length,
      fallbackUsed: isFallback,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in recommendation API:', error);
    return NextResponse.json(
      { error: '推薦処理中にエラーが発生しました。' },
      { status: 500 }
    );
  }
}
