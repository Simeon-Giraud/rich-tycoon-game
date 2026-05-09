/**
 * LifestyleManager — Manages luxury items organized by category,
 * each granting global multipliers (click, passive, cost).
 */

import { EventBus, GameEvents } from './EventBus';

export type MultiplierType = 'click' | 'passive' | 'cost';

export type LifestyleCategory = 'tech' | 'cars' | 'watercraft' | 'aviation' | 'real_estate';

export interface LuxuryItemDef {
  id: string;
  name: string;
  cost: number;
  icon: string;
  desc: string;
  type: MultiplierType;
  value: number; // e.g., 0.05 for +5%
  category: LifestyleCategory;
}

export interface LuxuryItemLive extends LuxuryItemDef {
  owned: number;
  currentCost: number;
}

export interface CategoryInfo {
  id: LifestyleCategory;
  label: string;
  icon: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'tech',        label: 'Tech',        icon: '🖥️' },
  { id: 'cars',        label: 'Cars',        icon: '🏎️' },
  { id: 'watercraft',  label: 'Watercraft',  icon: '⚓' },
  { id: 'aviation',    label: 'Aviation',    icon: '✈️' },
  { id: 'real_estate', label: 'Real Estate', icon: '🏛️' },
];

const ITEMS: LuxuryItemDef[] = [
  // ── Tech (10 items) ──────────────────────────────────────────────────
  { id: 'smartphone',     name: 'Gold Smartphone',  cost: 1_000,         icon: '📱', desc: '+5% Click Power',     type: 'click',   value: 0.05,  category: 'tech' },
  { id: 'vr_headset',     name: 'VR Headset',       cost: 5_000,         icon: '🥽', desc: '+8% Click Power',     type: 'click',   value: 0.08,  category: 'tech' },
  { id: 'drone',          name: 'High-End Drone',   cost: 15_000,        icon: '🚁', desc: '+10% Click Power',    type: 'click',   value: 0.10,  category: 'tech' },
  { id: 'gaming_rig',     name: 'Gaming Rig',       cost: 50_000,        icon: '🎮', desc: '+15% Click Power',    type: 'click',   value: 0.15,  category: 'tech' },
  { id: 'smart_home',     name: 'Smart Home System',cost: 100_000,       icon: '🏠', desc: '+2% Passive Income',  type: 'passive', value: 0.02,  category: 'tech' },
  { id: 'crypto_rig',     name: 'Crypto Rig',       cost: 500_000,       icon: '⛏️', desc: '+5% Passive Income',  type: 'passive', value: 0.05,  category: 'tech' },
  { id: 'personal_robot', name: 'Personal Robot',   cost: 2_000_000,     icon: '🤖', desc: '+8% Passive Income',  type: 'passive', value: 0.08,  category: 'tech' },
  { id: 'quantum_server', name: 'Quantum Server',   cost: 5_000_000,     icon: '🧠', desc: '+10% Passive Income', type: 'passive', value: 0.10,  category: 'tech' },
  { id: 'ai_supercomputer',name: 'AI Supercomputer',cost: 50_000_000,    icon: '💻', desc: '+20% Passive Income', type: 'passive', value: 0.20,  category: 'tech' },
  { id: 'tech_incubator', name: 'Tech Incubator',   cost: 500_000_000,   icon: '🔬', desc: '-5% Business Costs',  type: 'cost',    value: -0.05, category: 'tech' },

  // ── Cars (10 items) ──────────────────────────────────────────────────
  { id: 'vintage_moto',   name: 'Vintage Moto',     cost: 20_000,        icon: '🏍️', desc: '+1% Click Power',     type: 'click',   value: 0.01,  category: 'cars' },
  { id: 'luxury_sedan',   name: 'Luxury Sedan',     cost: 80_000,        icon: '🚘', desc: '+1% Passive Income',  type: 'passive', value: 0.01,  category: 'cars' },
  { id: 'sports_car',     name: 'Sports Car',       cost: 150_000,       icon: '🏎️', desc: '+2% Passive Income',  type: 'passive', value: 0.02,  category: 'cars' },
  { id: 'armored_suv',    name: 'Armored SUV',      cost: 500_000,       icon: '🛡️', desc: '+3% Passive Income',  type: 'passive', value: 0.03,  category: 'cars' },
  { id: 'custom_limo',    name: 'Custom Limousine', cost: 1_500_000,     icon: '🎩', desc: '+4% Passive Income',  type: 'passive', value: 0.04,  category: 'cars' },
  { id: 'hypercar',       name: 'Hypercar',         cost: 5_000_000,     icon: '🚗', desc: '+5% Passive Income',  type: 'passive', value: 0.05,  category: 'cars' },
  { id: 'classic_cars',   name: 'Classic Car Fleet',cost: 20_000_000,    icon: '🚙', desc: '+8% Passive Income',  type: 'passive', value: 0.08,  category: 'cars' },
  { id: 'concept_car',    name: 'Concept Car',      cost: 50_000_000,    icon: '✨', desc: '+12% Passive Income', type: 'passive', value: 0.12,  category: 'cars' },
  { id: 'f1_team',        name: 'F1 Team',          cost: 150_000_000,   icon: '🏁', desc: '+15% Passive Income', type: 'passive', value: 0.15,  category: 'cars' },
  { id: 'auto_fleet',     name: 'Autonomous Fleet', cost: 1_000_000_000, icon: '🚕', desc: '-5% Business Costs',  type: 'cost',    value: -0.05, category: 'cars' },

  // ── Watercraft (10 items) ────────────────────────────────────────────
  { id: 'jet_ski',        name: 'Jet Ski',          cost: 10_000,        icon: '🌊', desc: '+2% Click Power',     type: 'click',   value: 0.02,  category: 'watercraft' },
  { id: 'speedboat',      name: 'Speedboat',        cost: 80_000,        icon: '🚤', desc: '+1% Passive Income',  type: 'passive', value: 0.01,  category: 'watercraft' },
  { id: 'cabin_cruiser',  name: 'Cabin Cruiser',    cost: 250_000,       icon: '🎣', desc: '+2% Passive Income',  type: 'passive', value: 0.02,  category: 'watercraft' },
  { id: 'catamaran',      name: 'Luxury Catamaran', cost: 1_500_000,     icon: '🛟', desc: '+3% Passive Income',  type: 'passive', value: 0.03,  category: 'watercraft' },
  { id: 'sailing_yacht',  name: 'Sailing Yacht',    cost: 8_000_000,     icon: '⛵', desc: '+5% Passive Income',  type: 'passive', value: 0.05,  category: 'watercraft' },
  { id: 'sub',            name: 'Deep Sea Sub',     cost: 25_000_000,    icon: '🤿', desc: '+8% Passive Income',  type: 'passive', value: 0.08,  category: 'watercraft' },
  { id: 'superyacht',     name: 'Superyacht',       cost: 100_000_000,   icon: '🛳️', desc: '+12% Passive Income', type: 'passive', value: 0.12,  category: 'watercraft' },
  { id: 'mega_yacht',     name: 'Mega Yacht',       cost: 500_000_000,   icon: '🛥️', desc: '+20% Passive Income', type: 'passive', value: 0.20,  category: 'watercraft' },
  { id: 'cruise_liner',   name: 'Cruise Liner',     cost: 2_000_000_000, icon: '🚢', desc: '+35% Passive Income', type: 'passive', value: 0.35,  category: 'watercraft' },
  { id: 'floating_city',  name: 'Floating City',    cost: 10_000_000_000,icon: '🏙️', desc: '+50% Passive Income', type: 'passive', value: 0.50,  category: 'watercraft' },

  // ── Aviation (10 items) ──────────────────────────────────────────────
  { id: 'ultralight',     name: 'Ultralight Plane', cost: 50_000,        icon: '🪂', desc: '+1% Passive Income',  type: 'passive', value: 0.01,  category: 'aviation' },
  { id: 'hot_air_balloon',name: 'Hot Air Balloon',  cost: 150_000,       icon: '🎈', desc: '+2% Passive Income',  type: 'passive', value: 0.02,  category: 'aviation' },
  { id: 'helicopter',     name: 'Helicopter',       cost: 2_000_000,     icon: '🚁', desc: '-1% Business Costs',  type: 'cost',    value: -0.01, category: 'aviation' },
  { id: 'turboprop',      name: 'Turboprop Plane',  cost: 5_000_000,     icon: '🛩️', desc: '-2% Business Costs',  type: 'cost',    value: -0.02, category: 'aviation' },
  { id: 'light_jet',      name: 'Light Jet',        cost: 15_000_000,    icon: '💺', desc: '-3% Business Costs',  type: 'cost',    value: -0.03, category: 'aviation' },
  { id: 'private_jet',    name: 'Private Jet',      cost: 75_000_000,    icon: '✈️', desc: '-5% Business Costs',  type: 'cost',    value: -0.05, category: 'aviation' },
  { id: 'luxury_airliner',name: 'Luxury Airliner',  cost: 300_000_000,   icon: '🛫', desc: '-8% Business Costs',  type: 'cost',    value: -0.08, category: 'aviation' },
  { id: 'supersonic_jet', name: 'Supersonic Jet',   cost: 1_000_000_000, icon: '🚀', desc: '-12% Business Costs', type: 'cost',    value: -0.12, category: 'aviation' },
  { id: 'orbital_shuttle',name: 'Orbital Shuttle',  cost: 2_500_000_000, icon: '🛸', desc: '-20% Business Costs', type: 'cost',    value: -0.20, category: 'aviation' },
  { id: 'mars_rocket',    name: 'Mars Rocket',      cost: 15_000_000_000,icon: '🛰️', desc: '-30% Business Costs', type: 'cost',    value: -0.30, category: 'aviation' },

  // ── Real Estate (10 items) ───────────────────────────────────────────
  { id: 'beach_hut',      name: 'Beach Hut',        cost: 25_000,        icon: '🛖', desc: '+1% Passive Income',  type: 'passive', value: 0.01,  category: 'real_estate' },
  { id: 'cabin',          name: 'Cabin in Woods',   cost: 100_000,       icon: '🏕️', desc: '+2% Passive Income',  type: 'passive', value: 0.02,  category: 'real_estate' },
  { id: 'condo',          name: 'Luxury Condo',     cost: 1_000_000,     icon: '🏢', desc: '+3% Passive Income',  type: 'passive', value: 0.03,  category: 'real_estate' },
  { id: 'penthouse',      name: 'Penthouse',        cost: 10_000_000,    icon: '🌇', desc: '+5% Passive Income',  type: 'passive', value: 0.05,  category: 'real_estate' },
  { id: 'mansion',        name: 'Mega Mansion',     cost: 50_000_000,    icon: '🏰', desc: '+8% Passive Income',  type: 'passive', value: 0.08,  category: 'real_estate' },
  { id: 'private_island', name: 'Private Island',   cost: 250_000_000,   icon: '🏝️', desc: '+15% Passive Income', type: 'passive', value: 0.15,  category: 'real_estate' },
  { id: 'skyscraper',     name: 'Skyscraper',       cost: 1_000_000_000, icon: '🏙️', desc: '+25% Passive Income', type: 'passive', value: 0.25,  category: 'real_estate' },
  { id: 'bunker',         name: 'Underground Bunker',cost: 5_000_000_000,icon: '🕳️', desc: '+40% Passive Income', type: 'passive', value: 0.40,  category: 'real_estate' },
  { id: 'underwater_base',name: 'Underwater Base',  cost: 20_000_000_000,icon: '🫧', desc: '+60% Passive Income', type: 'passive', value: 0.60,  category: 'real_estate' },
  { id: 'lunar_base',     name: 'Lunar Base',       cost: 50_000_000_000,icon: '🌕', desc: '+100% Passive Income',type: 'passive', value: 1.00,  category: 'real_estate' },
];

