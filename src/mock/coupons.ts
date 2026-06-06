import type { Coupon } from '../types.js';

/** 团购券/套餐/增购选项目录 — 按 scenario 匹配 */
export const couponCatalog: Coupon[] = [
  {
    id: 'cpn-family-01', name: '亲子套餐（1大1小）', type: 'package',
    price: 128, originalPrice: 168, saving: 40,
    applicableScenario: ['family'], reason: '适合家庭场景，含儿童餐+家长主菜',
  },
  {
    id: 'cpn-family-02', name: '低糖饮品券', type: 'drink',
    price: 18, originalPrice: 28, saving: 10,
    applicableScenario: ['family'], reason: '适合减脂需求，低糖健康饮品',
  },
  {
    id: 'cpn-family-03', name: '打车券（满30减8）', type: 'ride',
    price: 22, originalPrice: 30, saving: 8,
    applicableScenario: ['family'], reason: '适合家庭出行打车',
  },
  {
    id: 'cpn-friends-01', name: '4人团购套餐', type: 'package',
    price: 258, originalPrice: 340, saving: 82,
    applicableScenario: ['friends'], reason: '适合4人朋友聚会，含4道主菜+饮品',
  },
  {
    id: 'cpn-friends-02', name: '朋友聚会饮品券（4杯）', type: 'drink',
    price: 68, originalPrice: 96, saving: 28,
    applicableScenario: ['friends'], reason: '适合朋友局，4杯精酿/果茶',
  },
  {
    id: 'cpn-cake-01', name: '蛋糕配送（6寸）', type: 'cake',
    price: 88, originalPrice: 108, saving: 20,
    applicableScenario: ['family', 'friends'], reason: '增加仪式感，现场配送',
  },
  {
    id: 'cpn-flower-01', name: '鲜花束配送', type: 'flower',
    price: 128, originalPrice: 158, saving: 30,
    applicableScenario: ['family', 'friends', 'couple'], reason: '增加仪式感，现场配送',
  },
  {
    id: 'cpn-couple-01', name: '双人浪漫套餐', type: 'package',
    price: 198, originalPrice: 268, saving: 70,
    applicableScenario: ['couple'], reason: '适合情侣约会，含前菜+主菜+甜品',
  },
  {
    id: 'cpn-couple-02', name: '鲜花+蛋糕组合券', type: 'flower',
    price: 168, originalPrice: 218, saving: 50,
    applicableScenario: ['couple'], reason: '适合纪念日/约会，鲜花+蛋糕一站式',
  },
  {
    id: 'cpn-solo-01', name: '咖啡+书店代金券', type: 'drink',
    price: 35, originalPrice: 50, saving: 15,
    applicableScenario: ['solo'], reason: '适合一个人安静享受，咖啡+阅读',
  },
  {
    id: 'cpn-solo-02', name: '单人轻食套餐券', type: 'package',
    price: 48, originalPrice: 65, saving: 17,
    applicableScenario: ['solo'], reason: '适合一人食，健康轻食+饮品',
  },
  {
    id: 'cpn-team-01', name: '8人团购套餐', type: 'package',
    price: 588, originalPrice: 780, saving: 192,
    applicableScenario: ['team'], reason: '适合团建，含8道主菜+饮品+包间',
  },
  {
    id: 'cpn-team-02', name: '团建饮品券（8杯）', type: 'drink',
    price: 128, originalPrice: 192, saving: 64,
    applicableScenario: ['team'], reason: '适合团建，8杯精酿/果茶',
  },
];

/** 根据 scenario 获取匹配的优惠券/套餐 */
export function getCouponsForScenario(scenario: string): Coupon[] {
  return couponCatalog.filter(c => c.applicableScenario.includes(scenario));
}

/** 获取增购选项（非套餐类） */
export function getUpsellOptions(scenario: string): Coupon[] {
  return couponCatalog.filter(c =>
    c.applicableScenario.includes(scenario) && c.type !== 'package',
  );
}
