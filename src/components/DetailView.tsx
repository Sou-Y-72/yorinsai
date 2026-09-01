'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Heart,
  Clock,
  Coins,
  Sun,
  MapPin,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Train,
  CalendarCheck,
  Navigation,
} from 'lucide-react';
import { RecommendedSpot, ConditionInput } from '@/types';
import { isFavorite as checkIsFavorite, toggleFavorite } from '@/lib/favorites';

interface DetailViewProps {
  spotItem: RecommendedSpot;
  searchParams: ConditionInput;
  onBack: () => void;
}

export const DetailView: React.FC<DetailViewProps> = ({
  spotItem,
  searchParams,
  onBack,
}) => {
  const { spot } = spotItem;
  const [isFav, setIsFav] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showDataInfo, setShowDataInfo] = useState(false);

  // 画面マウント時に最上部にスクロール
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    setIsFav(checkIsFavorite(spot.spotId));
  }, [spot.spotId]);

  const handleToggleFavorite = () => {
    const isAdded = toggleFavorite(spot);
    setIsFav(isAdded);
    setToastMessage(
      isAdded
        ? `❤️ 「${spot.name}」をお気に入りに保存しました`
        : `「${spot.name}」をお気に入りから解除しました`
    );
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // 天候のテキスト表現
  const getWeatherRecommendationText = () => {
    if (spot.indoorLevel === 'indoor') return '雨でも安心';
    if (spot.weatherSuitability[searchParams.weather] >= 90) return '天候相性◎';
    return '晴れにおすすめ';
  };

  const handleOpenGoogleMaps = () => {
    const originEnc = encodeURIComponent(searchParams.origin);
    const spotEnc = encodeURIComponent(spot.name + ' 広島');
    const destEnc = encodeURIComponent(searchParams.destination);
    const routeUrl = `https://www.google.com/maps/dir/?api=1&origin=${originEnc}&destination=${destEnc}&waypoints=${spotEnc}&travelmode=transit`;
    window.open(spot.googleMapsUrl || routeUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative min-h-screen pb-36 flex flex-col justify-between text-slate-800 bg-gradient-to-b from-sky-50 via-slate-50 to-indigo-50/50">
      {/* トースト通知 */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-4 right-4 z-50 flex justify-center pointer-events-none"
          >
            <div className="bg-slate-900/90 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl backdrop-blur-md border border-white/20">
              {toastMessage}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* スクロール追従上部ヘッダー */}
      <header className="sticky top-0 z-40 px-4 py-2.5 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-white/60 shadow-xs">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white hover:bg-slate-50 flex items-center justify-center text-slate-800 shadow-xs border border-slate-200/80 transition active:scale-95 cursor-pointer shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <span className="text-xs font-bold text-slate-800 truncate px-2 font-['BIZ_UDPMincho',_'BIZ_UDMincho',_'Hiragino_Mincho_ProN',_'Yu_Mincho',_serif]">
          {spot.name}
        </span>

        <button
          type="button"
          onClick={handleToggleFavorite}
          className="w-9 h-9 rounded-full bg-white hover:bg-slate-50 flex items-center justify-center text-slate-800 shadow-xs border border-slate-200/80 transition active:scale-95 cursor-pointer shrink-0"
        >
          <Heart
            className={`w-4 h-4 transition ${
              isFav ? 'text-rose-500 fill-rose-500 scale-110' : 'text-slate-700'
            }`}
          />
        </button>
      </header>

      {/* 1. ヒーロー画像エリア */}
      <div className="relative w-full h-64 overflow-hidden bg-slate-200">
        <img
          src={spot.imageUrl}
          alt={spot.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/20 to-transparent" />

        {/* 画像下部: スポット名 & エリア */}
        <div className="absolute bottom-4 left-5 right-5 text-white">
          <div className="flex items-center gap-1 text-[11px] text-sky-200/90 font-medium mb-1 drop-shadow-sm">
            <MapPin className="w-3.5 h-3.5" />
            <span>{spot.area}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-wide drop-shadow-md font-['BIZ_UDPMincho',_'BIZ_UDMincho',_'Hiragino_Mincho_ProN',_'Yu_Mincho',_serif]">
            {spot.name}
          </h1>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="px-4 pt-4 space-y-3.5 z-10">
        {/* 2 & 3. おすすめ度 ＆ 短い推薦理由 */}
        <div className="liquid-glass-card rounded-3xl p-4 shadow-sm border border-white/80 space-y-2">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200/80 text-rose-600 text-xs font-bold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              <span>{spotItem.recommendationExpression}</span>
            </div>
            {spotItem.closingWarning && (
              <span className="text-[10px] font-bold text-rose-600 bg-rose-100/80 px-2 py-0.5 rounded-full border border-rose-200">
                {spotItem.closingWarning}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-700 font-medium leading-relaxed">
            {spotItem.shortReason || spotItem.reason}
          </p>
        </div>

        {/* 4. 【最優先】次の予定までの余裕度 ＆ スポット出発推奨時刻 カード */}
        <div className="liquid-glass-card rounded-3xl p-4 shadow-md border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white/90 to-blue-50/70 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-indigo-700 block">出発すべき時刻</span>
                <span className="text-base font-extrabold text-indigo-900">
                  {spotItem.mustLeaveSpotTime} までに出発
                </span>
              </div>
            </div>

            {spotItem.arrivalBufferMinutes > 0 && (
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">予定への余裕</span>
                <span className="text-xs font-extrabold text-emerald-600 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                  ✓ {spotItem.arrivalBufferMinutes}分の余裕
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 5. ルート・タイムライン詳細 */}
        <div className="liquid-glass-card rounded-3xl p-4 shadow-sm border border-white/80 space-y-3">
          <h3 className="text-xs font-bold text-slate-850 flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-blue-600" />
            <span>ルート・タイムライン</span>
          </h3>

          <div className="py-1 px-1">
            <div className="flex items-center justify-between text-xs relative">
              {/* 出発地 */}
              <div className="flex flex-col items-center text-center z-10">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-xs">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-slate-400 mt-1">現在地</span>
                <span className="text-[11px] font-bold text-slate-700 max-w-[70px] truncate">{searchParams.origin}</span>
                <span className="text-[10px] text-slate-500">{searchParams.currentTime}</span>
              </div>

              {/* 移動ライン1 */}
              <div className="flex-1 flex flex-col items-center px-1">
                <span className="text-[9px] font-bold text-blue-600 bg-blue-50/90 px-1.5 py-0.5 rounded-full border border-blue-200">
                  {(() => {
                    const modes = searchParams.transitModes || ['transit', 'walk'];
                    const isCarOnly = modes.length === 1 && modes.includes('car');
                    const isWalkOnly = modes.length === 1 && modes.includes('walk');
                    if (isWalkOnly || (spotItem.travelMinutesFromOrigin <= 10 && !isCarOnly)) return '🚶 ';
                    if (isCarOnly) return '🚗 ';
                    return '🚃 ';
                  })()}
                  {spotItem.travelMinutesFromOrigin}分
                </span>
                <div className="w-full h-0.5 bg-blue-200 my-1" />
              </div>

              {/* スポット */}
              <div className="flex flex-col items-center text-center z-10">
                <div className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md animate-pulse">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-extrabold text-rose-600 mt-1 max-w-[80px] truncate">{spot.name}</span>
                <span className="text-[10px] text-slate-600 font-bold">滞在 {spot.recommendedStayMinutes}分</span>
                <span className="text-[9px] text-indigo-700 font-bold bg-indigo-50 px-1 rounded-sm mt-0.5">
                  {spotItem.departureTimeFromSpot} 出発
                </span>
              </div>

              {/* 移動ライン2 */}
              <div className="flex-1 flex flex-col items-center px-1">
                <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50/90 px-1.5 py-0.5 rounded-full border border-indigo-200">
                  {(() => {
                    const modes = searchParams.transitModes || ['transit', 'walk'];
                    const isCarOnly = modes.length === 1 && modes.includes('car');
                    const isWalkOnly = modes.length === 1 && modes.includes('walk');
                    if (isWalkOnly || (spotItem.travelMinutesToDestination <= 10 && !isCarOnly)) return '🚶 ';
                    if (isCarOnly) return '🚗 ';
                    return '🚃 ';
                  })()}
                  {spotItem.travelMinutesToDestination}分
                </span>
                <div className="w-full h-0.5 bg-indigo-200 my-1" />
              </div>

              {/* 目的地 */}
              <div className="flex flex-col items-center text-center z-10">
                <div className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center shadow-xs">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-slate-400 mt-1">目的地</span>
                <span className="text-[11px] font-bold text-slate-700 max-w-[70px] truncate">{searchParams.destination}</span>
                <span className="text-[10px] text-blue-700 font-bold">{spotItem.arrivalTimeAtDestination}着</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>{searchParams.destination} 到着予定</span>
            <div className="text-right">
              <span className="text-sm font-extrabold text-blue-600">{spotItem.arrivalTimeAtDestination}</span>
              <span className="text-[10px] text-slate-400 font-normal ml-1">（希望 {searchParams.targetArrivalTime}）</span>
            </div>
          </div>
        </div>

        {/* 6. 利用交通機関・運行可否情報 */}
        <div className="liquid-glass-card rounded-2xl p-3.5 shadow-sm border border-white/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-100/80 text-blue-600 flex items-center justify-center">
              <Train className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">交通機関の運行状況</span>
              <span className="text-xs font-bold text-slate-800">
                {spotItem.transitStatus.lineName}
              </span>
            </div>
          </div>
          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
              spotItem.transitStatus.isWarning
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {spotItem.transitStatus.badgeText}
          </span>
        </div>

        {/* 7. 施設情報 (自然な営業時間・費用目安・天候相性) */}
        <div className="space-y-2.5">
          {/* 営業時間（フル幅1行でスッキリ表示） */}
          <div className="liquid-glass-card rounded-2xl p-3.5 border border-white/80 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
              <CalendarCheck className="w-4 h-4 text-blue-500 shrink-0" />
              <span>営業時間</span>
            </div>
            <p className="text-xs font-bold text-slate-800 text-right">
              {spotItem.openingStatusText}
            </p>
          </div>

          {/* 費用目安 ＆ 天候との相性（2等分均等配置で中途半端な長さを解消） */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* 費用目安 */}
            <div className="liquid-glass-card rounded-2xl p-3 border border-white/80 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span>費用目安</span>
              </div>
              <p className="text-xs font-bold text-slate-800">
                {spot.priceText || '無料'}
              </p>
            </div>

            {/* 天候との相性 */}
            <div className="liquid-glass-card rounded-2xl p-3 border border-white/80 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>天候との相性</span>
              </div>
              <p className="text-xs font-bold text-slate-800">
                {getWeatherRecommendationText()}
              </p>
            </div>
          </div>
        </div>

        {/* 8. このスポットについて (詳細説明) */}
        <div className="liquid-glass-card rounded-3xl p-4 shadow-sm border border-white/80 space-y-2.5">
          <h3 className="text-xs font-bold text-slate-850">このスポットについて</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {spotItem.detailReason}
          </p>
          {spot.description && (
            <p className="text-[11px] text-slate-500 leading-relaxed pt-1 border-t border-slate-100">
              {spot.description}
            </p>
          )}
          {/* 特徴タグ */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {spot.features.map((f, idx) => (
              <span
                key={idx}
                className="text-[10px] text-slate-600 bg-white/70 px-2 py-0.5 rounded-full border border-slate-200/60"
              >
                #{f}
              </span>
            ))}
          </div>
        </div>

        {/* 9. 🛡️ 情報について (折りたたみアコーディオン) */}
        <div className="liquid-glass-card rounded-2xl border border-white/80 overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setShowDataInfo(!showDataInfo)}
            className="w-full p-3.5 flex items-center justify-between text-left text-xs font-bold text-slate-700 hover:bg-white/40 transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-600" />
              <span>情報について</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                showDataInfo ? 'rotate-180' : ''
              }`}
            />
          </button>

          <AnimatePresence>
            {showDataInfo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 pb-3.5 space-y-2 text-[11px] text-slate-600 border-t border-slate-100/80 pt-2.5"
              >
                <div className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <div>
                    <span className="font-bold text-slate-750">移動時間</span>
                    <p className="text-[10px] text-slate-500">主要交通ダイヤ・路線スケジュールに基づく確定移動時間</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <div>
                    <span className="font-bold text-slate-750">営業時間</span>
                    <p className="text-[10px] text-slate-500">最新の施設公式データ・確認済み情報を使用</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <div>
                    <span className="font-bold text-slate-750">推薦理由</span>
                    <p className="text-[10px] text-slate-500">旅行者の興味タグ・こだわりをもとにAIが生成</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <div>
                    <span className="font-bold text-slate-750">スポット情報</span>
                    <p className="text-[10px] text-slate-500">広島観光公式データおよび現地調査情報を確認済み</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 10. 固定下部アクションバー (Google Mapsで開く：常時表示) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none pb-4 pt-3 px-4 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent">
        <div className="max-w-md w-full pointer-events-auto">
          <button
            type="button"
            onClick={handleOpenGoogleMaps}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 px-6 rounded-full flex items-center justify-center gap-2 text-sm shadow-[0_6px_25px_rgba(37,99,235,0.4)] active:scale-[0.98] transition cursor-pointer"
          >
            <span>Google Mapsで開く</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
