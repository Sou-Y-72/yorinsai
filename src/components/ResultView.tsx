'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  SlidersHorizontal,
  Car,
  Train,
  Footprints,
  Clock,
  Flag,
  Sparkles,
  Star,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { RecommendedSpot, ConditionInput, RecommendationLevel } from '@/types';

interface ResultViewProps {
  recommendations: RecommendedSpot[];
  searchParams: ConditionInput;
  onSelectSpot: (spot: RecommendedSpot) => void;
  onBack: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({
  recommendations,
  searchParams,
  onSelectSpot,
  onBack,
}) => {
  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-900 font-extrabold text-xs flex items-center justify-center shadow-md border border-white">
          1
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-slate-300 to-slate-100 text-slate-800 font-extrabold text-xs flex items-center justify-center shadow-md border border-white">
          2
        </div>
      );
    }
    return (
      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-700/60 to-amber-600/40 text-white font-extrabold text-xs flex items-center justify-center shadow-md border border-white">
        3
      </div>
    );
  };

  const getExpressionBadge = (expression: RecommendationLevel, rank: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50/90 border border-rose-200/80 px-2 py-0.5 rounded-full shadow-xs">
          <Sparkles className="w-3 h-3 text-rose-500" />
          <span>かなりおすすめ</span>
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50/90 border border-blue-200/80 px-2 py-0.5 rounded-full shadow-xs">
          <Star className="w-3 h-3 text-blue-500" />
          <span>おすすめ</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100/90 border border-slate-200/80 px-2 py-0.5 rounded-full shadow-xs">
        <CheckCircle2 className="w-3 h-3 text-slate-500" />
        <span>条件に合っています</span>
      </span>
    );
  };

  return (
    <div className="relative min-h-screen pb-12 flex flex-col justify-between text-slate-800 bg-gradient-to-b from-sky-50 via-slate-50 to-indigo-50/40">
      {/* 上部ヘッダー */}
      <header className="px-5 pt-7 pb-3 flex items-center justify-between z-20 border-b border-white/60 bg-white/40 backdrop-blur-md sticky top-0">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-slate-700 shadow-sm border border-white active:scale-95 transition cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h1 className="text-base font-bold text-slate-850 tracking-wide font-['BIZ_UDPMincho',_'BIZ_UDMincho',_'Hiragino_Mincho_ProN',_'Yu_Mincho',_serif]">
          おすすめスポット
        </h1>

        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-slate-700 shadow-sm border border-white active:scale-95 transition cursor-pointer"
          title="条件を変更"
        >
          <SlidersHorizontal className="w-4 h-4 text-slate-600" />
        </button>
      </header>

      {/* スポットカード一覧 / 0件時案内 */}
      <div className="px-4 pt-4 space-y-3.5 z-10">
        {recommendations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="liquid-glass-card rounded-3xl p-6 shadow-md border border-white/90 text-center space-y-3.5 my-8"
          >
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-850">
              寄り道できるスポットが見つかりませんでした
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
              指定された時間・移動手段では次の目的地（{searchParams.destination}）への到着が優先されるため、直接目的地へ向かうことをおすすめします。
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onBack}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white font-bold text-xs py-2.5 px-6 rounded-full shadow-md active:scale-95 transition cursor-pointer"
              >
                条件を変更して探す
              </button>
            </div>
          </motion.div>
        ) : (
          recommendations.map((rec, index) => (
          <motion.div
            key={rec.spot.spotId}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.1 }}
            onClick={() => onSelectSpot(rec)}
            className="liquid-glass-card rounded-3xl p-4 shadow-md hover:shadow-lg border border-white/90 active:scale-[0.99] transition cursor-pointer relative overflow-hidden"
          >
            {/* 上段: 画像 + タイトル + おすすめ度 + メトリクス */}
            <div className="flex gap-3.5">
              {/* 画像サムネイル & 順位メダル */}
              <div className="relative w-22 h-22 shrink-0 rounded-2xl overflow-hidden shadow-xs border border-white/60 bg-slate-100">
                <img
                  src={rec.spot.imageUrl}
                  alt={rec.spot.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-1.5 left-1.5">
                  {getRankBadge(rec.rank)}
                </div>
              </div>

              {/* 右側情報 */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-850 truncate leading-snug">
                    {rec.spot.name}
                  </h2>
                  <div className="mt-1">
                    {getExpressionBadge(rec.recommendationExpression, rec.rank)}
                  </div>
                </div>

                {/* メトリクス (移動・滞在・出発時刻) */}
                <div className="text-[11px] text-slate-600 font-medium space-y-1 pt-1.5">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      {(() => {
                        const modes = searchParams.transitModes || ['transit', 'walk'];
                        const isCarOnly = modes.length === 1 && modes.includes('car');
                        const isWalkOnly = modes.length === 1 && modes.includes('walk');
                        const isShortDistance = rec.travelMinutesFromOrigin <= 10;

                        if (isWalkOnly || (isShortDistance && !isCarOnly)) {
                          return <Footprints className="w-3.5 h-3.5 text-slate-400" />;
                        }
                        if (isCarOnly) {
                          return <Car className="w-3.5 h-3.5 text-slate-400" />;
                        }
                        return <Train className="w-3.5 h-3.5 text-slate-400" />;
                      })()}
                      <span>移動</span>
                      <span className="font-bold text-slate-700">{rec.travelMinutesFromOrigin}分</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>滞在</span>
                      <span className="font-bold text-slate-700">{rec.stayMinutes}分</span>
                    </div>
                  </div>

                  {/* 出発推奨時刻 & 到着予定 */}
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded-md">
                      {rec.mustLeaveSpotTime}までに出発
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-500 text-[10px] pt-0.5">
                    <div className="flex items-center gap-1">
                      <Flag className="w-3 h-3 text-slate-400" />
                      <span>{searchParams.destination} {rec.arrivalTimeAtDestination}着</span>
                    </div>
                    {rec.arrivalBufferMinutes > 0 && (
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded-md">
                        ✓ 余裕 {rec.arrivalBufferMinutes}分
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 交通機関運行ステータス / 閉館警告 */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px]">
              <span
                className={`px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 ${
                  rec.transitStatus.isWarning
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-blue-50/80 text-blue-700 border border-blue-200/60'
                }`}
              >
                {rec.transitStatus.isWarning && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                {rec.transitStatus.badgeText}
              </span>

              {rec.closingWarning && (
                <span className="px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1">
                  {rec.closingWarning}
                </span>
              )}
            </div>

            {/* 下段: AI推薦理由 (40〜60文字・最大2行) */}
            <div className="mt-2.5 pt-2 border-t border-slate-100/80 flex items-center justify-between gap-2">
              <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                {rec.shortReason || rec.reason}
              </p>
              <div className="shrink-0 text-slate-400">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </motion.div>
        )))}
      </div>

      {/* フッター注記 */}
      <div className="px-6 pt-4 pb-2 text-center text-[10px] text-slate-400">
        ※到着予定時刻は交通状況により前後する場合があります。
      </div>
    </div>
  );
};
