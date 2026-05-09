/**
 * ShopPanel — Scrollable business shop UI.
 *
 * Renders a list of businesses with buy buttons.
 * Buttons gray out when the player can't afford the item.
 * Subscribes to BALANCE_CHANGED to update affordability in real-time.
 * Subscribes to BUSINESSES_CHANGED for ownership / cost updates.
 */

import { EventBus, GameEvents } from '../core/EventBus';
import { BusinessView } from '../core/BusinessManager';

export class ShopPanel {
  private bus: EventBus;
  private container: HTMLElement;
  private businesses: BusinessView[] = [];
  private currentBalance = 0;
  private maxVisibleCount = 2; // Show at least 2 by default

  private onBuyCallback: ((bizId: string) => void) | null = null;

  constructor(parent: HTMLElement) {
    this.bus = EventBus.getInstance();
    this.container = document.createElement('section');
    this.container.className = 'shop-panel';
    parent.appendChild(this.container);
    this.subscribe();
  }

  /** Register the buy handler (wired by main.ts). */
  public onBuy(cb: (bizId: string) => void): void {
    this.onBuyCallback = cb;
  }

  /** Set the initial business list. */
  public setBusinesses(views: BusinessView[]): void {
    this.businesses = views;
    this.maxVisibleCount = Math.max(this.maxVisibleCount, this.calculateVisibleCount());
    this.renderAll();
  }

  /* ── EventBus Subscriptions ─────────────────────────────── */

  private subscribe(): void {
    this.bus.on(GameEvents.BALANCE_CHANGED, (balance: number) => {
      this.currentBalance = balance;
      
      const prevVisible = this.maxVisibleCount;
      this.maxVisibleCount = Math.max(this.maxVisibleCount, this.calculateVisibleCount());
      
      if (this.maxVisibleCount > prevVisible) {
        this.renderAll();
      } else {
        this.updateAffordability();
      }
    });

    this.bus.on(GameEvents.BUSINESSES_CHANGED, (views: BusinessView[]) => {
      this.businesses = views;
      this.maxVisibleCount = Math.max(this.maxVisibleCount, this.calculateVisibleCount());
      this.renderAll();
    });
  }

  /* ── Rendering ──────────────────────────────────────────── */

  private renderAll(): void {
    const visibleBusinesses = this.businesses.slice(0, this.maxVisibleCount);
    
    this.container.innerHTML = `
      <div class="shop-header">
        <span class="shop-icon">🏪</span>
        <span class="shop-title">BUSINESSES</span>
      </div>
      <div class="shop-list" id="shop-list">
        ${visibleBusinesses.map((biz) => this.renderCard(biz)).join('')}
      </div>
    `;

    // Bind buy buttons
    visibleBusinesses.forEach((biz) => {
      const btn = document.getElementById(`buy-${biz.id}`);
      btn?.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.onBuyCallback?.(biz.id);
      });
    });

    this.updateAffordability();
  }

  private renderCard(biz: BusinessView): string {
    const canAfford = this.currentBalance >= biz.currentCost;
    return `
      <div class="shop-card" id="card-${biz.id}">
        <div class="shop-card-left">
          <span class="shop-card-icon">${biz.icon}</span>
          <div class="shop-card-info">
            <div class="shop-card-name">${biz.name}</div>
            <div class="shop-card-revenue">+$${this.fmt(biz.revenuePerUnit)}/sec each</div>
          </div>
        </div>
        <div class="shop-card-right">
          <div class="shop-card-owned">${biz.owned > 0 ? `×${biz.owned}` : ''}</div>
          <button
            class="shop-buy-btn ${canAfford ? '' : 'disabled'}"
            id="buy-${biz.id}"
          >
            $${this.fmt(biz.currentCost)}
          </button>
        </div>
      </div>
    `;
  }

  /* ── Affordability Update (no full re-render) ───────────── */

  private updateAffordability(): void {
    for (const biz of this.businesses) {
      const btn = document.getElementById(`buy-${biz.id}`) as HTMLButtonElement | null;
      if (!btn) continue;

      const canAfford = this.currentBalance >= biz.currentCost;
      if (canAfford) {
        btn.classList.remove('disabled');
      } else {
        btn.classList.add('disabled');
      }
    }
  }

  /* ── Helpers ────────────────────────────────────────────── */

  private calculateVisibleCount(): number {
    let lastIndex = -1;
    for (let i = 0; i < this.businesses.length; i++) {
      if (this.businesses[i].owned > 0 || this.currentBalance >= this.businesses[i].currentCost) {
        lastIndex = i;
      }
    }
    return Math.min(this.businesses.length, lastIndex + 3);
  }

  private fmt(n: number): string {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return Math.floor(n).toLocaleString();
  }
}
