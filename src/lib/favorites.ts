import { Spot } from '@/types';

const FAVORITES_STORAGE_KEY = 'yorinsai_favorites_v1';

/**
 * localStorage からお気に入りスポット一覧を取得
 */
export function getFavorites(): Spot[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load favorites from localStorage:', e);
    return [];
  }
}

/**
 * 指定のスポットがお気に入りに登録されているか判定
 */
export function isFavorite(spotId: string): boolean {
  const list = getFavorites();
  return list.some((s) => s.spotId === spotId);
}

/**
 * お気に入りのトグル（追加/削除）
 * @returns 追加された場合 true, 削除された場合 false
 */
export function toggleFavorite(spot: Spot): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const list = getFavorites();
    const index = list.findIndex((s) => s.spotId === spot.spotId);
    let isAdded = false;

    if (index >= 0) {
      list.splice(index, 1);
      isAdded = false;
    } else {
      list.unshift(spot);
      isAdded = true;
    }

    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(list));
    // カスタムイベントを発火してお気に入り件数の更新をリアルタイム通知
    window.dispatchEvent(new Event('yorinsai_favorites_updated'));
    return isAdded;
  } catch (e) {
    console.error('Failed to update favorites:', e);
    return false;
  }
}

/**
 * 指定スポットをお気に入りから削除
 */
export function removeFavorite(spotId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getFavorites().filter((s) => s.spotId !== spotId);
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event('yorinsai_favorites_updated'));
  } catch (e) {
    console.error('Failed to remove favorite:', e);
  }
}
