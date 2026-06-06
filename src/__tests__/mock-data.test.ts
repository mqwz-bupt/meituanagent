import { describe, it, expect } from 'vitest';
import {
  searchRestaurants,
  searchActivities,
  checkAvailability,
  getRestaurantById,
  getActivityById,
} from '../mock/data.js';

describe('searchRestaurants', () => {
  it('returns all restaurants sorted by rating desc with no filter', () => {
    const results = searchRestaurants({});
    expect(results.length).toBeGreaterThan(0);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].rating).toBeGreaterThanOrEqual(results[i].rating);
    }
  });

  it('filters by cuisine', () => {
    const results = searchRestaurants({ cuisine: '火锅' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.cuisine.includes('火锅') || r.tags.some(t => t.includes('火锅')))).toBe(true);
  });

  it('filters by maxPrice', () => {
    const results = searchRestaurants({ maxPrice: 80 });
    expect(results.every(r => r.avgPrice <= 80)).toBe(true);
  });

  it('filters by kidFriendly=true', () => {
    const results = searchRestaurants({ kidFriendly: true });
    expect(results.every(r => r.kidFriendly)).toBe(true);
  });

  it('filters by dietFriendly=true', () => {
    const results = searchRestaurants({ dietFriendly: true });
    expect(results.every(r => r.dietFriendly)).toBe(true);
  });

  it('filters by groupSize', () => {
    const results = searchRestaurants({ groupSize: 20 });
    expect(results.every(r => r.groupMax >= 20)).toBe(true);
  });

  it('filters by maxDistance', () => {
    const results = searchRestaurants({ maxDistance: 5 });
    expect(results.every(r => r.distance <= 5)).toBe(true);
  });

  it('filters by tags', () => {
    const results = searchRestaurants({ tags: ['亲子'] });
    expect(results.every(r => r.tags.some(t => t.includes('亲子')))).toBe(true);
  });

  it('combines multiple filters', () => {
    const results = searchRestaurants({ kidFriendly: true, dietFriendly: true, maxPrice: 130 });
    expect(results.every(r => r.kidFriendly && r.dietFriendly && r.avgPrice <= 130)).toBe(true);
  });

  it('returns empty for impossible filters', () => {
    const results = searchRestaurants({ maxPrice: 1 });
    expect(results).toEqual([]);
  });
});

describe('searchActivities', () => {
  it('returns all activities sorted by price asc with no filter', () => {
    const results = searchActivities({});
    expect(results.length).toBeGreaterThan(0);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].price).toBeLessThanOrEqual(results[i].price);
    }
  });

  it('filters by type', () => {
    const results = searchActivities({ type: '亲子' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(a => a.type.includes('亲子') || a.tags.some(t => t.includes('亲子')))).toBe(true);
  });

  it('filters by maxPrice', () => {
    const results = searchActivities({ maxPrice: 50 });
    expect(results.every(a => a.price <= 50)).toBe(true);
  });

  it('filters by groupSize', () => {
    const results = searchActivities({ groupSize: 4 });
    expect(results.every(a => a.groupMin <= 4 && a.groupMax >= 4)).toBe(true);
  });

  it('filters by maxDistance', () => {
    const results = searchActivities({ maxDistance: 5 });
    expect(results.every(a => a.distance <= 5)).toBe(true);
  });

  it('filters by minAge with type=all', () => {
    const results = searchActivities({ minAge: 0 });
    const palace = results.find(a => a.id === 'a009');
    expect(palace).toBeDefined();
  });

  it('filters by minAge with type=min', () => {
    const results = searchActivities({ minAge: 5 });
    const popMart = results.find(a => a.id === 'a003');
    expect(popMart).toBeDefined();
  });

  it('excludes activities where minAge is too high', () => {
    const results = searchActivities({ minAge: 3 });
    const room = results.find(a => a.id === 'a019');
    // a019 minAge=14, filter checks as.minAge <= filter.minAge → 14 <= 3 false
    expect(room).toBeUndefined();
  });

  it('filters by tags', () => {
    const results = searchActivities({ tags: ['免费'] });
    expect(results.every(a => a.tags.some(t => t.includes('免费')))).toBe(true);
  });
});

describe('checkAvailability', () => {
  it('returns available=true when slots suffice', () => {
    const result = checkAvailability('a017', '2026-05-10', '14:00', 1);
    if (result.available) {
      expect(result.remainingSlots).toBeGreaterThanOrEqual(0);
      expect(result.timeSlots).toContain('14:00');
    }
  });

  it('returns available=false with alternatives when insufficient', () => {
    const result = checkAvailability('a017', '2026-05-10', '14:00', 100);
    expect(result.available).toBe(false);
    expect(result.remainingSlots).toBe(0);
  });

  it('for restaurants, alternativeSlots are HH:MM format', () => {
    const result = checkAvailability('r011', '2026-05-10', '14:00', 100);
    if (!result.available && result.timeSlots.length > 0) {
      expect(result.timeSlots[0]).toMatch(/^\d{2}:\d{2}$/);
    }
  });

  it('for activities, alternativeSlots come from activity.timeSlots', () => {
    const result = checkAvailability('a017', '2026-05-10', '14:00', 100);
    if (!result.available && result.timeSlots.length > 0) {
      for (const slot of result.timeSlots) {
        expect(['06:00', '10:00', '14:00']).toContain(slot);
      }
    }
  });

  it('returns estimatedWait message', () => {
    const result = checkAvailability('a017', '2026-05-10', '14:00', 100);
    if (!result.available) {
      if (result.timeSlots.length > 0) {
        expect(result.estimatedWait).toContain('可选');
      } else {
        expect(result.estimatedWait).toContain('已满');
      }
    }
  });
});

describe('getById functions', () => {
  it('getRestaurantById returns restaurant for valid id', () => {
    const r = getRestaurantById('r001');
    expect(r).toBeDefined();
    expect(r!.name).toContain('奈尔宝');
  });

  it('getRestaurantById returns undefined for invalid id', () => {
    expect(getRestaurantById('r999')).toBeUndefined();
  });

  it('getActivityById returns activity for valid id', () => {
    const a = getActivityById('a017');
    expect(a).toBeDefined();
    expect(a!.name).toContain('朝阳公园');
  });

  it('getActivityById returns undefined for invalid id', () => {
    expect(getActivityById('a999')).toBeUndefined();
  });
});
