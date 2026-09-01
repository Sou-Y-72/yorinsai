'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { InputView } from '@/components/InputView';
import { ResultView } from '@/components/ResultView';
import { DetailView } from '@/components/DetailView';
import { ConditionInput, RecommendedSpot, RecommendationResponse, Spot } from '@/types';

type ScreenState = 'input' | 'result' | 'detail';

export default function Home() {
  const [screen, setScreen] = useState<ScreenState>('input');
  const [previousScreen, setPreviousScreen] = useState<'input' | 'result'>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<ConditionInput>({
    origin: '宮島口',
    destination: '広島駅',
    currentTime: '15:00',
    targetArrivalTime: '18:30',
    interests: ['グルメ', '歴史'],
    freeText: '静かな場所がいい',
    weather: 'sunny',
    transitModes: ['transit', 'walk'],
  });
  const [recommendations, setRecommendations] = useState<RecommendedSpot[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<RecommendedSpot | null>(null);

  // 画面遷移時に一番上のヘッダーが見えるよう最上部にスクロール
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [screen]);

  const handleSearch = async (condition: ConditionInput) => {
    setIsLoading(true);
    setSearchParams(condition);

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(condition),
      });

      if (!res.ok) {
        throw new Error('推薦の取得に失敗しました');
      }

      const data: RecommendationResponse = await res.json();
      setRecommendations(data.recommendations);
      setScreen('result');
      setPreviousScreen('input');
    } catch (error) {
      console.error('Search error:', error);
      alert('推薦スポットの取得に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSpot = (spot: RecommendedSpot) => {
    setSelectedSpot(spot);
    setPreviousScreen('result');
    setScreen('detail');
  };

  const handleSelectFavoriteSpot = (spot: Spot) => {
    // お気に入り一覧から開く場合のダミーRecommendedSpot構築
    const recSpot: RecommendedSpot = {
      spot,
      rank: 1,
      recommendationExpression: 'かなりおすすめ',
      totalScore: 90,
      travelMinutesFromOrigin: 20,
      stayMinutes: spot.recommendedStayMinutes,
      travelMinutesToDestination: 20,
      directTravelMinutes: 25,
      detourCostMinutes: 15,
      arrivalTimeAtSpot: '15:20',
      departureTimeFromSpot: '16:20',
      mustLeaveSpotTime: '17:55',
      arrivalTimeAtDestination: '16:40',
      arrivalBufferMinutes: 20,
      openMarginMinutes: 60,
      openingStatusText: spot.openingLabel || `${spot.openTime}〜${spot.closeTime}`,
      transitStatus: {
        lineName: '公共交通 / 車',
        status: 'operating',
        badgeText: '公共交通 利用可能',
        isWarning: false,
      },
      shortReason: `${spot.shortDescription || spot.name}。お気に入りに登録されているおすすめスポットです。`,
      detailReason: `${spot.description} お気に入りに登録されている魅力的なスポットです。`,
      reason: `${spot.description} お気に入りに登録されているおすすめスポットです。`,
      confidence: {
        score: 95,
        level: '高',
        badgeText: '情報信頼度: 高 (95%)',
        breakdown: {
          dataCompleteness: { score: 100, label: '施設・営業データ', description: '確認済み', verified: true },
          travelReliability: { score: 95, label: '移動経路データ', description: '標準移動時間', verified: true },
          preferenceConfidence: { score: 95, label: 'ご希望との照合度', description: 'お気に入り登録済み', verified: true },
          timeStability: { score: 90, label: 'スケジュール余裕度', description: 'ゆとりあり', verified: true },
        },
      },
      scores: {
        preferenceScore: 95,
        efficiencyScore: 85,
        timeFitScore: 90,
        weatherScore: 90,
        openMarginScore: 80,
        hiroshimaScore: spot.hiroshimaScore,
      },
    };
    setSelectedSpot(recSpot);
    setPreviousScreen('input');
    setScreen('detail');
  };

  const handleBackToInput = () => {
    setScreen('input');
  };

  const handleBack = () => {
    setScreen(previousScreen);
  };

  return (
    <div className="w-full min-h-screen relative">
      {/* ローディングオーバーレイ */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/30 backdrop-blur-md px-6 text-center"
          >
            <div className="liquid-glass rounded-3xl p-6 shadow-2xl border border-white max-w-xs w-full flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-500 to-sky-400 flex items-center justify-center text-white shadow-lg animate-bounce">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mt-4">
                寄り道スポットを計算中
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                移動時間・営業時間・好みの相性をAIが総合判定しています...
              </p>
              <div className="w-full bg-blue-100 rounded-full h-1.5 mt-4 overflow-hidden">
                <div className="bg-blue-500 h-full w-2/3 animate-pulse rounded-full" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 画面切り替え（transformを使わずopacityのみで切り替え、fixed/stickyのviewport基準を死守） */}
      <AnimatePresence mode="wait">
        {screen === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <InputView
              initialValues={searchParams}
              onSearch={handleSearch}
              onSelectFavoriteSpot={handleSelectFavoriteSpot}
              isLoading={isLoading}
            />
          </motion.div>
        )}

        {screen === 'result' && (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ResultView
              recommendations={recommendations}
              searchParams={searchParams}
              onSelectSpot={handleSelectSpot}
              onBack={handleBackToInput}
            />
          </motion.div>
        )}

        {screen === 'detail' && selectedSpot && (
          <motion.div
            key="detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <DetailView
              spotItem={selectedSpot}
              searchParams={searchParams}
              onBack={handleBack}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
