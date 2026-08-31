import { Spot, ConditionInput } from '@/types';
import { GoogleGenAI, Type, Schema } from '@google/genai';

export interface AIPerSpotEvaluation {
  spotId: string;
  preferenceScore: number;
  preferenceConfidence: number;
  shortReason: string;
  detailReason: string;
  reason: string;
}

/**
 * ルールベースによるフォールバック嗜好評価 & 推薦理由生成
 * Gemini APIが利用できない場合やエラー時でも瞬時に高精度な結果を生成
 */
export function evaluatePreferenceFallback(
  spots: Spot[],
  condition: ConditionInput
): Map<string, AIPerSpotEvaluation> {
  const result = new Map<string, AIPerSpotEvaluation>();
  const userInterests = condition.interests || [];
  const freeText = (condition.freeText || '').toLowerCase();

  for (const spot of spots) {
    let matchPoints = 0;
    const maxPossiblePoints = Math.max(1, userInterests.length) * 25;

    // 1. タグ一致判定
    for (const interest of userInterests) {
      if (spot.categories.includes(interest)) {
        matchPoints += 25;
      } else if (
        spot.features.some((f) => f.includes(interest) || interest.includes(f))
      ) {
        matchPoints += 15;
      }
    }

    // 2. 自由記述キーワードのボーナス・否定マッチ（サニタイズ処理付き）
    let cleanFreeText = (condition.freeText || '')
      .replace(/<[^>]*>/g, '') // HTMLタグ除去
      .replace(/「.*?指示を無視.*?」/g, '') // インジェクション除去
      .trim();

    let textBonus = 0;
    if (cleanFreeText) {
      // 否定表現の検知
      const isNegatingFood = cleanFreeText.includes('食べ物はいらない') || cleanFreeText.includes('お腹いっぱい') || cleanFreeText.includes('グルメは不要');
      const isNegatingHistory = cleanFreeText.includes('歴史には興味') || cleanFreeText.includes('歴史は不要');
      const isNegatingWalking = cleanFreeText.includes('歩きたくない') || cleanFreeText.includes('あまり歩か') || cleanFreeText.includes('1歩も歩きたくない');

      if (isNegatingFood && spot.categories.includes('グルメ')) {
        textBonus -= 35;
      }
      if (isNegatingHistory && spot.categories.includes('歴史')) {
        textBonus -= 35;
      }
      if (isNegatingWalking) {
        if (spot.recommendedStayMinutes <= 45 || spot.features.includes('駅近') || spot.features.includes('駅直結')) {
          textBonus += 25;
        } else {
          textBonus -= 20;
        }
      }

      if (
        (cleanFreeText.includes('静か') || cleanFreeText.includes('落ち着')) &&
        spot.features.some((f) => f.includes('静か') || f.includes('落ち着') || f.includes('庭園'))
      ) {
        textBonus += 20;
      }
      if (
        !isNegatingFood &&
        (cleanFreeText.includes('美味しい') || cleanFreeText.includes('食べ') || cleanFreeText.includes('名物')) &&
        spot.categories.includes('グルメ')
      ) {
        textBonus += 20;
      }
      if (
        (cleanFreeText.includes('写真') || cleanFreeText.includes('映え') || cleanFreeText.includes('絶景')) &&
        (spot.categories.includes('景色') || spot.categories.includes('写真'))
      ) {
        textBonus += 20;
      }
      if (
        (cleanFreeText.includes('雨') || cleanFreeText.includes('濡れ')) &&
        spot.indoorLevel === 'indoor'
      ) {
        textBonus += 25;
      }
    }

    // スコア計算 (0-100)
    let preferenceScore = 60 + Math.round((matchPoints / maxPossiblePoints) * 30) + textBonus;
    preferenceScore = Math.min(100, Math.max(30, preferenceScore));

    // 確信度
    let preferenceConfidence = 80;
    if (userInterests.length >= 2 && cleanFreeText.length >= 4) {
      preferenceConfidence = 92;
    } else if (userInterests.length >= 1) {
      preferenceConfidence = 85;
    }

    // shortReason（40〜60文字・2行以内）と detailReason（100〜150文字）の生成
    const matchedCategories = spot.categories.filter((c) =>
      userInterests.includes(c)
    );

    let shortReason = '';
    let detailReason = '';

    if (matchedCategories.length > 0) {
      shortReason = `${matchedCategories.join('や')}好きにおすすめ。${condition.destination}への途中で寄りやすい場所です。`;
      detailReason = `${spot.name}は${matchedCategories.join('や')}の魅力が存分に味わえる人気スポット。次の予定の${condition.destination}へ無理なく移動できる立地にあり、旅の充実度を高める寄り道に最適です。`;
    } else if (freeText && textBonus > 0) {
      shortReason = `ご希望の「${condition.freeText}」に沿った体験ができ、心地よく寄り道できます。`;
      detailReason = `旅行者のこだわりである「${condition.freeText}」にマッチした環境が整っています。移動の合間に無理なく立ち寄れ、リフレッシュできるおすすめスポットです。`;
    } else {
      shortReason = `${spot.shortDescription || spot.name}。移動の合間に気軽に立ち寄れます。`;
      detailReason = `${spot.description} ${condition.destination}への到着時間にも余裕があり、隙間時間で広島の魅力をしっかり体感できます。`;
    }

    result.set(spot.spotId, {
      spotId: spot.spotId,
      preferenceScore,
      preferenceConfidence,
      shortReason,
      detailReason,
      reason: shortReason,
    });
  }

  return result;
}

