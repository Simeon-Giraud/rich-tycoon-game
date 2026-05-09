/**
 * BusinessManager — Pure logic class for the business/shop system.
 * Zero DOM imports. Communicates via EventBus.
 *
 * Each business has:
 *  • baseCost    — initial purchase price
 *  • baseRevenue — income per second when owned ×1
 *  • growthRate  — cost multiplier per unit owned (1.15 standard)
 *  • owned       — how many the player has bought
 *
 * Current cost = baseCost × growthRate^owned
 * Total passive = Σ(baseRevenue × owned) for all businesses
 */

import { EventBus, GameEvents } from './EventBus';

export interface BusinessDefinition {
  id: string;
  name: string;
  icon: string;
  baseCost: number;
  baseRevenue: number;
  growthRate: number;
}

export interface BusinessState {
  id: string;
  owned: number;
}

export interface BusinessView {
  id: string;
  name: string;
  icon: string;
  owned: number;
  currentCost: number;
  revenuePerUnit: number;
  totalRevenue: number;
}

/* ── Business catalog ─────────────────────────────────────── */

const BUSINESSES: BusinessDefinition[] = [
  // Tier 1 — Starter
  { id: 'lemonade_stand',  name: 'Lemonade Stand',    icon: '🍋', baseCost: 15,             baseRevenue: 0.1,        growthRate: 1.15 },
  { id: 'newspaper_route', name: 'Newspaper Route',    icon: '📰', baseCost: 100,            baseRevenue: 0.5,        growthRate: 1.15 },
  { id: 'vending_machine', name: 'Vending Machine',    icon: '🥤', baseCost: 500,            baseRevenue: 2,          growthRate: 1.15 },
  // Tier 2 — Small Biz
  { id: 'food_truck',      name: 'Food Truck',         icon: '🌮', baseCost: 2_500,          baseRevenue: 8,          growthRate: 1.15 },
  { id: 'coffee_cart',     name: 'Coffee Cart',        icon: '☕', baseCost: 10_000,         baseRevenue: 25,         growthRate: 1.15 },
  { id: 'barbershop',      name: 'Barbershop',         icon: '💈', baseCost: 40_000,         baseRevenue: 80,         growthRate: 1.15 },
  // Tier 3 — Mid Market
  { id: 'apparel_store',   name: 'Apparel Store',      icon: '👕', baseCost: 150_000,        baseRevenue: 250,        growthRate: 1.15 },
  { id: 'cloud_kitchen',   name: 'Cloud Kitchen',      icon: '🍳', baseCost: 500_000,        baseRevenue: 700,        growthRate: 1.15 },
  { id: 'gym_chain',       name: 'Gym Chain',          icon: '🏋️', baseCost: 1_500_000,      baseRevenue: 1_800,      growthRate: 1.15 },
  // Tier 4 — Growth
  { id: 'tech_startup',    name: 'Tech Startup',       icon: '💻', baseCost: 5_000_000,      baseRevenue: 5_000,      growthRate: 1.15 },
  { id: 'hotel_resort',    name: 'Hotel Resort',       icon: '🏨', baseCost: 20_000_000,     baseRevenue: 15_000,     growthRate: 1.15 },
  { id: 'cargo_port',      name: 'Cargo Port',         icon: '🚢', baseCost: 75_000_000,     baseRevenue: 45_000,     growthRate: 1.15 },
  // Tier 5 — Enterprise
  { id: 'media_network',   name: 'Media Network',      icon: '📡', baseCost: 250_000_000,    baseRevenue: 120_000,    growthRate: 1.15 },
  { id: 'skyscraper',      name: 'Skyscraper',         icon: '🏢', baseCost: 1_000_000_000,  baseRevenue: 400_000,    growthRate: 1.15 },
  { id: 'pharma_corp',     name: 'Pharma Corp',        icon: '💊', baseCost: 5_000_000_000,  baseRevenue: 1_500_000,  growthRate: 1.15 },
  // Tier 6 — Mega
  { id: 'space_tourism',   name: 'Space Tourism',      icon: '🚀', baseCost: 25_000_000_000, baseRevenue: 6_000_000,  growthRate: 1.15 },
  { id: 'fusion_plant',    name: 'Fusion Plant',       icon: '⚡', baseCost: 100_000_000_000,baseRevenue: 20_000_000, growthRate: 1.15 },
  { id: 'mars_colony',     name: 'Mars Colony',        icon: '🪐', baseCost: 500_000_000_000,baseRevenue: 80_000_000, growthRate: 1.15 },
  // Tier 7 — Endgame
  { id: 'dyson_sphere',    name: 'Dyson Sphere',       icon: '☀️', baseCost: 5_000_000_000_000,   baseRevenue: 500_000_000,   growthRate: 1.15 },
  { id: 'galaxy_empire',   name: 'Galaxy Empire',      icon: '🌌', baseCost: 100_000_000_000_000, baseRevenue: 8_000_000_000, growthRate: 1.15 },
];

