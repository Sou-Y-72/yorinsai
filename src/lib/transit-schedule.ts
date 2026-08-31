import { TransitStatusInfo, TransitMode } from '@/types';
import { timeToMinutes } from './travel';

interface RouteScheduleRule {
  matchOrigins: string[];
  matchDests: string[];
  lineName: string;
  lastDepartureTime: string; // "22:14"
}

// 広島エリアの主要交通機関の最終便スケジュールデータ
const SCHEDULE_RULES: RouteScheduleRule[] = [
  // 宮島航路
  {
    matchOrigins: ['宮島', '厳島神社', '清盛通り', '宮島水族館'],
    matchDests: ['宮島口', '広島駅', '原爆ドーム', '八丁堀'],
    lineName: 'JR/松大フェリー',
    lastDepartureTime: '22:14',
  },
  {
    matchOrigins: ['宮島口', '広島駅'],
    matchDests: ['宮島', '厳島神社', '清盛通り', '宮島水族館'],
    lineName: 'JR/松大フェリー',
    lastDepartureTime: '22:40',
  },
  // 尾道・三原エリア
  {
    matchOrigins: ['尾道', '千光寺', 'ONOMICHI', '三原', '筆影山', '仏通寺'],
    matchDests: ['広島駅', '宮島口', '八丁堀'],
    lineName: 'JR山陽本線・新幹線',
    lastDepartureTime: '22:30',
  },
  // 呉エリア
  {
    matchOrigins: ['呉', '大和ミュージアム', 'アレイからすこじま'],
    matchDests: ['広島駅', '宮島口', '八丁堀'],
    lineName: 'JR呉線（快速・普通）',
    lastDepartureTime: '23:05',
  },
  // 西条エリア
  {
    matchOrigins: ['西条', '賀茂鶴'],
    matchDests: ['広島駅', '宮島口', '八丁堀'],
    lineName: 'JR山陽本線',
    lastDepartureTime: '23:25',
  },
  // 竹原エリア
  {
    matchOrigins: ['竹原'],
    matchDests: ['広島駅', '宮島口', '八丁堀'],
    lineName: 'JR呉線・高速バス',
    lastDepartureTime: '21:30',
  },
  // 宮島口 ➔ 広島駅
  {
    matchOrigins: ['宮島口', 'etto'],
    matchDests: ['広島駅', '八丁堀', '紙屋町', '横川駅'],
    lineName: 'JR山陽本線 / 広電宮島線',
    lastDepartureTime: '23:38',
  },
  // 宇品港
  {
    matchOrigins: ['宇品', 'デポルトピア'],
    matchDests: ['広島駅', '八丁堀', '紙屋町'],
    lineName: '広電5号線（宇品線）',
    lastDepartureTime: '23:10',
  },
  // 広島市内（広電・市内バス）
  {
    matchOrigins: ['原爆ドーム', '平和記念公園', 'おりづるタワー', '広島城', '縮景園', 'お好み村', '八丁堀', '紙屋町', '横川', '比治山', '現代美術館', '県立美術館'],
    matchDests: ['広島駅', '八丁堀', '紙屋町', '横川駅'],
    lineName: '広電市内電車 / 循環バス',
    lastDepartureTime: '23:45',
  },
];

/**
 * 区間と出発時刻に基づき、交通機関の運行可否・最終便ステータスを判定
 */
export function evaluateTransitStatus(
  fromLocation: string,
  toLocation: string,
  departureTime: string,
  transitModes: TransitMode[] = ['transit', 'walk']
): TransitStatusInfo {
  const isCarOnly = transitModes.length === 1 && transitModes.includes('car');
  const hasCar = transitModes.includes('car');

  // 車利用の場合は24時間運行可能
  if (isCarOnly) {
    return {
      lineName: '車・タクシー',
      status: 'operating',
      badgeText: '車・タクシー利用',
      isWarning: false,
    };
  }

  // 該当するスケジュールルールを検索
  const rule = SCHEDULE_RULES.find((r) => {
    const originMatch = r.matchOrigins.some((keyword) => fromLocation.includes(keyword));
    const destMatch = r.matchDests.some((keyword) => toLocation.includes(keyword));
    return originMatch && destMatch;
  });

  const departureMins = timeToMinutes(departureTime);

  // 深夜運休（00:00〜05:15）の判定
  if (departureMins >= 0 && departureMins < 315) {
    return {
      lineName: rule ? rule.lineName : '公共交通機関',
      status: 'ended',
      badgeText: `🚫 深夜運行なし（始発 05:30〜）`,
      isWarning: true,
    };
  }

  if (!rule) {
    // 市内一般のデフォルト
    return {
      lineName: hasCar ? '公共交通 / 車' : '公共交通（電車・バス）',
      status: 'operating',
      badgeText: '公共交通 利用可能',
      isWarning: false,
    };
  }

  const lastMins = timeToMinutes(rule.lastDepartureTime);
  const diffMinutes = lastMins - departureMins;

  if (diffMinutes < 0) {
    // 最終便を過ぎている
    return {
      lineName: rule.lineName,
      status: 'ended',
      lastDepartureTime: rule.lastDepartureTime,
      minutesUntilLast: 0,
      badgeText: `🚫 ${rule.lineName} 最終便終了(${rule.lastDepartureTime}発)`,
      isWarning: true,
    };
  }

  if (diffMinutes <= 35) {
    // 最終便まで残りわずか（35分以内）
    return {
      lineName: rule.lineName,
      status: 'close_to_last',
      lastDepartureTime: rule.lastDepartureTime,
      minutesUntilLast: diffMinutes,
      badgeText: `⚠️ 最終便まで残り${diffMinutes}分 (${rule.lastDepartureTime}発)`,
      isWarning: true,
    };
  }

  return {
    lineName: rule.lineName,
    status: 'operating',
    lastDepartureTime: rule.lastDepartureTime,
    minutesUntilLast: diffMinutes,
    badgeText: `${rule.lineName} 利用可能`,
    isWarning: false,
  };
}
