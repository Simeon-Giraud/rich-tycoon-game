/**
 * EconomyEngine — Pure game-logic class. Zero DOM imports.
 *
 * Responsibilities:
 *  • Track balance, click power, passive income rate
 *  • Process clicks & passive ticks
 *  • Emit events via EventBus so the UI can react
 *  • Provide a serializable snapshot for persistence
 *
 * Core Loop (from game-design skill):
 *  ACTION  → Player clicks
 *  FEEDBACK → Balance updates instantly
 *  REWARD  → Numbers go up, particles fly
 *  REPEAT
 */

import { EventBus, GameEvents } from './EventBus';

export interface EconomyState {
  balance: number;
  totalEarned: number;
  totalClicks: number;
  clickPower: number;
  passiveIncome: number; // per second
}

const DEFAULT_STATE: EconomyState = {
  balance: 0,
  totalEarned: 0,
  totalClicks: 0,
  clickPower: 1,
  passiveIncome: 0,
};

export class EconomyEngine {
  private state: EconomyState;
  private bus: EventBus;
  private tickInterval: number | null = null;
  private readonly TICK_MS = 1_000; // 1-second passive income tick
  private globalClickMultiplier: number = 1;

  constructor(savedState?: Partial<EconomyState>) {
    this.bus = EventBus.getInstance();
    this.state = { ...DEFAULT_STATE, ...savedState };
  }

  /* ── Public API ─────────────────────────────────────────── */

  public setClickMultiplier(mult: number): void {
    this.globalClickMultiplier = mult;
    this.bus.emit(GameEvents.STATS_UPDATED, this.getSnapshot());
  }

  /** Process a player click. Returns the amount earned. */
  public click(): number {
    const earned = this.state.clickPower * this.globalClickMultiplier;
    this.state.balance += earned;
    this.state.totalEarned += earned;
    this.state.totalClicks += 1;

    this.bus.emit(GameEvents.CLICK_EARNED, earned, this.state.balance);
    this.bus.emit(GameEvents.BALANCE_CHANGED, this.state.balance);
    this.bus.emit(GameEvents.STATS_UPDATED, this.getSnapshot());

    return earned;
  }

  /** Start the passive-income ticker. */
  public startPassiveTick(): void {
    if (this.tickInterval !== null) return;

    this.tickInterval = window.setInterval(() => {
      if (this.state.passiveIncome <= 0) return;

      this.state.balance += this.state.passiveIncome;
      this.state.totalEarned += this.state.passiveIncome;

      this.bus.emit(GameEvents.PASSIVE_TICK, this.state.passiveIncome, this.state.balance);
      this.bus.emit(GameEvents.BALANCE_CHANGED, this.state.balance);
      this.bus.emit(GameEvents.STATS_UPDATED, this.getSnapshot());
    }, this.TICK_MS);
  }

  /** Stop the passive-income ticker (e.g. during ads or tab-hidden). */
  public stopPassiveTick(): void {
    if (this.tickInterval !== null) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  /** Add to click power (upgrades). */
  public upgradeClickPower(amount: number): void {
    this.state.clickPower += amount;
    this.bus.emit(GameEvents.STATS_UPDATED, this.getSnapshot());
  }

  /** Add to passive income (upgrades). */
  public upgradePassiveIncome(amount: number): void {
    this.state.passiveIncome += amount;
    this.bus.emit(GameEvents.STATS_UPDATED, this.getSnapshot());
  }

  /** Set passive income to an absolute value (called by BusinessManager). */
  public setPassiveIncome(total: number): void {
    this.state.passiveIncome = total;
    this.bus.emit(GameEvents.STATS_UPDATED, this.getSnapshot());
  }

  /** Get the current balance. */
  public getBalance(): number {
    return this.state.balance;
  }

  /** Spend money. Returns true if the player can afford it. */
  public spend(cost: number): boolean {
    if (this.state.balance < cost) return false;
    this.state.balance -= cost;
    this.bus.emit(GameEvents.BALANCE_CHANGED, this.state.balance);
    this.bus.emit(GameEvents.STATS_UPDATED, this.getSnapshot());
    return true;
  }

  /** Return a plain-object snapshot for saving / UI reads. */
  public getSnapshot(): Readonly<EconomyState> {
    return { ...this.state };
  }

  /** Hydrate from a save file. */
  public loadState(saved: Partial<EconomyState>): void {
    this.state = { ...DEFAULT_STATE, ...saved };
    this.bus.emit(GameEvents.BALANCE_CHANGED, this.state.balance);
    this.bus.emit(GameEvents.STATS_UPDATED, this.getSnapshot());
  }
}