export class BusinessManager {
  private definitions: BusinessDefinition[];
  private ownership: Map<string, number> = new Map();
  private bus: EventBus;
  private passiveMultiplier: number = 1;
  private costMultiplier: number = 1;

  constructor(savedState?: BusinessState[]) {
    this.bus = EventBus.getInstance();
    this.definitions = BUSINESSES;

    // Initialise ownership (all zero or from save)
    for (const biz of this.definitions) {
      this.ownership.set(biz.id, 0);
    }

    if (savedState) {
      for (const s of savedState) {
        if (this.ownership.has(s.id)) {
          this.ownership.set(s.id, s.owned);
        }
      }
    }
  }

  /* ── Public API ─────────────────────────────────────────── */

  /** Get the current cost of the next unit for a business. */
  public getCurrentCost(bizId: string): number {
    const def = this.definitions.find((b) => b.id === bizId);
    if (!def) return Infinity;
    const owned = this.ownership.get(bizId) ?? 0;
    const rawCost = def.baseCost * Math.pow(def.growthRate, owned);
    return Math.floor(rawCost * this.costMultiplier);
  }

  public setMultipliers(passive: number, cost: number): void {
    this.passiveMultiplier = passive;
    this.costMultiplier = cost;
    this.bus.emit(GameEvents.BUSINESSES_CHANGED, this.getViews());
  }

  /** Attempt to buy one unit of a business. Returns the cost if successful, or -1. */
  public buy(bizId: string, currentBalance: number): number {
    const cost = this.getCurrentCost(bizId);
    if (currentBalance < cost) return -1;

    const owned = (this.ownership.get(bizId) ?? 0) + 1;
    this.ownership.set(bizId, owned);

    this.bus.emit(GameEvents.BUSINESS_PURCHASED, bizId, owned, cost);
    this.bus.emit(GameEvents.BUSINESSES_CHANGED, this.getViews());

    return cost;
  }

  /** Calculate total passive income from all owned businesses. */
  public getTotalPassiveIncome(): number {
    let total = 0;
    for (const def of this.definitions) {
      const owned = this.ownership.get(def.id) ?? 0;
      total += def.baseRevenue * owned * this.passiveMultiplier;
    }
    return total;
  }

  /** Get the view model for all businesses (for the shop UI). */
  public getViews(): BusinessView[] {
    return this.definitions.map((def) => {
      const owned = this.ownership.get(def.id) ?? 0;
      return {
        id: def.id,
        name: def.name,
        icon: def.icon,
        owned,
        currentCost: this.getCurrentCost(def.id),
        revenuePerUnit: def.baseRevenue * this.passiveMultiplier,
        totalRevenue: def.baseRevenue * owned * this.passiveMultiplier,
      };
    });
  }

  /** Serialise ownership for saving. */
  public getSnapshot(): BusinessState[] {
    return this.definitions.map((def) => ({
      id: def.id,
      owned: this.ownership.get(def.id) ?? 0,
    }));
  }

  /** Hydrate from a save file. */
  public loadState(saved: BusinessState[]): void {
    for (const s of saved) {
      if (this.ownership.has(s.id)) {
        this.ownership.set(s.id, s.owned);
      }
    }
    this.bus.emit(GameEvents.BUSINESSES_CHANGED, this.getViews());
  }
}
