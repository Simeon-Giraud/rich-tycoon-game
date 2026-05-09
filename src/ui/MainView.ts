/**
 * MainView — All DOM interaction lives here.
 *
 * Now supports tab navigation between Empire (clicker+shop) and Stocks.
 * Subscribes to EventBus for state changes.
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
  private activeTab: 'empire' | 'stocks' | 'lifestyle' = 'empire';

  constructor(appRoot: HTMLElement) {
    this.bus = EventBus.getInstance();
    this.app = appRoot;
    this.render();
    this.bindEvents();
    this.subscribe();
  }

  public onClickEarn(cb: () => void): void {
    this.onClickCallback = cb;
  }

  /* ── Render ─────────────────────────────────────────────── */

  private render(): void {
    this.app.innerHTML = `
      <div class="game-container">
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

        <!-- Balance (always visible) -->
        <section class="balance-section">
          <div class="balance-label">YOUR FORTUNE</div>
          <div class="balance-amount" id="balance-display">$0</div>
          <div class="balance-sub">
            <span class="stat-pill" id="passive-display">
              <span class="stat-icon">⏱</span> $0/sec
            </span>
          </div>
        </section>

        <!-- Tab bar -->
        <nav class="tab-bar">
          <button class="tab-btn active" id="tab-empire" data-tab="empire">🏢 Empire</button>
          <button class="tab-btn" id="tab-stocks" data-tab="stocks">📈 Stocks</button>
          <button class="tab-btn" id="tab-lifestyle" data-tab="lifestyle">💎 Lifestyle</button>
        </nav>

        <!-- Empire tab content -->
        <div class="tab-content" id="content-empire">
          <section class="click-section">
            <div class="particle-container" id="particle-container"></div>
            <button class="click-btn" id="click-btn">
              <span class="click-btn-icon">🤑</span>
              <span class="click-btn-label">TAP TO EARN</span>
              <span class="click-btn-power" id="click-power-display">+$1 per click</span>
            </button>
          </section>
          <div id="shop-anchor"></div>
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

        <!-- Stocks tab content (StocksPanel injects here) -->
        <div class="tab-content" id="content-stocks" style="display:none"></div>

        <!-- Lifestyle tab content (LifestylePanel injects here) -->
        <div class="tab-content" id="content-lifestyle" style="display:none"></div>

        <!-- News ticker (always visible) -->
        <div id="news-anchor"></div>
      </div>
    `;

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
    this.clickBtn.addEventListener('contextmenu', (e) => e.preventDefault());

    // Tab switching
    document.getElementById('tab-empire')?.addEventListener('click', () => this.switchTab('empire'));
    document.getElementById('tab-stocks')?.addEventListener('click', () => this.switchTab('stocks'));
    document.getElementById('tab-lifestyle')?.addEventListener('click', () => this.switchTab('lifestyle'));
  }

  private switchTab(tab: 'empire' | 'stocks' | 'lifestyle'): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;

    // Toggle active class on tab buttons
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tab}`)?.classList.add('active');

    // Toggle tab content visibility
    document.getElementById('content-empire')!.style.display = tab === 'empire' ? '' : 'none';
    document.getElementById('content-stocks')!.style.display = tab === 'stocks' ? '' : 'none';
    document.getElementById('content-lifestyle')!.style.display = tab === 'lifestyle' ? '' : 'none';

    this.bus.emit(GameEvents.TAB_CHANGED, tab);
  }

  /* ── EventBus Subscriptions ─────────────────────────────── */

  private subscribe(): void {
    this.bus.on(GameEvents.CLICK_EARNED, (earned: number) => {
      this.spawnClickParticle(earned);
      this.pulseButton();
    });

    this.bus.on(GameEvents.BALANCE_CHANGED, (balance: number) => {
      this.updateBalance(balance);
    });

    this.bus.on(GameEvents.STATS_UPDATED, (state: EconomyState) => {
      this.updateStats(state);
    });

    this.bus.on(GameEvents.PASSIVE_TICK, (income: number) => {
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
    const cpStat = document.getElementById('click-power-stat');
    const psStat = document.getElementById('passive-stat');
    if (cpStat) cpStat.textContent = this.formatNumber(state.clickPower);
    if (psStat) psStat.textContent = this.formatNumber(state.passiveIncome);
  }

  /* ── Juicy Visual Feedback ──────────────────────────────── */

  private spawnClickParticle(amount: number): void {
    const particle = document.createElement('div');
    particle.className = 'click-particle';
    particle.textContent = `+$${this.formatNumber(amount)}`;
    const offsetX = (Math.random() - 0.5) * 120;
    particle.style.setProperty('--offset-x', `${offsetX}px`);
    this.particleContainer.appendChild(particle);
    setTimeout(() => particle.remove(), 800);
  }

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

  private pulseButton(): void {
    this.clickBtn.classList.add('click-pulse');
    setTimeout(() => this.clickBtn.classList.remove('click-pulse'), 150);
  }

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
