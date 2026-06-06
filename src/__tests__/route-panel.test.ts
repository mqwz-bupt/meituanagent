import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

class FakeElement {
  hidden = false;
  innerHTML = '';
  textContent = '';
  value = '';
  disabled = false;
  style: Record<string, string> = {};
  dataset: Record<string, string> = {};
  className = '';
  classList = { toggle: () => false, contains: () => false, remove: () => undefined };

  appendChild() { return new FakeElement(); }
  remove() { /* noop */ }
  addEventListener() { /* noop */ }
  focus() { /* noop */ }
  scrollIntoView() { /* noop */ }
  insertAdjacentHTML(_position: string, html: string) { this.innerHTML += html; }
  querySelector() { return new FakeElement(); }
  querySelectorAll() { return []; }
}

function loadAppWindow() {
  const elements = new Map<string, FakeElement>();
  const document = {
    getElementById(id: string) {
      if (!elements.has(id)) elements.set(id, new FakeElement());
      return elements.get(id);
    },
    createElement() { return new FakeElement(); },
    createTextNode(text: string) {
      const el = new FakeElement();
      el.textContent = text;
      return el;
    },
    querySelectorAll() { return []; },
  };
  const sandbox = {
    window: {
      addEventListener: () => undefined,
      innerWidth: 1200,
      navigator: { clipboard: { writeText: () => Promise.resolve() } },
    },
    document,
    TextDecoder,
    requestAnimationFrame: (fn: () => void) => fn(),
    setTimeout,
    console,
  };
  vm.createContext(sandbox);
  const code = readFileSync(join(process.cwd(), 'public', 'app.js'), 'utf8');
  vm.runInContext(code, sandbox);
  return sandbox.window as typeof sandbox.window & {
    __routeHelpers?: {
      buildRouteStopsFromPlan: (items: Array<Record<string, unknown>>) => Array<{ name: string }>;
    };
  };
}

describe('route panel helpers', () => {
  it('does not treat movement connector items as real route stops', () => {
    const appWindow = loadAppWindow();

    const stops = appWindow.__routeHelpers!.buildRouteStopsFromPlan([
      {
        time: '14:00-16:00',
        activity: 'AI主题公园',
        venue: '海淀公园（AI主题公园）',
        venueId: 'a090',
        bookingRequired: true,
      },
      {
        time: '16:00-16:30',
        activity: '步行/打车前往世纪金源',
        venue: '海淀公园→世纪金源',
        venueId: '',
        bookingRequired: false,
      },
      {
        time: '16:30-17:30',
        activity: '商场休息',
        venue: '世纪金源购物中心',
        venueId: '',
        bookingRequired: false,
      },
      {
        time: '17:30-18:30',
        activity: '晚餐',
        venue: '小放牛（世纪金源店）',
        venueId: 'r004',
        bookingRequired: true,
      },
    ]);

    expect(stops.map(stop => stop.name)).toEqual([
      '海淀公园（AI主题公园）',
      '世纪金源购物中心',
      '小放牛（世纪金源店）',
    ]);
    expect(stops.map(stop => stop.name).join(' ')).not.toContain('海淀公园→世纪金源');
  });
});