/**
 * Gemini 2.5 Flash を使って候補スポットの嗜好マッチングと推薦理由を一括生成
 */
export async function evaluatePreferenceWithGemini(
  spots: Spot[],
  condition: ConditionInput
): Promise<{ evaluations: Map<string, AIPerSpotEvaluation>; isFallback: boolean }> {
  const apiKey = process.env.GEMINI_API_KEY;

  // APIキーがない場合は即座に高品質フォールバック
  if (!apiKey) {
    return {
      evaluations: evaluatePreferenceFallback(spots, condition),
      isFallback: true,
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // スポット一覧のサマリー作成
    const spotsContext = spots.map((s) => ({
      spotId: s.spotId,
      name: s.name,
      area: s.area,
      categories: s.categories,
      features: s.features,
      shortDescription: s.shortDescription,
      description: s.description,
      indoorLevel: s.indoorLevel,
    }));

    const prompt = `あなたは広島観光AIコンシェルジュ「寄りんさい」です。
旅行者の希望条件と候補スポット一覧をもとに、各スポットがどれくらい旅行者の好みに合っているか（preferenceScore: 0〜100）、確信度（preferenceConfidence: 0〜100）、そして2種類の推薦理由（shortReasonとdetailReason）を生成してください。

【旅行者の条件】
- 興味タグ: ${condition.interests.join(', ') || '特になし'}
- 自由なこだわり: ${condition.freeText || '特になし'}
- 現在の天候: ${condition.weather === 'sunny' ? '晴れ' : condition.weather === 'rain' ? '雨' : '曇り'}
- 出発地: ${condition.origin} → 次の目的地: ${condition.destination}

【候補スポット一覧】
${JSON.stringify(spotsContext, null, 2)}

【推薦文の制約ルール】
1. shortReason: 日本語40〜60文字以内（最大2行）。「ユーザーの好み」と「今回この場所を推薦する理由」の2点だけを簡潔に説明してください。
   例: 「歴史好きにおすすめ。広島駅へ向かう途中でも立ち寄りやすいスポットです。」
2. detailReason: 日本語100〜150文字程度。スポットの魅力と今回の行程にぴったりな理由を具体的にわかりやすく説明してください。
`;

    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        evaluations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              spotId: { type: Type.STRING },
              preferenceScore: { type: Type.INTEGER },
              preferenceConfidence: { type: Type.INTEGER },
              shortReason: { type: Type.STRING },
              detailReason: { type: Type.STRING },
            },
            required: ['spotId', 'preferenceScore', 'preferenceConfidence', 'shortReason', 'detailReason'],
          },
        },
      },
      required: ['evaluations'],
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.3,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Empty response from Gemini');
    }

    const parsed = JSON.parse(responseText) as {
      evaluations: AIPerSpotEvaluation[];
    };

    const evalMap = new Map<string, AIPerSpotEvaluation>();
    for (const item of parsed.evaluations) {
      evalMap.set(item.spotId, {
        spotId: item.spotId,
        preferenceScore: item.preferenceScore,
        preferenceConfidence: item.preferenceConfidence,
        shortReason: item.shortReason,
        detailReason: item.detailReason,
        reason: item.shortReason,
      });
    }

    return {
      evaluations: evalMap,
      isFallback: false,
    };
  } catch (error) {
    console.error('Gemini preference evaluation failed, falling back to rule-based:', error);
    return {
      evaluations: evaluatePreferenceFallback(spots, condition),
      isFallback: true,
    };
  }
}
