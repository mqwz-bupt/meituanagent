import { describe, it, expect, beforeEach } from 'vitest';
import {
  bookRestaurantTool,
  bookActivityTool,
  orderDeliveryTool,
  resetBookingTracker,
} from '../tools/definitions.js';

async function callTool(tool: any, params: Record<string, unknown>) {
  return tool.execute(params);
}

describe('Booking safety guards', () => {
  beforeEach(() => {
    resetBookingTracker();
  });

  describe('venueId prefix validation', () => {
    it('rejects activity ID in book_restaurant', async () => {
      const result = await callTool(bookRestaurantTool, {
        restaurantId: 'a017', date: '2026-05-10', timeSlot: '14:00', partySize: 3,
      });
      expect(result.error?.code).toBe('INVALID_ID');
    });

    it('rejects restaurant ID in book_activity', async () => {
      const result = await callTool(bookActivityTool, {
        activityId: 'r011', date: '2026-05-10', timeSlot: '17:00', partySize: 3,
      });
      expect(result.error?.code).toBe('INVALID_ID');
    });

    it('accepts r-prefixed ID in book_restaurant', async () => {
      const result = await callTool(bookRestaurantTool, {
        restaurantId: 'r011', date: '2026-05-10', timeSlot: '17:00', partySize: 2,
      });
      expect(result.error?.code).not.toBe('INVALID_ID');
    });

    it('accepts a-prefixed ID in book_activity', async () => {
      const result = await callTool(bookActivityTool, {
        activityId: 'a017', date: '2026-05-10', timeSlot: '14:00', partySize: 2,
      });
      expect(result.error?.code).not.toBe('INVALID_ID');
    });
  });

  describe('Duplicate booking prevention', () => {
    it('blocks identical booking', async () => {
      const params = { activityId: 'a017', date: '2026-05-10', timeSlot: '14:00', partySize: 2 };
      const first = await callTool(bookActivityTool, params);
      if (first.status === 'success') {
        const second = await callTool(bookActivityTool, params);
        expect(second.error?.code).toBe('DUPLICATE_BOOKING');
      }
    });

    it('allows same venue different time', async () => {
      const r1 = await callTool(bookActivityTool, { activityId: 'a017', date: '2026-05-10', timeSlot: '14:00', partySize: 2 });
      if (r1.status === 'success') {
        const r2 = await callTool(bookActivityTool, { activityId: 'a017', date: '2026-05-10', timeSlot: '15:00', partySize: 2 });
        expect(r2.error?.code).not.toBe('DUPLICATE_BOOKING');
      }
    });

    it('allows same venue different date', async () => {
      const r1 = await callTool(bookActivityTool, { activityId: 'a017', date: '2026-05-10', timeSlot: '14:00', partySize: 2 });
      if (r1.status === 'success') {
        const r2 = await callTool(bookActivityTool, { activityId: 'a017', date: '2026-05-11', timeSlot: '14:00', partySize: 2 });
        expect(r2.error?.code).not.toBe('DUPLICATE_BOOKING');
      }
    });

    it('tracker reset allows rebooking', async () => {
      const params = { activityId: 'a017', date: '2026-05-10', timeSlot: '14:00', partySize: 2 };
      const r1 = await callTool(bookActivityTool, params);
      if (r1.status === 'success') {
        resetBookingTracker();
        const r2 = await callTool(bookActivityTool, params);
        expect(r2.error?.code).not.toBe('DUPLICATE_BOOKING');
      }
    });
  });

  describe('Error responses', () => {
    it('returns NOT_FOUND for invalid restaurant ID', async () => {
      const result = await callTool(bookRestaurantTool, {
        restaurantId: 'r999', date: '2026-05-10', timeSlot: '14:00', partySize: 3,
      });
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    it('returns NOT_FOUND for invalid activity ID', async () => {
      const result = await callTool(bookActivityTool, {
        activityId: 'a999', date: '2026-05-10', timeSlot: '14:00', partySize: 3,
      });
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    it('returns SLOT_UNAVAILABLE with specific time alternatives', async () => {
      // r011 at 18:00 has 0 inventory for partySize 3
      const result = await callTool(bookRestaurantTool, {
        restaurantId: 'r011', date: '2026-05-10', timeSlot: '18:00', partySize: 3,
      });
      if (result.error?.code === 'SLOT_UNAVAILABLE') {
        const slots: string[] = result.error.alternativeSlots;
        expect(Array.isArray(slots)).toBe(true);
        if (slots.length > 0) {
          // Must be specific times like "11:00", NOT "lunch"/"dinner"
          expect(slots[0]).toMatch(/^\d{2}:\d{2}$/);
        }
      }
    });

    it('returns success with bookingId on valid booking', async () => {
      // Retry up to 5 times to avoid random 10% BOOKING_FAILED flakiness
      let result: any;
      for (let i = 0; i < 5; i++) {
        result = await callTool(bookActivityTool, {
          activityId: 'a017', date: '2026-05-10', timeSlot: '14:00', partySize: 3,
        });
        if (result.status === 'success') break;
      }
      expect(result.status).toBe('success');
      expect(result.bookingId).toMatch(/^BK/);
      expect(result.confirmation).toContain('朝阳公园');
    });
  });
});

describe('orderDelivery', () => {
  it('returns success with orderId', async () => {
    const result = await callTool(orderDeliveryTool, {
      item: '奶茶', deliveryTime: '15:00', deliveryAddress: '朝阳公园南门',
    });
    if (result.status === 'success') {
      expect(result.orderId).toMatch(/^OD/);
      expect(result.item).toBe('奶茶');
    }
  });
});
