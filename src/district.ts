/**
 * 北京区域聚类工具 — 共享于 closed-loop.ts 和 tools/definitions.ts
 */

/** 地标/商圈 → 行政区映射 */
export const AREA_TO_DISTRICT: Record<string, string> = {
  '东城': '东城区', '西城': '西城区', '朝阳': '朝阳区', '海淀': '海淀区',
  '丰台': '丰台区', '石景山': '石景山区', '通州': '通州区', '大兴': '大兴区',
  '昌平': '昌平区', '顺义': '顺义区', '房山': '房山区', '门头沟': '门头沟区',
  '国贸': '朝阳区', '三里屯': '朝阳区', '798': '朝阳区', '蓝色港湾': '朝阳区',
  '望京': '朝阳区', '朝阳公园': '朝阳区', '欢乐谷': '朝阳区',
  '中关村': '海淀区', '五道口': '海淀区', '西二旗': '海淀区', '上地': '海淀区',
  '王府井': '东城区', '故宫': '东城区', '天安门': '东城区', '簋街': '东城区',
  '南锣鼓巷': '东城区', '崇文门': '东城区', '东直门': '东城区',
  '西单': '西城区', '金融街': '西城区', '后海': '西城区', '什刹海': '西城区',
  '西直门': '西城区',
  '方庄': '丰台区', '丽泽': '丰台区',
  '环球': '通州区', '环球影城': '通州区',
  '奥森': '朝阳区', '奥林匹克': '朝阳区', '奥林匹克公园': '朝阳区', '鸟巢': '朝阳区', '水立方': '朝阳区',
  '亦庄': '大兴区',
  '回龙观': '昌平区', '天通苑': '昌平区',
  '良乡': '房山区', '长阳': '房山区',
};

/** 行政区之间平均距离 (km)，12×12 矩阵 */
export const DISTRICT_DIST: Record<string, Record<string, number>> = {
  '东城区':   { '东城区': 3, '西城区': 5, '朝阳区': 8, '海淀区': 12, '丰台区': 10, '石景山区': 15, '通州区': 20, '大兴区': 20, '昌平区': 30, '顺义区': 25, '房山区': 25, '门头沟区': 20 },
  '西城区':   { '东城区': 5, '西城区': 3, '朝阳区': 10, '海淀区': 10, '丰台区': 8, '石景山区': 12, '通州区': 22, '大兴区': 18, '昌平区': 28, '顺义区': 28, '房山区': 22, '门头沟区': 18 },
  '朝阳区':   { '东城区': 8, '西城区': 10, '朝阳区': 4, '海淀区': 12, '丰台区': 15, '石景山区': 18, '通州区': 15, '大兴区': 22, '昌平区': 28, '顺义区': 20, '房山区': 30, '门头沟区': 25 },
  '海淀区':   { '东城区': 12, '西城区': 10, '朝阳区': 12, '海淀区': 4, '丰台区': 15, '石景山区': 10, '通州区': 28, '大兴区': 25, '昌平区': 18, '顺义区': 30, '房山区': 25, '门头沟区': 15 },
  '丰台区':   { '东城区': 10, '西城区': 8, '朝阳区': 15, '海淀区': 15, '丰台区': 4, '石景山区': 8, '通州区': 25, '大兴区': 15, '昌平区': 30, '顺义区': 30, '房山区': 15, '门头沟区': 12 },
  '石景山区': { '东城区': 15, '西城区': 12, '朝阳区': 18, '海淀区': 10, '丰台区': 8, '石景山区': 3, '通州区': 30, '大兴区': 22, '昌平区': 25, '顺义区': 35, '房山区': 18, '门头沟区': 8 },
  '通州区':   { '东城区': 20, '西城区': 22, '朝阳区': 15, '海淀区': 28, '丰台区': 25, '石景山区': 30, '通州区': 4, '大兴区': 30, '昌平区': 25, '顺义区': 15, '房山区': 35, '门头沟区': 35 },
  '大兴区':   { '东城区': 20, '西城区': 18, '朝阳区': 22, '海淀区': 25, '丰台区': 15, '石景山区': 22, '通州区': 30, '大兴区': 4, '昌平区': 35, '顺义区': 30, '房山区': 15, '门头沟区': 25 },
  '昌平区':   { '东城区': 30, '西城区': 28, '朝阳区': 28, '海淀区': 18, '丰台区': 30, '石景山区': 25, '通州区': 25, '大兴区': 35, '昌平区': 4, '顺义区': 20, '房山区': 35, '门头沟区': 25 },
  '顺义区':   { '东城区': 25, '西城区': 28, '朝阳区': 20, '海淀区': 30, '丰台区': 30, '石景山区': 35, '通州区': 15, '大兴区': 30, '昌平区': 20, '顺义区': 4, '房山区': 40, '门头沟区': 35 },
  '房山区':   { '东城区': 25, '西城区': 22, '朝阳区': 30, '海淀区': 25, '丰台区': 15, '石景山区': 18, '通州区': 35, '大兴区': 15, '昌平区': 35, '顺义区': 40, '房山区': 4, '门头沟区': 12 },
  '门头沟区': { '东城区': 20, '西城区': 18, '朝阳区': 25, '海淀区': 15, '丰台区': 12, '石景山区': 8, '通州区': 35, '大兴区': 25, '昌平区': 25, '顺义区': 35, '房山区': 12, '门头沟区': 3 },
};

/** 从地点文本解析行政区 */
export function resolveDistrict(location: string, venues: Array<{ name: string; district: string }>): string | null {
  for (const d of Object.keys(DISTRICT_DIST)) {
    if (location.includes(d) || location.includes(d.replace('区', ''))) return d;
  }
  const areas = Object.entries(AREA_TO_DISTRICT).sort((a, b) => b[0].length - a[0].length);
  for (const [area, district] of areas) {
    if (location.includes(area)) return district;
  }
  for (const v of venues) {
    if (v.name.includes(location) && location.length >= 2) return v.district;
  }
  return null;
}

/** 两区之间的距离 (km)，找不到时返回 fallback */
export function getDistrictDistance(from: string, to: string, fallback = 20): number {
  return DISTRICT_DIST[from]?.[to] ?? fallback;
}

/** 根据区距离计算行程时间（分钟）和交通方式 */
export function calculateRoute(fromDistrict: string, toDistrict: string): {
  distanceKm: number;
  durationMinutes: number;
  transport: string;
} {
  const distanceKm = getDistrictDistance(fromDistrict, toDistrict);
  let durationMinutes: number;
  let transport: string;
  if (distanceKm <= 2) {
    durationMinutes = Math.round(distanceKm * 12);
    transport = '步行';
  } else if (distanceKm <= 5) {
    durationMinutes = Math.round(5 + distanceKm * 3);
    transport = '骑行/打车';
  } else if (distanceKm <= 15) {
    durationMinutes = Math.round(10 + distanceKm * 2.5);
    transport = '打车/公交';
  } else {
    durationMinutes = Math.round(15 + distanceKm * 2);
    transport = '地铁/驾车';
  }
  return { distanceKm, durationMinutes, transport };
}