export class LifestyleManager {
  private items: Map<string, LuxuryItemLive> = new Map();
  private bus: EventBus;

  constructor() {
    this.bus = EventBus.getInstance();
    for (const def of ITEMS) {
      this.items.set(def.id, { ...def, owned: 0, currentCost: def.cost });
    }
  }

  public getAll(): LuxuryItemLive[] {
    return Array.from(this.items.values());
  }

  public getByCategory(cat: LifestyleCategory): LuxuryItemLive[] {
    return this.getAll().filter(i => i.category === cat);
  }

  public buy(id: string): boolean {
    const item = this.items.get(id);
    if (!item) return false;

    item.owned += 1;
    // Removed dynamic cost scaling as requested. Price remains flat.
    // item.currentCost = Math.floor(item.cost * Math.pow(1.5, item.owned));
    
    this.bus.emit(GameEvents.LIFESTYLE_PURCHASED);
    return true;
  }

  public getMultipliers(): { click: number; passive: number; cost: number } {
    let click = 1;
    let passive = 1;
    let cost = 1;

    for (const item of this.items.values()) {
      if (item.owned === 0) continue;
      if (item.type === 'click') click += item.value * item.owned;
      if (item.type === 'passive') passive += item.value * item.owned;
      if (item.type === 'cost') cost += item.value * item.owned;
    }

    // Ensure cost doesn't go below 20%
    if (cost < 0.2) cost = 0.2;

    return { click, passive, cost };
  }

  public getOwnedCount(): number {
    return Array.from(this.items.values()).filter(i => i.owned > 0).length;
  }

  public getTotalCount(): number {
    return this.items.size;
  }

  public getSnapshot(): Record<string, number> {
    const snap: Record<string, number> = {};
    for (const item of this.items.values()) {
      if (item.owned > 0) snap[item.id] = item.owned;
    }
    return snap;
  }

  public loadState(state: string[] | Record<string, number>): void {
    if (!state) return;

    if (Array.isArray(state)) {
      // Legacy load from when it was a boolean
      for (const id of state) {
        const item = this.items.get(id);
        if (item) {
          item.owned = 1;
          item.currentCost = item.cost;
        }
      }
    } else {
      // New load
      for (const [id, count] of Object.entries(state)) {
        const item = this.items.get(id);
        if (item) {
          item.owned = count;
          item.currentCost = item.cost;
        }
      }
    }
  }
}
