'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  X,
  Trash2,
  ExternalLink,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Spot } from '@/types';
import { getFavorites, removeFavorite } from '@/lib/favorites';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSpot: (spot: Spot) => void;
}

export const FavoritesModal: React.FC<FavoritesModalProps> = ({
  isOpen,
  onClose,
  onSelectSpot,
}) => {
  const [favorites, setFavorites] = useState<Spot[]>([]);

  const loadList = () => {
    setFavorites(getFavorites());
  };

  useEffect(() => {
    if (isOpen) {
      loadList();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => {
      loadList();
    };
    window.addEventListener('yorinsai_favorites_updated', handleUpdate);
    return () => {
      window.removeEventListener('yorinsai_favorites_updated', handleUpdate);
    };
  }, []);

  const handleRemove = (e: React.MouseEvent, spotId: string) => {
    e.stopPropagation();
    removeFavorite(spotId);
    loadList();
  };

  const handleOpenMaps = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-sm bg-white/95 rounded-3xl p-5 shadow-2xl border border-white backdrop-blur-xl max-h-[85vh] flex flex-col justify-between"
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                <Heart className="w-4 h-4 fill-rose-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-850">お気に入りスポット</h3>
                <p className="text-[10px] text-slate-400">
                  {favorites.length > 0 ? `${favorites.length}件保存済み` : '保存したスポット'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* リストエリア */}
          <div className="py-3 flex-1 overflow-y-auto space-y-2.5 max-h-[55vh] pr-1">
            {favorites.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Heart className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
                <p className="text-xs font-bold text-slate-600">お気に入りはまだありません</p>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  スポット詳細画面の右上の「♡」をタップして<br />気になる場所を保存してみましょう！
                </p>
              </div>
            ) : (
              favorites.map((spot) => (
                <div
                  key={spot.spotId}
                  onClick={() => {
                    onSelectSpot(spot);
                    onClose();
                  }}
                  className="flex gap-3 p-2.5 rounded-2xl bg-slate-50/80 hover:bg-blue-50/70 border border-slate-200/70 transition cursor-pointer group"
                >
                  {/* サムネイル */}
                  <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-slate-200 border border-white shadow-xs">
                    <img
                      src={spot.imageUrl}
                      alt={spot.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* 情報 */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600">
                          {spot.name}
                        </h4>
                        <button
                          type="button"
                          onClick={(e) => handleRemove(e, spot.spotId)}
                          className="text-slate-400 hover:text-rose-500 p-1 transition cursor-pointer"
                          title="お気に入りから削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-2.5 h-2.5" /> {spot.area}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> 滞在 {spot.recommendedStayMinutes}分
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleOpenMaps(e, spot.googleMapsUrl)}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>地図</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
