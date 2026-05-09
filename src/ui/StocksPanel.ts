/**
 * StocksPanel — Premium stock market UI (desktop-optimized).
 *
 * Features:
 *  • Portfolio summary bar (value, total P&L, # holdings)
 *  • Expandable stock rows — click to expand detailed info
 *  • Per-stock P&L with color-coded gain/loss
 *  • Buy 1 / Buy 10 / Sell 1 / Sell All buttons
 *  • Canvas sparkline with gradient fill
 *  • Sector badges
 *  • Desktop-friendly layout
 */

import { EventBus, GameEvents } from '../core/EventBus';
import { StockLive } from '../core/StockMarket';

interface PortfolioEntry {
  id: string;
  shares: number;
  avgCost: number;
}

interface StockWithPnL extends StockLive {
  avgCost: number;
  pnl: number;
  pnlPct: number;
  marketValue: number;
}

export class StocksPanel {
  private bus: EventBus;
  private container: HTMLElement;
  private stocks: StockLive[] = [];
  private currentBalance = 0;
  private expandedId: string | null = null;
  private isNewlyExpanded = false;

  private onBuyCallback: ((id: string, qty: number) => void) | null = null;
  private onSellCallback: ((id: string, qty: number) => void) | null = null;
  private onSellAllCallback: ((id: string) => void) | null = null;
  private getPortfolioEntry: ((id: string) => PortfolioEntry | null) | null = null;
  private getTotalPnL: (() => number) | null = null;
  private getPortfolioValue: (() => number) | null = null;

  constructor(parent: HTMLElement) {
    this.bus = EventBus.getInstance();
    this.container = document.createElement('section');
    this.container.className = 'stocks-panel';
    parent.appendChild(this.container);
    this.subscribe();
  }

  public onBuy(cb: (id: string, qty: number) => void): void { this.onBuyCallback = cb; }
  public onSell(cb: (id: string, qty: number) => void): void { this.onSellCallback = cb; }
  public onSellAll(cb: (id: string) => void): void { this.onSellAllCallback = cb; }
  public setPortfolioAccessors(
    getEntry: (id: string) => PortfolioEntry | null,
    getPnL: () => number,
    getValue: () => number,
  ): void {
    this.getPortfolioEntry = getEntry;
    this.getTotalPnL = getPnL;
    this.getPortfolioValue = getValue;
  }

  public setStocks(stocks: StockLive[]): void {
    this.stocks = stocks;
    this.renderAll();
  }

  /* ── Subscriptions ──────────────────────────────────────── */

  private subscribe(): void {
    this.bus.on(GameEvents.STOCKS_UPDATED, (stocks: StockLive[]) => {
      this.stocks = stocks;
      this.renderAll();
    });

    this.bus.on(GameEvents.BALANCE_CHANGED, (balance: number) => {
      this.currentBalance = balance;
    });
  }

  /* ── Enrich stocks with P&L data ────────────────────────── */

  private enrichStocks(): StockWithPnL[] {
    return this.stocks.map(s => {
      const entry = this.getPortfolioEntry?.(s.id);
      const shares = entry?.shares ?? 0;
      const avgCost = entry?.avgCost ?? 0;
      const marketValue = s.price * shares;
      const costBasis = avgCost * shares;
      const pnl = shares > 0 ? marketValue - costBasis : 0;
      const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
      return { ...s, sharesOwned: shares, avgCost, pnl, pnlPct, marketValue };
    });
  }

  /* ── Rendering ──────────────────────────────────────────── */

  private renderAll(): void {
    const enriched = this.enrichStocks();
    const totalValue = this.getPortfolioValue?.() ?? 0;
    const totalPnL = this.getTotalPnL?.() ?? 0;
    const holdings = enriched.filter(s => s.sharesOwned > 0).length;
    const pnlClass = totalPnL >= 0 ? 'up' : 'down';
    const pnlSign = totalPnL >= 0 ? '+' : '';

    this.container.innerHTML = `
      <div class="stocks-header-bar">
        <div class="stocks-header-left">
          <span class="stocks-icon">📈</span>
          <span class="stocks-title">STOCK MARKET</span>
        </div>
      </div>

      <div class="portfolio-summary">
        <div class="port-stat">
          <div class="port-stat-label">Portfolio Value</div>
          <div class="port-stat-value gold">$${this.fmt(totalValue)}</div>
        </div>
        <div class="port-stat">
          <div class="port-stat-label">Unrealized P&L</div>
          <div class="port-stat-value ${pnlClass}">${pnlSign}$${this.fmt(Math.abs(totalPnL))}</div>
        </div>
        <div class="port-stat">
          <div class="port-stat-label">Holdings</div>
          <div class="port-stat-value">${holdings}</div>
        </div>
        <div class="port-stat">
          <div class="port-stat-label">Cash</div>
          <div class="port-stat-value gold">$${this.fmt(this.currentBalance)}</div>
        </div>
      </div>

      <div class="stocks-table-head">
        <span class="sth-ticker">Stock</span>
        <span class="sth-chart">Chart</span>
        <span class="sth-price">Price</span>
        <span class="sth-change">Change</span>
        <span class="sth-owned">Owned</span>
        <span class="sth-pnl">P&L</span>
        <span class="sth-actions">Actions</span>
      </div>

      <div class="stocks-list">
        ${enriched.map(s => this.renderRow(s)).join('')}
      </div>
    `;

    // Draw sparklines
    for (const stock of enriched) {
      const canvas = document.getElementById(`spark-${stock.id}`) as HTMLCanvasElement | null;
      if (canvas) this.drawSparkline(canvas, stock);
    }

    // Bind events
    this.bindRowEvents(enriched);

    // Reset newly expanded flag after rendering
    this.isNewlyExpanded = false;
  }

