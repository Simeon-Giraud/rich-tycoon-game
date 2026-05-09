/**
 * MainView — Professional banking dashboard layout.
 * Sidebar navigation + main content area.
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
      <div class="dashboard">
        <!-- Sidebar -->
        <aside class="sidebar">
          <div class="sidebar-logo">
            <span class="sidebar-logo-icon">🏦</span>
            <span class="sidebar-logo-text">TYCOON<span class="logo-accent">BANK</span></span>
          </div>

          <nav class="sidebar-nav">
            <button class="nav-item active" id="tab-empire" data-tab="empire">
              <span class="nav-icon">🏢</span>
              <span class="nav-label">Empire</span>
            </button>
            <button class="nav-item" id="tab-stocks" data-tab="stocks">
              <span class="nav-icon">📈</span>
              <span class="nav-label">Markets</span>
            </button>
            <button class="nav-item" id="tab-lifestyle" data-tab="lifestyle">
              <span class="nav-icon">💎</span>
              <span class="nav-label">Lifestyle</span>
            </button>
          </nav>

          <div class="sidebar-footer">
            <div class="save-indicator" id="save-indicator">
              <span class="save-dot"></span>
              <span>Saved</span>
            </div>
          </div>
        </aside>

        <!-- Main Content -->
        <main class="main-content">
          <!-- Top Metrics Bar -->
          <header class="metrics-bar">
            <div class="metric-primary">
              <div class="metric-label">NET WORTH</div>
              <div class="metric-value" id="balance-display">$0</div>
            </div>
            <div class="metric-divider"></div>
            <div class="metric-item">
              <div class="metric-label">INCOME/SEC</div>
              <div class="metric-value green" id="passive-display">$0</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">CLICK POWER</div>
              <div class="metric-value" id="click-power-display">$1</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">TOTAL CLICKS</div>
              <div class="metric-value" id="total-clicks-display">0</div>
            </div>
          </header>

          <!-- Empire tab content -->
          <div class="tab-content" id="content-empire">
            <div class="empire-grid">
              <section class="click-section">
                <div class="particle-container" id="particle-container"></div>
                <button class="click-btn" id="click-btn">
                  <span class="click-btn-icon">💰</span>
                  <span class="click-btn-label">EARN</span>
                  <span class="click-btn-power" id="click-power-stat">+$1</span>
                </button>
              </section>
              <div id="shop-anchor"></div>
            </div>
          </div>

          <!-- Stocks tab content -->
          <div class="tab-content" id="content-stocks" style="display:none"></div>

          <!-- Lifestyle tab content -->
          <div class="tab-content" id="content-lifestyle" style="display:none"></div>

          <!-- News ticker -->
          <div id="news-anchor"></div>
        </main>
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

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tab}`)?.classList.add('active');

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
    this.clickPowerEl.textContent = `$${this.formatNumber(state.clickPower)}`;
    this.passiveEl.textContent = `$${this.formatNumber(state.passiveIncome)}`;
    this.totalClicksEl.textContent = this.formatNumber(state.totalClicks);
    const cpStat = document.getElementById('click-power-stat');
    if (cpStat) cpStat.textContent = `+$${this.formatNumber(state.clickPower)}`;
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
