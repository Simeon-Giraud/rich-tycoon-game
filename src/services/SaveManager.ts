/**
 * SaveManager — LocalStorage persistence with auto-save.
 *
 * Saves the EconomyState snapshot every N seconds and on
 * window beforeunload / visibilitychange so progress is
 * never lost on refresh or tab close.
 */

import { EconomyEngine, EconomyState } from '../core/EconomyEngine';
import { EventBus, GameEvents } from '../core/EventBus';

const SAVE_KEY = 'billionaire_tycoon_save';
const AUTO_SAVE_MS = 15_000; // every 15 seconds

export class SaveManager {
  private engine: EconomyEngine;
  private bus: EventBus;
  private autoSaveTimer: number | null = null;

  constructor(engine: EconomyEngine) {
    this.engine = engine;
    this.bus = EventBus.getInstance();
    this.bindBrowserEvents();
  }

  /* ── Public API ─────────────────────────────────────────── */

  /** Save the current state to localStorage. */
  public save(): void {
    try {
      const snapshot = this.engine.getSnapshot();
      const payload = JSON.stringify({
        version: 1,
        timestamp: Date.now(),
        state: snapshot,
      });
      localStorage.setItem(SAVE_KEY, payload);
      this.bus.emit(GameEvents.GAME_SAVED);
      console.log('[SaveManager] Game saved');
    } catch (err) {
      console.error('[SaveManager] Save failed:', err);
    }
  }

  /** Load state from localStorage into the engine. Returns true if a save was found. */
  public load(): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;

      const parsed = JSON.parse(raw);
      if (!parsed?.state) return false;

      // Calculate offline earnings
      const offlineSeconds = Math.floor((Date.now() - (parsed.timestamp ?? 0)) / 1000);
      const offlineState = parsed.state as EconomyState;

      if (offlineSeconds > 0 && offlineState.passiveIncome > 0) {
        // Cap offline earnings at 2 hours to prevent absurd numbers
        const cappedSeconds = Math.min(offlineSeconds, 7200);
        const offlineEarnings = offlineState.passiveIncome * cappedSeconds;
        offlineState.balance += offlineEarnings;
        offlineState.totalEarned += offlineEarnings;
        console.log(`[SaveManager] Offline for ${offlineSeconds}s → earned $${offlineEarnings.toFixed(0)}`);
      }

      this.engine.loadState(offlineState);
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
