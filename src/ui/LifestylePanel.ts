/**
 * LifestylePanel — Categorized luxury item shop with sub-navigation
 * and a Canvas-based Trophy Room.
 */

import { EventBus, GameEvents } from '../core/EventBus';
import { LuxuryItemLive, LifestyleCategory, CATEGORIES } from '../core/LifestyleManager';

export class LifestylePanel {
  private bus: EventBus;
  private container: HTMLElement;
  private items: LuxuryItemLive[] = [];
  private currentBalance = 0;
  private activeCategory: LifestyleCategory = 'tech';
  private onBuyCallback: ((id: string) => void) | null = null;

  constructor(parent: HTMLElement) {
    this.bus = EventBus.getInstance();
    this.container = document.createElement('section');
    this.container.className = 'lifestyle-panel';
    parent.appendChild(this.container);
    this.subscribe();
  }

  public onBuy(cb: (id: string) => void): void {
    this.onBuyCallback = cb;
  }

  public setItems(items: LuxuryItemLive[]): void {
    this.items = items;
    this.renderAll();
  }

  /* ── Subscriptions ──────────────────────────────────────── */

  private subscribe(): void {
    this.bus.on(GameEvents.BALANCE_CHANGED, (balance: number) => {
      this.currentBalance = balance;
      this.updateButtons();
    });

    this.bus.on(GameEvents.LIFESTYLE_PURCHASED, () => {
      this.renderAll();
    });
  }

  /* ── Rendering ──────────────────────────────────────────── */

  private renderAll(): void {
    const owned = this.items.filter(i => i.owned > 0).length;
    const total = this.items.length;
    const catItems = this.items.filter(i => i.category === this.activeCategory);

    this.container.innerHTML = `
      <div class="lifestyle-header">
        <span class="lifestyle-icon">💎</span>
        <span class="lifestyle-title">LIFESTYLE & TROPHIES</span>
        <span class="lifestyle-counter">${owned}/${total}</span>
      </div>

      <div class="trophy-room">
        <div class="trophy-room-title">TROPHY ROOM</div>
        <canvas id="trophy-canvas" class="trophy-canvas" width="680" height="130"></canvas>
      </div>

      <div class="ls-multiplier-bar">
        ${this.renderMultiplierBar()}
      </div>

      <nav class="ls-cat-nav">
        ${CATEGORIES.map(c => {
          const catOwned = this.items.filter(i => i.category === c.id && i.owned > 0).length;
          const catTotal = this.items.filter(i => i.category === c.id).length;
          const isActive = c.id === this.activeCategory;
          return `
            <button class="ls-cat-btn ${isActive ? 'active' : ''}" data-cat="${c.id}">
              <span class="ls-cat-icon">${c.icon}</span>
              <span class="ls-cat-label">${c.label}</span>
              <span class="ls-cat-count">${catOwned}/${catTotal}</span>
            </button>
          `;
        }).join('')}
      </nav>

      <div class="lifestyle-list">
        ${catItems.map(i => this.renderItem(i)).join('')}
      </div>
    `;

    this.drawTrophyRoom();
    this.bindEvents();
    this.updateButtons();
  }

  private renderMultiplierBar(): string {
    let click = 0, passive = 0, cost = 0;
    for (const item of this.items) {
      if (item.owned === 0) continue;
      if (item.type === 'click')   click += item.value * item.owned;
      if (item.type === 'passive') passive += item.value * item.owned;
      if (item.type === 'cost')    cost += item.value * item.owned;
    }

    return `
      <div class="ls-mult-pill click">
        <span class="ls-mult-label">Click</span>
        <span class="ls-mult-value">+${Math.round(click * 100)}%</span>
      </div>
      <div class="ls-mult-pill passive">
        <span class="ls-mult-label">Passive</span>
        <span class="ls-mult-value">+${Math.round(passive * 100)}%</span>
      </div>
      <div class="ls-mult-pill cost">
        <span class="ls-mult-label">Costs</span>
        <span class="ls-mult-value">${Math.round(cost * 100)}%</span>
      </div>
    `;
  }