  private renderRow(s: StockWithPnL): string {
    const isUp = s.change >= 0;
    const changeClass = isUp ? 'up' : 'down';
    const arrow = isUp ? '▲' : '▼';
    const canBuy = this.currentBalance >= s.price;
    const isExpanded = this.expandedId === s.id;
    const hasPnL = s.sharesOwned > 0;
    const pnlClass = s.pnl >= 0 ? 'up' : 'down';
    const pnlSign = s.pnl >= 0 ? '+' : '';

    const sectorColors: Record<string, string> = {
      tech: '#3b82f6', finance: '#f59e0b', energy: '#22d68a',
      entertainment: '#a855f7', food: '#f97316',
    };
    const sectorColor = sectorColors[s.sector] ?? '#7a8bb5';

    return `
      <div class="stock-row-wrap ${isExpanded ? 'expanded' : ''}" id="row-${s.id}">
        <div class="stock-row-main" id="toggle-${s.id}">
          <div class="stock-ticker-col">
            <span class="stock-ticker">${s.ticker}</span>
            <span class="stock-name-text">${s.name}</span>
            <span class="stock-sector-badge" style="color:${sectorColor};border-color:${sectorColor}33;background:${sectorColor}11">${s.sector}</span>
          </div>
          <div class="stock-chart-col">
            <canvas id="spark-${s.id}" class="sparkline-canvas" width="100" height="32"></canvas>
          </div>
          <div class="stock-price-col">
            <span class="stock-price">$${this.fmt(s.price)}</span>
          </div>
          <div class="stock-change-col">
            <span class="stock-change ${changeClass}">${arrow} ${Math.abs(s.changePct).toFixed(1)}%</span>
          </div>
          <div class="stock-owned-col">
            ${s.sharesOwned > 0
              ? `<span class="stock-owned-num">${s.sharesOwned}</span>`
              : `<span class="stock-owned-zero">—</span>`}
          </div>
          <div class="stock-pnl-col">
            ${hasPnL
              ? `<span class="stock-pnl ${pnlClass}">${pnlSign}$${this.fmt(Math.abs(s.pnl))}</span>`
              : `<span class="stock-pnl-empty">—</span>`}
          </div>
          <div class="stock-quick-actions">
            <button id="qbuy-${s.id}" class="stock-btn buy ${canBuy ? '' : 'disabled'}">Buy</button>
            <button id="qsell-${s.id}" class="stock-btn sell ${s.sharesOwned > 0 ? '' : 'disabled'}">Sell</button>
          </div>
        </div>

        ${isExpanded ? this.renderExpanded(s) : ''}
      </div>
    `;
  }

