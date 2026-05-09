/**
 * LifestyleManager — Manages luxury items that grant global multipliers.
 */

import { EventBus, GameEvents } from './EventBus';

export type MultiplierType = 'click' | 'passive' | 'cost';

export interface LuxuryItemDef {
  id: string;
  name: string;
  cost: number;
  icon: string;
  desc: string;
  type: MultiplierType;
  value: number; // e.g., 0.1 for +10%
}

export interface LuxuryItemLive extends LuxuryItemDef {
  owned: boolean;
}

const ITEMS: LuxuryItemDef[] = [
  { id: 'smartphone', name: 'Gold Smartphone', cost: 1_000, icon: '📱', desc: '+10% Click Power', type: 'click', value: 0.10 },
  { id: 'watch', name: 'Designer Watch', cost: 25_000, icon: '⌚', desc: '+25% Click Power', type: 'click', value: 0.25 },
  { id: 'supercar', name: 'Supercar', cost: 500_000, icon: '🏎️', desc: '+5% Passive Income', type: 'passive', value: 0.05 },
  { id: 'yacht', name: 'Luxury Yacht', cost: 5_000_000, icon: '🛥️', desc: '+15% Passive Income', type: 'passive', value: 0.15 },
  { id: 'jet', name: 'Private Jet', cost: 50_000_000, icon: '✈️', desc: '-10% Business Cost', type: 'cost', value: -0.10 },
  { id: 'island', name: 'Private Island', cost: 1_000_000_000, icon: '🏝️', desc: '+50% Passive Income', type: 'passive', value: 0.50 },
];

export class LifestyleManager {
  private items: Map<string, LuxuryItemLive> = new Map();
  private bus: EventBus;

  constructor() {
    this.bus = EventBus.getInstance();
    for (const def of ITEMS) {
      this.items.set(def.id, { ...def, owned: false });
    }
  }

  public getAll(): LuxuryItemLive[] {
    return Array.from(this.items.values());
  }

  public buy(id: string): boolean {
    const item = this.items.get(id);
    if (!item || item.owned) return false;
    
    item.owned = true;
    this.bus.emit(GameEvents.LIFESTYLE_PURCHASED);
    return true;
  }

  public getMultipliers(): { click: number; passive: number; cost: number } {
    let click = 1;
    let passive = 1;
    let cost = 1;

    for (const item of this.items.values()) {
      if (!item.owned) continue;
      if (item.type === 'click') click += item.value;
      if (item.type === 'passive') passive += item.value;
      if (item.type === 'cost') cost += item.value;
    }

    // Ensure cost doesn't go below say 20%
    if (cost < 0.2) cost = 0.2;

    return { click, passive, cost };
  }

  public getSnapshot(): string[] {
    return Array.from(this.items.values()).filter(i => i.owned).map(i => i.id);
  }

  public loadState(ownedIds: string[]): void {
    if (!ownedIds) return;
    for (const id of ownedIds) {
      const item = this.items.get(id);
      if (item) item.owned = true;
    }
  }
}
