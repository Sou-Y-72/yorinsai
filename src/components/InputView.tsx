'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Flag,
  Clock,
  Sparkles,
  Utensils,
  Coffee,
  Landmark,
  Mountain,
  Camera,
  ShoppingBag,
  Palette,
  Trees,
  Compass,
  Sun,
  Cloud,
  CloudRain,
  Pencil,
  ChevronRight,
  SlidersHorizontal,
  X,
  Heart,
  Train,
  Car,
  Footprints,
  LocateFixed,
  Loader2,
} from 'lucide-react';
import { ConditionInput, WeatherType, TransitMode, DemoPreset, Spot } from '@/types';
import presetsData from '@/data/presets.json';
import { getFavorites } from '@/lib/favorites';
import { FavoritesModal } from './FavoritesModal';

const presets = presetsData as DemoPreset[];

const INTEREST_TAGS = [
  { id: 'グルメ', label: 'グルメ', icon: Utensils },
  { id: 'カフェ', label: 'カフェ', icon: Coffee },
  { id: '歴史', label: '歴史', icon: Landmark },
  { id: '景色', label: '景色', icon: Mountain },
  { id: '写真', label: '写真', icon: Camera },
  { id: '買い物', label: '買い物', icon: ShoppingBag },
  { id: '文化', label: '文化', icon: Palette },
  { id: '自然', label: '自然', icon: Trees },
  { id: '体験', label: '体験', icon: Compass },
];

const TRANSIT_OPTIONS: { id: TransitMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'transit', label: '公共交通', icon: Train },
  { id: 'car', label: '車・タクシー', icon: Car },
  { id: 'walk', label: '徒歩', icon: Footprints },
];

const POPULAR_LOCATIONS = [
  '宮島口',
  '広島駅',
  '原爆ドーム',
  '平和記念公園',
  '八丁堀',
  '紙屋町',
  '横川駅',
  '西広島駅',
  '広島バスセンター',
  '宇品港',
  '西条駅',
  '呉駅',
  '尾道駅',
  '三原駅',
  '竹原駅',
];

interface InputViewProps {
  onSearch: (condition: ConditionInput) => void;
  onSelectFavoriteSpot?: (spot: Spot) => void;
  isLoading: boolean;
}

