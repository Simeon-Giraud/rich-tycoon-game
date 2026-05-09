/**
 * SaveManager — LocalStorage persistence with auto-save.
 *
 * Saves the EconomyState snapshot every N seconds and on
 * window beforeunload / visibilitychange so progress is
 * never lost on refresh or tab close.
 */

import { EconomyEngine, EconomyState } from '../core/EconomyEngine';
import { BusinessManager, BusinessState } from '../core/BusinessManager';
import { StockMarket, PortfolioEntry } from '../core/StockMarket';
import { LifestyleManager } from '../core/LifestyleManager';
import { EventBus, GameEvents } from '../core/EventBus';
import { sdkManager } from './SDKManager';

const SAVE_KEY = 'billionaire_tycoon_save';
const AUTO_SAVE_MS = 15_000; // every 15 seconds

export class SaveManager {
  private engine: EconomyEngine;
  private bizManager: BusinessManager;
  private stockMarket: StockMarket;
  private lifestyle: LifestyleManager;
  private bus: EventBus;
  private autoSaveTimer: number | null = null;

  constructor(engine: EconomyEngine, bizManager: BusinessManager, stockMarket: StockMarket, lifestyle: LifestyleManager) {
    this.engine = engine;
    this.bizManager = bizManager;
    this.stockMarket = stockMarket;
    this.lifestyle = lifestyle;
    this.bus = EventBus.getInstance();
    this.bindBrowserEvents();
  }

  /* ── Public API ─────────────────────────────────────────── */

  /** Save the current state to localStorage + cloud. */
  public save(): void {
    try {
      const snapshot = this.engine.getSnapshot();
      const bizSnapshot = this.bizManager.getSnapshot();
      const stockSnapshot = this.stockMarket.getSnapshot();
      const lifestyleSnapshot = this.lifestyle.getSnapshot();
      const payload = JSON.stringify({
        version: 5,
        timestamp: Date.now(),
        state: snapshot,
        businesses: bizSnapshot,
        stocks: stockSnapshot,
        lifestyle: lifestyleSnapshot,
      });
      localStorage.setItem(SAVE_KEY, payload);
      // Also push to CrazyGames cloud
      sdkManager.cloudSave(payload);
      this.bus.emit(GameEvents.GAME_SAVED);
    } catch (err) {
      console.error('[SaveManager] Save failed:', err);
    }
  }

  /** Load state — tries cloud first, then localStorage. */
  public async load(): Promise<boolean> {
    try {
      // Try cloud save first (CrazyGames), fall back to localStorage
      let raw = await sdkManager.cloudLoad();
      const localRaw = localStorage.getItem(SAVE_KEY);

      // Pick whichever save is more recent
      if (raw && localRaw) {
        const cloudParsed = JSON.parse(raw);
        const localParsed = JSON.parse(localRaw);
        if ((localParsed.timestamp ?? 0) > (cloudParsed.timestamp ?? 0)) {
          raw = localRaw;
        }
      } else if (!raw) {
        raw = localRaw;
      }

      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!parsed?.state) return false;

      // Calculate offline earnings
      const offlineSeconds = Math.floor((Date.now() - (parsed.timestamp ?? 0)) / 1000);
      const offlineState = parsed.state as EconomyState;

      if (offlineSeconds > 0 && offlineState.passiveIncome > 0) {
        // Cap offline earnings at 2 hours
        const cappedSeconds = Math.min(offlineSeconds, 7200);
        const offlineEarnings = offlineState.passiveIncome * cappedSeconds;
        offlineState.balance += offlineEarnings;
        offlineState.totalEarned += offlineEarnings;
        console.log(`[SaveManager] Offline ${offlineSeconds}s → +$${offlineEarnings.toFixed(0)}`);
      }

      this.engine.loadState(offlineState);

      if (parsed.businesses) {
        this.bizManager.loadState(parsed.businesses as BusinessState[]);
        this.engine.setPassiveIncome(this.bizManager.getTotalPassiveIncome());
      }

      if (parsed.stocks) {
        this.stockMarket.loadState(parsed.stocks as { portfolio?: PortfolioEntry[] });
      }

      if (parsed.lifestyle) {
        this.lifestyle.loadState(parsed.lifestyle as string[]);
      }

      this.bus.emit(GameEvents.GAME_LOADED);
      console.log('[SaveManager] Game loaded');
      return true;
    } catch (err) {
      console.error('[SaveManager] Load failed:', err);
      return false;
    }
  }

  /** Start periodic auto-save. */
  public startAutoSave(): void {
    if (this.autoSaveTimer !== null) return;
    this.autoSaveTimer = window.setInterval(() => this.save(), AUTO_SAVE_MS);
  }

  /** Stop periodic auto-save. */
  public stopAutoSave(): void {
    if (this.autoSaveTimer !== null) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /** Wipe save data (for debug). */
  public clearSave(): void {
    localStorage.removeItem(SAVE_KEY);
    console.log('[SaveManager] Save cleared');
  }

  /* ── Private ────────────────────────────────────────────── */

  private bindBrowserEvents(): void {
    // Save before the tab is closed / refreshed
    window.addEventListener('beforeunload', () => this.save());

    // Save when the tab becomes hidden (mobile switch, etc.)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.save();
      }
    });
  }
}
