/**
 * LifestylePanel — UI for luxury items and the Trophy Room.
 */

import { EventBus, GameEvents } from '../core/EventBus';
import { LuxuryItemLive } from '../core/LifestyleManager';

export class LifestylePanel {
  private bus: EventBus;
  private container: HTMLElement;
  private items: LuxuryItemLive[] = [];
  private currentBalance = 0;
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
      this.renderAll(); // full re-render on purchase to update Trophy Room
    });
  }

  /* ── Rendering ──────────────────────────────────────────── */

  private renderAll(): void {
    this.container.innerHTML = `
      <div class="lifestyle-header">
        <span class="lifestyle-icon">💎</span>
        <span class="lifestyle-title">LIFESTYLE & TROPHIES</span>
      </div>

      <div class="trophy-room">
        <div class="trophy-room-title">TROPHY ROOM</div>
        <canvas id="trophy-canvas" class="trophy-canvas" width="680" height="120"></canvas>
      </div>

      <div class="lifestyle-list">
        ${this.items.map(i => this.renderItem(i)).join('')}
      </div>
    `;

    this.drawTrophyRoom();
    this.bindEvents();
    this.updateButtons();
  }

  private renderItem(item: LuxuryItemLive): string {
    const canBuy = this.currentBalance >= item.cost;
    const isOwned = item.owned;

    return `
      <div class="lifestyle-item ${isOwned ? 'owned' : ''}">
        <div class="ls-icon-wrap">
          <span class="ls-icon">${item.icon}</span>
        </div>
        <div class="ls-info">
          <div class="ls-name">${item.name}</div>
          <div class="ls-desc">${item.desc}</div>
        </div>
        <div class="ls-action">
          ${isOwned 
            ? `<div class="ls-owned-badge">✓ PURCHASED</div>`
            : `<button id="ls-buy-${item.id}" class="ls-btn ${canBuy ? '' : 'disabled'}">
                 $${this.fmt(item.cost)}
               </button>`
          }
        </div>
      </div>
    `;
  }

  private updateButtons(): void {
    for (const item of this.items) {
      if (item.owned) continue;
      const btn = document.getElementById(`ls-buy-${item.id}`);
      if (!btn) continue;
      
      if (this.currentBalance >= item.cost) {
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
    const w = canvas.width;
    const h = canvas.height;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Draw background shelves
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.fillRect(0, h - 30, w, 10);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, h - 20, w, 20);

    // Draw items
    const totalSlots = this.items.length;
    const slotWidth = w / totalSlots;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '40px Arial';

    this.items.forEach((item, index) => {
      const x = slotWidth * index + slotWidth / 2;
      const y = h - 50;

      if (item.owned) {
        // Draw glowing aura
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 40);
        gradient.addColorStop(0, 'rgba(245, 197, 66, 0.3)');
        gradient.addColorStop(1, 'rgba(245, 197, 66, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 40, 0, Math.PI * 2);
        ctx.fill();

        // Draw icon
        ctx.globalAlpha = 1.0;
        ctx.fillText(item.icon, x, y);
      } else {
        // Draw silhouette
        ctx.globalAlpha = 0.1;
        ctx.fillText('?', x, y);
      }
    });

    ctx.globalAlpha = 1.0;
  }

  /* ── Event Binding ──────────────────────────────────────── */

  private bindEvents(): void {
    for (const item of this.items) {
      if (item.owned) continue;
      const btn = document.getElementById(`ls-buy-${item.id}`);
      if (btn) {
        btn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          if (this.currentBalance >= item.cost) {
            this.onBuyCallback?.(item.id);
          }
        });
      }
    }

    // Add hover effect to canvas for glowing items
    const canvas = document.getElementById('trophy-canvas');
    if (canvas) {
      canvas.addEventListener('mousemove', () => {
        // We could implement a nice interactive glow here, but standard render is fine for now
      });
    }
  }

  /* ── Helpers ────────────────────────────────────────────── */

  private fmt(n: number): string {
    if (n >= 1_000_000_000_000) return (n / 1_000_000_000_000).toFixed(2) + 'T';
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return Math.floor(n).toLocaleString();
  }
}