export const InputView: React.FC<InputViewProps> = ({ onSearch, onSelectFavoriteSpot, isLoading }) => {
  const [origin, setOrigin] = useState('宮島口');
  const [destination, setDestination] = useState('広島駅');
  const [currentTime, setCurrentTime] = useState('15:00');
  const [targetArrivalTime, setTargetArrivalTime] = useState('18:30');
  const [interests, setInterests] = useState<string[]>(['グルメ', '歴史']);
  const [transitModes, setTransitModes] = useState<TransitMode[]>(['transit', 'walk']);
  const [weather, setWeather] = useState<WeatherType>('sunny');
  const [freeText, setFreeText] = useState('');

  // GPS取得状態
  const [isLocating, setIsLocating] = useState(false);
  const [gpsAcquiredLocation, setGpsAcquiredLocation] = useState<string | null>(null);

  // お気に入り状態
  const [showFavorites, setShowFavorites] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);

  // モーダル選択状態
  const [selectingLocationType, setSelectingLocationType] = useState<'origin' | 'destination' | 'time' | null>(null);
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => {
    setFavoriteCount(getFavorites().length);
    const handleFavUpdate = () => {
      setFavoriteCount(getFavorites().length);
    };
    window.addEventListener('yorinsai_favorites_updated', handleFavUpdate);
    return () => {
      window.removeEventListener('yorinsai_favorites_updated', handleFavUpdate);
    };
  }, []);

  // 1. デバイスの現在時刻 & 到着希望時刻（現在時刻 + 2.5時間）の初期化
  useEffect(() => {
    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMins = String(now.getMinutes()).padStart(2, '0');
    setCurrentTime(`${currentHours}:${currentMins}`);

    // 約2時間半後を目標到着時刻のデフォルトにする（15分単位に丸め）
    const targetTotalMinutes = now.getHours() * 60 + now.getMinutes() + 150;
    const normTargetMinutes = targetTotalMinutes % 1440;
    const targetHours = String(Math.floor(normTargetMinutes / 60)).padStart(2, '0');
    const roundedMins = Math.round((normTargetMinutes % 60) / 15) * 15;
    const targetMins = String(roundedMins >= 60 ? 45 : roundedMins).padStart(2, '0');
    setTargetArrivalTime(`${targetHours}:${targetMins}`);
  }, []);

  // 2. ブラウザの現在地（GPS）を取得し、最寄りのポイントを自動設定
  useEffect(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch('/api/nearest-location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ latitude, longitude }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.nearestLocation) {
                setOrigin(data.nearestLocation);
                setGpsAcquiredLocation(data.nearestLocation);
              }
            }
          } catch (e) {
            console.log('Failed to fetch nearest location from coordinates:', e);
          } finally {
            setIsLocating(false);
          }
        },
        (error) => {
          console.log('GPS location unavailable or denied, using default:', error);
          setIsLocating(false);
        },
        { timeout: 8000, enableHighAccuracy: false }
      );
    }
  }, []);

  const toggleInterest = (id: string) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleTransitMode = (mode: TransitMode) => {
    setTransitModes((prev) => {
      if (prev.includes(mode)) {
        if (prev.length === 1) return prev; // 最低1つは選択
        return prev.filter((m) => m !== mode);
      }
      return [...prev, mode];
    });
  };

  const handleApplyPreset = (preset: DemoPreset) => {
    setOrigin(preset.data.origin);
    setDestination(preset.data.destination);
    setCurrentTime(preset.data.currentTime);
    setTargetArrivalTime(preset.data.targetArrivalTime);
    setInterests(preset.data.interests);
    setWeather(preset.data.weather);
    setFreeText(preset.data.freeText || '');
    if (preset.data.transitModes && preset.data.transitModes.length > 0) {
      setTransitModes(preset.data.transitModes);
    }
    setGpsAcquiredLocation(null);
    setShowPresets(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin.trim()) {
      alert('今いる場所を選択または入力してください。');
      return;
    }
    if (!destination.trim()) {
      alert('次の目的地を選択または入力してください。');
      return;
    }
    if (!currentTime.trim() || !targetArrivalTime.trim()) {
      alert('現在時刻と到着希望時刻を正しく設定してください。');
      return;
    }
    if (!transitModes || transitModes.length === 0) {
      alert('移動手段を1つ以上選択してください。（公共交通・車・徒歩）');
      return;
    }

    onSearch({
      origin: origin.trim(),
      destination: destination.trim(),
      currentTime: currentTime.trim(),
      targetArrivalTime: targetArrivalTime.trim(),
      interests,
      transitModes,
      weather,
      freeText,
    });
  };

  // 画面マウント時に最上部にスクロール
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="relative min-h-screen pb-10 flex flex-col justify-between text-slate-800">
      {/* 瀬戸内・宮島背景ビジュアル & グラデーション */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* 背景画像 */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-90 scale-105"
          style={{
            backgroundImage: 'url("/images/spots/itsukushima_torii_setouchi.webp")',
          }}
        />
        {/* ガラスオーバーレイグラデーション */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-300/40 via-sky-100/60 to-white/95 backdrop-blur-[2px]" />
        
        {/* 光彩パーティクル */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-72 h-72 bg-sky-200/50 rounded-full blur-3xl" />
        <div className="absolute top-80 right-0 w-60 h-60 bg-blue-300/30 rounded-full blur-3xl" />
      </div>

      {/* スクロール追従上部ヘッダー（左上: デモシナリオ / 右上: お気に入り） */}
      <header className="sticky top-0 z-30 px-5 py-3 flex justify-between items-center bg-white/45 backdrop-blur-md border-b border-white/50 shadow-xs">
        {/* 左上: デモシナリオ */}
        <button
          type="button"
          onClick={() => setShowPresets(true)}
          className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-white/80 hover:bg-white px-3 py-1.5 rounded-full shadow-xs backdrop-blur-md border border-white/80 transition active:scale-95 cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>デモシナリオ</span>
        </button>

        {/* 右上: お気に入り */}
        <button
          type="button"
          onClick={() => setShowFavorites(true)}
          className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-white/85 hover:bg-white px-3 py-1.5 rounded-full shadow-xs backdrop-blur-md border border-white/80 transition active:scale-95 cursor-pointer"
        >
          <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
          <span>お気に入り</span>
          {favoriteCount > 0 && (
            <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {favoriteCount}
            </span>
          )}
        </button>
      </header>

      {/* コンテンツエリア */}
      <div className="px-5 pt-3 z-10">
        {/* ヒーロータイトル & キャッチコピー */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center pt-2 pb-5"
        >
          <h1 className="text-4xl font-bold tracking-wider text-white drop-shadow-[0_2px_8px_rgba(15,23,42,0.35)] font-['BIZ_UDPMincho',_'BIZ_UDMincho',_'Hiragino_Mincho_ProN',_'Yu_Mincho',_serif]">
            寄りんさい
          </h1>
          <p className="text-sm font-bold text-blue-900/90 mt-1 tracking-wide drop-shadow-xs">
            寄り道ひとつ、思い出ひとつ。
          </p>
          <p className="text-xs text-slate-700/90 mt-1.5 leading-relaxed font-medium">
            次の予定までに寄れる、<br />
            あなた向けの広島スポットを提案します。
          </p>
        </motion.div>

        {/* 入力フォーム */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* メイン条件カード (現在地・目的地・時刻) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="liquid-glass rounded-3xl p-3.5 shadow-lg border border-white/70 space-y-2.5"
          >
            {/* 今いる場所 */}
            <button
              type="button"
              onClick={() => setSelectingLocationType('origin')}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/50 hover:bg-white/75 active:scale-[0.99] transition border border-white/80 text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center text-blue-600">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-500 block">今いる場所</span>
                  {gpsAcquiredLocation === origin && (
                    <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5">
                      <LocateFixed className="w-2.5 h-2.5" /> 現在地付近
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {isLocating ? (
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                    <span>測位中...</span>
                  </div>
                ) : (
                  <span className="text-sm font-bold text-slate-800">{origin}</span>
                )}
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>

            {/* 次の目的地 */}
            <button
              type="button"
              onClick={() => setSelectingLocationType('destination')}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/50 hover:bg-white/75 active:scale-[0.99] transition border border-white/80 text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-sky-500/15 flex items-center justify-center text-sky-600">
                  <Flag className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-slate-500">次の目的地</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-800">{destination}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>

            {/* 到着希望時刻 */}
            <button
              type="button"
              onClick={() => setSelectingLocationType('time')}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/50 hover:bg-white/75 active:scale-[0.99] transition border border-white/80 text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/15 flex items-center justify-center text-indigo-600">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-slate-500">到着希望時刻</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-800">{targetArrivalTime}</span>
                <span className="text-[11px] text-slate-400">（現在 {currentTime}）</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>
          </motion.div>

          {/* 移動手段（複数選択可） */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="space-y-1.5"
          >
            <label className="text-xs font-bold text-slate-700 block pl-1">
              移動手段 <span className="text-[10px] font-normal text-slate-500">（複数選択可）</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TRANSIT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = transitModes.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleTransitMode(opt.id)}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-2xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                      isSelected
                        ? 'liquid-pill-active shadow-md'
                        : 'liquid-pill-inactive hover:bg-white/80'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* 興味・関心（複数選択可） */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="space-y-1.5"
          >
            <label className="text-xs font-bold text-slate-700 block pl-1">
              興味・関心 <span className="text-[10px] font-normal text-slate-500">（複数選択可）</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {INTEREST_TAGS.map((tag) => {
                const Icon = tag.icon;
                const isSelected = interests.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleInterest(tag.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 cursor-pointer ${
                      isSelected
                        ? 'liquid-pill-active shadow-md'
                        : 'liquid-pill-inactive hover:bg-white/80'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tag.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* 天候 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="space-y-1.5"
          >
            <label className="text-xs font-bold text-slate-700 block pl-1">天候</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setWeather('sunny')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-2xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  weather === 'sunny'
                    ? 'liquid-pill-active shadow-md'
                    : 'liquid-pill-inactive hover:bg-white/80'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>晴れ</span>
              </button>
              <button
                type="button"
                onClick={() => setWeather('cloudy')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-2xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  weather === 'cloudy'
                    ? 'liquid-pill-active shadow-md'
                    : 'liquid-pill-inactive hover:bg-white/80'
                }`}
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>曇り</span>
              </button>
              <button
                type="button"
                onClick={() => setWeather('rain')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-2xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  weather === 'rain'
                    ? 'liquid-pill-active shadow-md'
                    : 'liquid-pill-inactive hover:bg-white/80'
                }`}
              >
                <CloudRain className="w-3.5 h-3.5" />
                <span>雨</span>
              </button>
            </div>
          </motion.div>

          {/* こだわり（任意） */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="space-y-1.5"
          >
            <label className="text-xs font-bold text-slate-700 block pl-1">
              こだわり <span className="text-[10px] font-normal text-slate-500">（任意）</span>
            </label>
            <div className="relative liquid-glass rounded-2xl border border-white/80 overflow-hidden shadow-sm">
              <input
                type="text"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="静かな場所がいい / あまり歩きたくない"
                className="w-full bg-transparent px-3.5 py-3 pr-10 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Pencil className="w-3.5 h-3.5" />
              </div>
            </div>
          </motion.div>

          {/* アクションボタン */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="pt-2"
          >
            <button
              type="submit"
              disabled={isLoading}
              className="w-full liquid-blue-btn text-white font-bold py-3.5 px-6 rounded-full flex items-center justify-center gap-2 text-sm shadow-xl active:scale-[0.98] transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-sky-200 animate-pulse" />
              <span>{isLoading ? '最適なスポットを計算中...' : 'おすすめを探す'}</span>
            </button>
          </motion.div>
        </form>
      </div>

      {/* 地点・時刻選択モーダル */}
      <AnimatePresence>
        {selectingLocationType && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="w-full max-w-sm bg-white/95 rounded-3xl p-5 shadow-2xl border border-white backdrop-blur-xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-800">
                  {selectingLocationType === 'origin'
                    ? '今いる場所を選択'
                    : selectingLocationType === 'destination'
                    ? '次の目的地を選択'
                    : '時刻の設定'}
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectingLocationType(null)}
                  className="p-1 rounded-full text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {selectingLocationType === 'time' ? (
                <div className="space-y-4 py-2">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">現在時刻</label>
                    <input
                      type="time"
                      value={currentTime}
                      onChange={(e) => setCurrentTime(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">到着希望時刻</label>
                    <input
                      type="time"
                      value={targetArrivalTime}
                      onChange={(e) => setTargetArrivalTime(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 bg-slate-50"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectingLocationType(null)}
                    className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-md mt-2 cursor-pointer"
                  >
                    決定
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                  {POPULAR_LOCATIONS.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => {
                        if (selectingLocationType === 'origin') {
                          setOrigin(loc);
                          setGpsAcquiredLocation(null);
                        }
                        if (selectingLocationType === 'destination') {
                          setDestination(loc);
                        }
                        setSelectingLocationType(null);
                      }}
                      className="p-2.5 rounded-xl text-left text-xs font-semibold hover:bg-blue-50 text-slate-700 border border-slate-100 hover:border-blue-200 transition cursor-pointer"
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* デモシナリオ選択モーダル */}
      <AnimatePresence>
        {showPresets && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white/95 rounded-3xl p-5 shadow-2xl border border-white backdrop-blur-xl space-y-3"
            >
              <div className="flex justify-between items-center mb-1">
                <div>
                  <h3 className="text-sm font-bold text-slate-850">🎯 デモ用クイックシナリオ</h3>
                  <p className="text-[11px] text-slate-500">ワンタップで審査・デモ条件をセット</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPresets(false)}
                  className="p-1 rounded-full text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-300 text-left transition group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
                        {preset.label}
                      </span>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-100/70 px-2 py-0.5 rounded-full">
                        {preset.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      {preset.description}
                    </p>
                    <div className="text-[10px] text-slate-400 mt-1.5 flex gap-2">
                      <span>📍 {preset.data.origin} → {preset.data.destination}</span>
                      <span>🕒 {preset.data.currentTime}〜{preset.data.targetArrivalTime}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* お気に入り一覧モーダル */}
      <FavoritesModal
        isOpen={showFavorites}
        onClose={() => setShowFavorites(false)}
        onSelectSpot={(spot) => onSelectFavoriteSpot?.(spot)}
      />
    </div>
  );
};
