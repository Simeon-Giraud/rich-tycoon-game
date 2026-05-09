/**
 * StockMarket — Pure logic engine for a fake stock market.
 * Zero DOM imports. Communicates via EventBus.
 *
 * 20 fake stocks across 5 sectors, each with sector-appropriate volatility.
 * Prices fluctuate every 2 seconds with momentum + mean reversion.
 * Maintains a rolling history of the last 20 price points per stock.
 */

import { EventBus, GameEvents } from './EventBus';

export type Sector = 'tech' | 'finance' | 'energy' | 'entertainment' | 'food';

export interface StockDef {
  id: string;
  name: string;
  ticker: string;
  sector: Sector;
  basePrice: number;
  volatility: number; // 0-1 scale
}

export interface StockLive {
  id: string;
  name: string;
  ticker: string;
  sector: Sector;
  price: number;
  prevPrice: number;
  change: number;       // absolute
  changePct: number;    // percentage
  history: number[];    // last 20 price points
  sharesOwned: number;
}

export interface PortfolioEntry {
  id: string;
  shares: number;
  avgCost: number;      // average purchase price
}

/* ── Stock catalog ────────────────────────────────────────── */

const STOCKS: StockDef[] = [
  // Tech — high volatility
  { id: 'gugal',      name: 'Gugal',          ticker: 'GUGL',  sector: 'tech',          basePrice: 2800,  volatility: 0.06 },
  { id: 'pear',       name: 'Pear Inc.',      ticker: 'PEAR',  sector: 'tech',          basePrice: 185,   volatility: 0.05 },
  { id: 'banana_ai',  name: 'Banana AI',      ticker: 'BNAI',  sector: 'tech',          basePrice: 420,   volatility: 0.09 },
  { id: 'nvidious',   name: 'Nvidious',       ticker: 'NVDS',  sector: 'tech',          basePrice: 950,   volatility: 0.07 },
  { id: 'amaz0n',     name: 'Amaz0n',         ticker: 'AMZ0',  sector: 'tech',          basePrice: 190,   volatility: 0.04 },
  { id: 'metaverse',  name: 'MetaVerse',      ticker: 'META',  sector: 'tech',          basePrice: 510,   volatility: 0.06 },
  { id: 'teslatech',  name: 'TeslaTech',      ticker: 'TSLT',  sector: 'tech',          basePrice: 260,   volatility: 0.10 },
  // Finance — medium volatility
  { id: 'goldstack',  name: 'GoldStack',      ticker: 'GSTK',  sector: 'finance',       basePrice: 75,    volatility: 0.03 },
  { id: 'cryptovault',name: 'CryptoVault',    ticker: 'CVLT',  sector: 'finance',       basePrice: 340,   volatility: 0.08 },
  { id: 'blockbank',  name: 'BlockBank',      ticker: 'BBNK',  sector: 'finance',       basePrice: 120,   volatility: 0.05 },
  // Energy — low volatility, stable
  { id: 'solarprime', name: 'SolarPrime',     ticker: 'SLRP',  sector: 'energy',        basePrice: 65,    volatility: 0.02 },
  { id: 'petromax',   name: 'PetroMax',       ticker: 'PTMX',  sector: 'energy',        basePrice: 88,    volatility: 0.02 },
  { id: 'windforce',  name: 'WindForce',      ticker: 'WNDF',  sector: 'energy',        basePrice: 42,    volatility: 0.025 },
  // Entertainment — medium-high
  { id: 'flixstream', name: 'FlixStream',     ticker: 'FLIX',  sector: 'entertainment', basePrice: 630,   volatility: 0.05 },
  { id: 'gamestop2',  name: 'GameStop 2.0',   ticker: 'GS2',   sector: 'entertainment', basePrice: 28,    volatility: 0.12 },
  { id: 'tunewave',   name: 'TuneWave',       ticker: 'TUNW',  sector: 'entertainment', basePrice: 155,   volatility: 0.04 },
  { id: 'memecorp',   name: 'MemeCorp',       ticker: 'MEME',  sector: 'entertainment', basePrice: 8,     volatility: 0.15 },
  // Food — low-medium
  { id: 'burgerkp',   name: 'BurgerKingpin',  ticker: 'BKGP',  sector: 'food',          basePrice: 45,    volatility: 0.025 },
  { id: 'pizzaplanet',name: 'PizzaPlanet',    ticker: 'PZPL',  sector: 'food',          basePrice: 32,    volatility: 0.03 },
  { id: 'biogenix',   name: 'BioGenix',       ticker: 'BIOX',  sector: 'food',          basePrice: 210,   volatility: 0.06 },
];

const HISTORY_LENGTH = 20;

export class StockMarket {
  private stocks: Map<string, StockLive> = new Map();
  private portfolio: Map<string, PortfolioEntry> = new Map();
  private bus: EventBus;
  private tickTimer: number | null = null;
  private momentum: Map<string, number> = new Map(); // per-stock drift

  constructor() {
    this.bus = EventBus.getInstance();

    for (const def of STOCKS) {
      const price = def.basePrice;
      this.stocks.set(def.id, {
        id: def.id,
        name: def.name,
        ticker: def.ticker,
        sector: def.sector,
        price,
        prevPrice: price,
        change: 0,
        changePct: 0,
        history: [price],
        sharesOwned: 0,
      });
      this.portfolio.set(def.id, { id: def.id, shares: 0, avgCost: 0 });
      this.momentum.set(def.id, 0);
    }
  }