  private renderExpanded(s: StockWithPnL): string {
    const canBuy1 = this.currentBalance >= s.price;
    const canBuy10 = this.currentBalance >= s.price * 10;
    const maxQty = Math.floor(this.currentBalance / s.price);
    const canBuyMax = maxQty > 0;
    const hasPnL = s.sharesOwned > 0;
    const pnlClass = s.pnl >= 0 ? 'up' : 'down';
    const pnlSign = s.pnl >= 0 ? '+' : '';
    const animClass = this.isNewlyExpanded ? '' : 'no-animation';

    return `
      <div class="stock-expanded ${animClass}">
        <div class="stock-detail-grid">
          <div class="stock-detail-item">
            <span class="sd-label">Current Price</span>
            <span class="sd-value">$${this.fmt(s.price)}</span>
          </div>
          <div class="stock-detail-item">
            <span class="sd-label">Avg Cost</span>
            <span class="sd-value">${s.sharesOwned > 0 ? '$' + this.fmt(s.avgCost) : '—'}</span>
          </div>
          <div class="stock-detail-item">
            <span class="sd-label">Shares Owned</span>
            <span class="sd-value">${s.sharesOwned}</span>
          </div>
          <div class="stock-detail-item">
            <span class="sd-label">Market Value</span>
            <span class="sd-value gold">${s.sharesOwned > 0 ? '$' + this.fmt(s.marketValue) : '—'}</span>
          </div>
          <div class="stock-detail-item">
            <span class="sd-label">Unrealized P&L</span>
            <span class="sd-value ${hasPnL ? pnlClass : ''}">${hasPnL ? pnlSign + '$' + this.fmt(Math.abs(s.pnl)) : '—'}</span>
          </div>
          <div class="stock-detail-item">
            <span class="sd-label">P&L %</span>
            <span class="sd-value ${hasPnL ? pnlClass : ''}">${hasPnL ? pnlSign + s.pnlPct.toFixed(1) + '%' : '—'}</span>
          </div>
        </div>
        <div class="stock-expanded-actions">
          <button id="buy1-${s.id}" class="stock-action-btn buy ${canBuy1 ? '' : 'disabled'}">Buy ×1 — $${this.fmt(s.price)}</button>
          <button id="buy10-${s.id}" class="stock-action-btn buy ${canBuy10 ? '' : 'disabled'}">Buy ×10 — $${this.fmt(s.price * 10)}</button>
          <button id="buymax-${s.id}" class="stock-action-btn buy ${canBuyMax ? '' : 'disabled'}">Buy Max (×${maxQty})</button>
          <button id="sell1-${s.id}" class="stock-action-btn sell ${s.sharesOwned > 0 ? '' : 'disabled'}">Sell ×1</button>
          <button id="sellall-${s.id}" class="stock-action-btn sell-all ${s.sharesOwned > 1 ? '' : 'disabled'}">Sell All (${s.sharesOwned})</button>
        </div>
      </div>
    `;
  }

  /* ── Event Binding ──────────────────────────────────────── */

  private bindRowEvents(stocks: StockWithPnL[]): void {
    for (const s of stocks) {
      // Toggle expand on row click
      document.getElementById(`toggle-${s.id}`)?.addEventListener('click', (e) => {
        // Don't toggle if clicking a button
        if ((e.target as HTMLElement).closest('.stock-btn')) return;
        this.expandedId = this.expandedId === s.id ? null : s.id;
        if (this.expandedId) this.isNewlyExpanded = true;
        this.renderAll();
      });

      // Quick buy/sell (collapsed row)
      document.getElementById(`qbuy-${s.id}`)?.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        this.onBuyCallback?.(s.id, 1);
      });
      document.getElementById(`qsell-${s.id}`)?.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        this.onSellCallback?.(s.id, 1);
      });

      // Expanded actions
      document.getElementById(`buy1-${s.id}`)?.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.onBuyCallback?.(s.id, 1);
      });
      document.getElementById(`buy10-${s.id}`)?.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.onBuyCallback?.(s.id, 10);
      });
      document.getElementById(`buymax-${s.id}`)?.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const maxQty = Math.floor(this.currentBalance / s.price);
        if (maxQty > 0) this.onBuyCallback?.(s.id, maxQty);
      });
      document.getElementById(`sell1-${s.id}`)?.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.onSellCallback?.(s.id, 1);
      });
      document.getElementById(`sellall-${s.id}`)?.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.onSellAllCallback?.(s.id);
      });
    }
  }

  /* ── Canvas Sparkline ───────────────────────────────────── */

  private drawSparkline(canvas: HTMLCanvasElement, stock: StockLive): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width;
    const h = canvas.height;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const hist = stock.history;
    if (hist.length < 2) return;

    const min = Math.min(...hist);
    const max = Math.max(...hist);
    const range = max - min || 1;
    const stepX = w / (hist.length - 1);
    const pad = 3;

    const isUp = hist[hist.length - 1] >= hist[hist.length - 2];
    const color = isUp ? '#22d68a' : '#ef4444';

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, isUp ? 'rgba(34,214,138,0.15)' : 'rgba(239,68,68,0.15)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    const getY = (val: number) => h - pad - ((val - min) / range) * (h - pad * 2);

    ctx.beginPath();
    ctx.moveTo(0, getY(hist[0]));
    for (let i = 1; i < hist.length; i++) ctx.lineTo(i * stepX, getY(hist[i]));
    ctx.lineTo((hist.length - 1) * stepX, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(0, getY(hist[0]));
    for (let i = 1; i < hist.length; i++) ctx.lineTo(i * stepX, getY(hist[i]));
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Dot on the latest point
    const lastX = (hist.length - 1) * stepX;
    const lastY = getY(hist[hist.length - 1]);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  /* ── Helpers ────────────────────────────────────────────── */

  private fmt(n: number): string {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toFixed(2);
  }
}
