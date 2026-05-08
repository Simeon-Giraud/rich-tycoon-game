/**
 * MainView — All DOM interaction lives here.
 *
 * Subscribes to EventBus for state changes.
 * Renders the clicker UI with juicy visual feedback:
 *  • Floating "+$X" particles on click
 *  • Button scale pulse animation
 *  • Smooth counter roll-up via CSS transitions
 *  • Money particle burst effect
 */

import { EventBus, GameEvents } from '../core/EventBus';
import { EconomyState } from '../core/EconomyEngine';

export class MainView {
  private bus: EventBus;
  private app: HTMLElement;
  private balanceEl!: HTMLElement;
  private clickPowerEl!: HTMLElement;
  private passiveEl!: HTMLElement;
  private totalClicksEl!: HTMLElement;
  private clickBtn!: HTMLButtonElement;
  private particleContainer!: HTMLElement;

  private onClickCallback: (() => void) | null = null;

  constructor(appRoot: HTMLElement) {
    this.bus = EventBus.getInstance();
    this.app = appRoot;
    this.render();
    this.bindEvents();
    this.subscribe();
  }

  /** Register the click handler (wired by main.ts to call engine.click). */
  public onClickEarn(cb: () => void): void {
    this.onClickCallback = cb;
  }

  /* ── Render ─────────────────────────────────────────────── */

  private render(): void {
    this.app.innerHTML = `
      <div class="game-container">
        <!-- Top bar -->
        <header class="top-bar">
          <div class="logo">
            <span class="logo-icon">💰</span>
            <span class="logo-text">Billionaire Tycoon</span>
          </div>
          <div class="save-indicator" id="save-indicator">
            <span class="save-dot"></span>
            <span>Saved</span>
          </div>
        </header>

        <!-- Balance display -->
        <section class="balance-section">
          <div class="balance-label">YOUR FORTUNE</div>
          <div class="balance-amount" id="balance-display">$0</div>
          <div class="balance-sub">
            <span class="stat-pill" id="passive-display">
              <span class="stat-icon">⏱</span> $0/sec
            </span>
          </div>
        </section>

        <!-- Click area -->
        <section class="click-section">
          <div class="particle-container" id="particle-container"></div>
          <button class="click-btn" id="click-btn">
            <span class="click-btn-icon">🤑</span>
            <span class="click-btn-label">TAP TO EARN</span>
            <span class="click-btn-power" id="click-power-display">+$1 per click</span>
          </button>
        </section>

        <!-- Stats bar -->
        <section class="stats-bar">
          <div class="stat-card">
            <div class="stat-value" id="total-clicks-display">0</div>
            <div class="stat-label">Total Clicks</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="click-power-stat">1</div>
            <div class="stat-label">Click Power</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="passive-stat">0</div>
            <div class="stat-label">$/Second</div>
          </div>
        </section>
      </div>
    `;

    // Cache DOM refs
    this.balanceEl = document.getElementById('balance-display')!;
    this.clickPowerEl = document.getElementById('click-power-display')!;
    this.passiveEl = document.getElementById('passive-display')!;
    this.totalClicksEl = document.getElementById('total-clicks-display')!;
    this.clickBtn = document.getElementById('click-btn') as HTMLButtonElement;
    this.particleContainer = document.getElementById('particle-container')!;
  }

  /* ── Event Binding ──────────────────────────────────────── */

  private bindEvents(): void {
    this.clickBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.onClickCallback?.();
    });

    // Prevent context menu on long-press (mobile)
    this.clickBtn.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /* ── EventBus Subscriptions ─────────────────────────────── */

  private subscribe(): void {
    this.bus.on(GameEvents.CLICK_EARNED, (earned: number, _balance: number) => {
      this.spawnClickParticle(earned);
      this.pulseButton();
    });

    this.bus.on(GameEvents.BALANCE_CHANGED, (balance: number) => {
      this.updateBalance(balance);
    });

    this.bus.on(GameEvents.STATS_UPDATED, (state: EconomyState) => {
      this.updateStats(state);
    });

    this.bus.on(GameEvents.PASSIVE_TICK, (income: number, _balance: number) => {
      this.spawnPassiveParticle(income);
    });

    this.bus.on(GameEvents.GAME_SAVED, () => {
      this.flashSaveIndicator();
    });
  }

  /* ── UI Updates ─────────────────────────────────────────── */

  private updateBalance(balance: number): void {
    this.balanceEl.textContent = `$${this.formatNumber(balance)}`;
  }

  private updateStats(state: EconomyState): void {
    this.clickPowerEl.textContent = `+$${this.formatNumber(state.clickPower)} per click`;
    this.passiveEl.innerHTML = `<span class="stat-icon">⏱</span> $${this.formatNumber(state.passiveIncome)}/sec`;
    this.totalClicksEl.textContent = this.formatNumber(state.totalClicks);
    (document.getElementById('click-power-stat') as HTMLElement).textContent = this.formatNumber(state.clickPower);
    (document.getElementById('passive-stat') as HTMLElement).textContent = this.formatNumber(state.passiveIncome);
  }

  /* ── Juicy Visual Feedback ──────────────────────────────── */

  /** Floating "+$X" text that rises and fades out. */
  private spawnClickParticle(amount: number): void {
    const particle = document.createElement('div');
    particle.className = 'click-particle';
    particle.textContent = `+$${this.formatNumber(amount)}`;

    // Randomise horizontal offset for visual variety
    const offsetX = (Math.random() - 0.5) * 120;
    particle.style.setProperty('--offset-x', `${offsetX}px`);

    this.particleContainer.appendChild(particle);

    // Remove after animation completes (800ms)
    setTimeout(() => particle.remove(), 800);
  }

  /** Subtle floating indicator for passive income ticks. */
  private spawnPassiveParticle(amount: number): void {
    if (amount <= 0) return;
    const particle = document.createElement('div');
    particle.className = 'passive-particle';
    particle.textContent = `+$${this.formatNumber(amount)}`;

    const offsetX = (Math.random() - 0.5) * 200;
    particle.style.setProperty('--offset-x', `${offsetX}px`);

    this.particleContainer.appendChild(particle);
    setTimeout(() => particle.remove(), 1200);
  }

  /** Button scale punch on press. */
  private pulseButton(): void {
    this.clickBtn.classList.add('click-pulse');
    // Remove class after animation so it can replay
    setTimeout(() => this.clickBtn.classList.remove('click-pulse'), 150);
  }

  /** Brief flash on the save indicator. */
  private flashSaveIndicator(): void {
    const el = document.getElementById('save-indicator');
    if (!el) return;
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 1000);
  }

  /* ── Helpers ────────────────────────────────────────────── */

  private formatNumber(n: number): string {
    if (n >= 1_000_000_000_000) return (n / 1_000_000_000_000).toFixed(2) + 'T';
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return Math.floor(n).toLocaleString();
  }
}