  /* ── Public API ─────────────────────────────────────────── */

  /** Start the 2-second price ticker. */
  public start(): void {
    if (this.tickTimer !== null) return;
    this.tickTimer = window.setInterval(() => this.tick(), 2_000);
  }

  /** Stop the ticker. */
  public stop(): void {
    if (this.tickTimer !== null) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  /** Buy shares of a stock. Returns total cost or -1 if unaffordable. */
  public buyShares(stockId: string, qty: number, balance: number): number {
    const stock = this.stocks.get(stockId);
    if (!stock) return -1;
    const cost = stock.price * qty;
    if (balance < cost) return -1;

    const entry = this.portfolio.get(stockId)!;
    const totalShares = entry.shares + qty;
    entry.avgCost = ((entry.avgCost * entry.shares) + cost) / totalShares;
    entry.shares = totalShares;
    stock.sharesOwned = totalShares;

    this.bus.emit(GameEvents.STOCK_TRADED, stockId, 'buy', qty, cost);
    return cost;
  }

  /** Sell shares. Returns revenue or -1 if not enough shares. */
  public sellShares(stockId: string, qty: number): number {
    const stock = this.stocks.get(stockId);
    if (!stock) return -1;
    const entry = this.portfolio.get(stockId)!;
    if (entry.shares < qty) return -1;

    const revenue = stock.price * qty;
    entry.shares -= qty;
    stock.sharesOwned = entry.shares;

    this.bus.emit(GameEvents.STOCK_TRADED, stockId, 'sell', qty, revenue);
    return revenue;
  }

  /** Get all stocks as an array for the UI. */
  public getAll(): StockLive[] {
    return Array.from(this.stocks.values());
  }

  /** Get total portfolio value. */
  public getPortfolioValue(): number {
    let total = 0;
    for (const [id, entry] of this.portfolio) {
      const stock = this.stocks.get(id);
      if (stock && entry.shares > 0) {
        total += stock.price * entry.shares;
      }
    }
    return total;
  }

  /** Get portfolio entry for a stock (avg cost, shares). */
  public getPortfolioEntry(stockId: string): PortfolioEntry | null {
    return this.portfolio.get(stockId) ?? null;
  }

  /** Get total unrealized P&L across all held stocks. */
  public getTotalPnL(): number {
    let pnl = 0;
    for (const [id, entry] of this.portfolio) {
      if (entry.shares <= 0) continue;
      const stock = this.stocks.get(id);
      if (!stock) continue;
      pnl += (stock.price - entry.avgCost) * entry.shares;
    }
    return pnl;
  }

  /** Sell all shares of a stock. Returns total revenue or -1. */
  public sellAll(stockId: string): number {
    const entry = this.portfolio.get(stockId);
    if (!entry || entry.shares <= 0) return -1;
    return this.sellShares(stockId, entry.shares);
  }

  /** Serialise for saving. */
  public getSnapshot(): { portfolio: PortfolioEntry[] } {
    return {
      portfolio: Array.from(this.portfolio.values()).filter(e => e.shares > 0),
    };
  }

  /** Hydrate from save. */
  public loadState(saved: { portfolio?: PortfolioEntry[] }): void {
    if (saved.portfolio) {
      for (const entry of saved.portfolio) {
        if (this.portfolio.has(entry.id)) {
          this.portfolio.set(entry.id, entry);
          const stock = this.stocks.get(entry.id);
          if (stock) stock.sharesOwned = entry.shares;
        }
      }
    }
  }

  /* ── Price Simulation ───────────────────────────────────── */

  private tick(): void {
    const movers: { stock: StockLive; isUp: boolean }[] = [];

    for (const [id, stock] of this.stocks) {
      const def = STOCKS.find(s => s.id === id)!;
      const prevPrice = stock.price;

      // Momentum: slight tendency to continue direction
      let mom = this.momentum.get(id) ?? 0;
      mom = mom * 0.6 + (Math.random() - 0.5) * 0.4; // decay + noise
      this.momentum.set(id, mom);

      // Mean reversion: pull back toward base price
      const deviation = (stock.price - def.basePrice) / def.basePrice;
      const reversion = -deviation * 0.05;

      // Random walk + momentum + reversion
      const randomFactor = (Math.random() - 0.5) * 2 * def.volatility;
      const totalChange = randomFactor + mom * def.volatility + reversion;

      stock.price = Math.max(0.01, stock.price * (1 + totalChange));
      stock.price = Math.round(stock.price * 100) / 100;
      stock.prevPrice = prevPrice;
      stock.change = stock.price - prevPrice;
      stock.changePct = (stock.change / prevPrice) * 100;

      // Rolling history
      stock.history.push(stock.price);
      if (stock.history.length > HISTORY_LENGTH) {
        stock.history.shift();
      }

      // Track big movers for news
      if (Math.abs(stock.changePct) > 2) {
        movers.push({ stock, isUp: stock.changePct > 0 });
      }
    }

    this.bus.emit(GameEvents.STOCKS_UPDATED, this.getAll());

    // Emit news for big movers
    if (movers.length > 0) {
      const pick = movers[Math.floor(Math.random() * movers.length)];
      this.bus.emit(GameEvents.STOCK_NEWS, pick.stock, pick.isUp);
    }
  }
}
