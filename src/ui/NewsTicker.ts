/**
 * NewsTicker — Bottom-of-screen scrolling news ticker.
 * Subscribes to NEWS_HEADLINE events and displays them
 * with a smooth slide-in animation.
 */

import { EventBus, GameEvents } from '../core/EventBus';

export class NewsTicker {
  private bus: EventBus;
  private container: HTMLElement;
  private queue: string[] = [];
  private isAnimating = false;

  constructor(parent: HTMLElement) {
    this.bus = EventBus.getInstance();

    this.container = document.createElement('div');
    this.container.className = 'news-ticker';
    this.container.innerHTML = `
      <div class="ticker-label">📰 BREAKING</div>
      <div class="ticker-content" id="ticker-text">Waiting for market activity...</div>
    `;
    parent.appendChild(this.container);

    this.bus.on(GameEvents.NEWS_HEADLINE, (headline: string) => {
      this.queue.push(headline);
      if (!this.isAnimating) this.showNext();
    });
  }

  private showNext(): void {
    if (this.queue.length === 0) {
      this.isAnimating = false;
      return;
    }

    this.isAnimating = true;
    const headline = this.queue.shift()!;
    const el = document.getElementById('ticker-text');
    if (!el) return;

    el.classList.remove('ticker-slide-in');
    // Force reflow to restart animation
    void el.offsetWidth;
    el.textContent = headline;
    el.classList.add('ticker-slide-in');

    // Show next headline after this one finishes
    setTimeout(() => this.showNext(), 6000);
  }
}
