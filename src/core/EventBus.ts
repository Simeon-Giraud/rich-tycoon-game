/**
 * EventBus — Lightweight pub/sub to decouple the Economy Engine from the UI.
 * Logic fires events; the UI subscribes. Neither knows about the other.
 */

type Callback = (...args: any[]) => void;

export class EventBus {
  private static instance: EventBus;
  private listeners: Map<string, Set<Callback>> = new Map();

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /** Subscribe to an event. Returns an unsubscribe function. */
  public on(event: string, callback: Callback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  /** Fire an event with optional payload. */
  public emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach((cb) => cb(...args));
  }
}

/* ── Event name constants ─────────────────────────────────── */
export const GameEvents = {
  BALANCE_CHANGED: 'economy:balanceChanged',
  CLICK_EARNED: 'economy:clickEarned',
  PASSIVE_TICK: 'economy:passiveTick',
  STATS_UPDATED: 'economy:statsUpdated',
  GAME_SAVED: 'save:gameSaved',
  GAME_LOADED: 'save:gameLoaded',
  BUSINESS_PURCHASED: 'business:purchased',
  BUSINESSES_CHANGED: 'business:changed',
  STOCKS_UPDATED: 'stocks:updated',
  STOCK_TRADED: 'stocks:traded',
  STOCK_NEWS: 'stocks:news',
  NEWS_HEADLINE: 'news:headline',
  TAB_CHANGED: 'ui:tabChanged',
  LIFESTYLE_PURCHASED: 'lifestyle:purchased',
} as const;