  private renderItem(item: LuxuryItemLive): string {
    const canBuy = this.currentBalance >= item.currentCost;
    const isOwned = item.owned > 0;
    const typeTag = item.type === 'click' ? 'CLICK'
                  : item.type === 'passive' ? 'PASSIVE'
                  : 'COST';
    const tagClass = item.type;

    return `
      <div class="lifestyle-item ${isOwned ? 'owned' : ''}">
        <div class="ls-icon-wrap">
          <span class="ls-icon">${item.icon}</span>
        </div>
        <div class="ls-info">
          <div class="ls-name-row">
            <span class="ls-name">${item.name}</span>
            <span class="ls-type-tag ${tagClass}">${typeTag}</span>
            ${isOwned ? `<span class="ls-owned-count">x${item.owned}</span>` : ''}
          </div>
          <div class="ls-desc">${item.desc} per item</div>
        </div>
        <div class="ls-action">
          <button id="ls-buy-${item.id}" class="ls-btn ${canBuy ? '' : 'disabled'}">
            ${isOwned ? 'Buy Another' : 'Buy'} $${this.fmt(item.currentCost)}
          </button>
        </div>
      </div>
    `;
  }

  private updateButtons(): void {
    for (const item of this.items) {
      const btn = document.getElementById(`ls-buy-${item.id}`);
      if (!btn) continue;

      if (this.currentBalance >= item.currentCost) {
        btn.classList.remove('disabled');
      } else {
        btn.classList.add('disabled');
      }
    }
  }

  /* ── Canvas Trophy Room ─────────────────────────────────── */

  private drawTrophyRoom(): void {
    const canvas = document.getElementById('trophy-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 680;
    const h = 130;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Draw wooden shelf
    const shelfGrad = ctx.createLinearGradient(0, h - 28, 0, h);
    shelfGrad.addColorStop(0, 'rgba(139, 90, 43, 0.5)');
    shelfGrad.addColorStop(1, 'rgba(80, 50, 20, 0.6)');
    ctx.fillStyle = shelfGrad;
    ctx.beginPath();
    ctx.roundRect(8, h - 28, w - 16, 22, 4);
    ctx.fill();

    // Shelf highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(12, h - 28, w - 24, 3);

    // Draw items grouped by category (only show active category's 10 items)
    const activeItems = this.items.filter(i => i.category === this.activeCategory);
    const totalSlots = activeItems.length;
    const slotWidth = (w - 20) / totalSlots;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    activeItems.forEach((item, index) => {
      const x = 10 + slotWidth * index + slotWidth / 2;
      const y = h - 55;

      if (item.owned > 0) {
        // Glow aura
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 32);
        gradient.addColorStop(0, 'rgba(245, 197, 66, 0.35)');
        gradient.addColorStop(0.6, 'rgba(245, 197, 66, 0.08)');
        gradient.addColorStop(1, 'rgba(245, 197, 66, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 32, 0, Math.PI * 2);
        ctx.fill();

        // Icon
        ctx.globalAlpha = 1.0;
        ctx.font = '24px Arial'; // Slightly smaller to fit 10
        ctx.fillText(item.icon, x, y);

        // Tiny label below
        ctx.font = '8px Inter, sans-serif';
        ctx.fillStyle = 'rgba(245, 197, 66, 0.7)';
        // Try to show first word or a short version
        const shortName = item.name.split(' ')[0];
        ctx.fillText(shortName, x, y + 24);
        
        // Count badge if > 1
        if (item.owned > 1) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.font = '10px Inter, sans-serif';
          ctx.fillText(`x${item.owned}`, x, y - 24);
        }
      } else {
        // Locked silhouette
        ctx.globalAlpha = 0.12;
        ctx.font = '22px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('?', x, y);
      }
    });

    ctx.globalAlpha = 1.0;
  }

  /* ── Event Binding ──────────────────────────────────────── */

  private bindEvents(): void {
    // Category navigation
    for (const cat of CATEGORIES) {
      const btn = this.container.querySelector(`[data-cat="${cat.id}"]`);
      btn?.addEventListener('click', () => {
        this.activeCategory = cat.id;
        this.renderAll();
      });
    }

    // Buy buttons
    for (const item of this.items) {
      const btn = document.getElementById(`ls-buy-${item.id}`);
      if (btn) {
        btn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          if (this.currentBalance >= item.currentCost) {
            this.onBuyCallback?.(item.id);
          }
        });
      }
    }
  }

  /* ── Helpers ────────────────────────────────────────────── */

  private fmt(n: number): string {
    if (n >= 1_000_000_000_000) return (n / 1_000_000_000_000).toFixed(1) + 'T';
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return Math.floor(n).toLocaleString();
  }
}
