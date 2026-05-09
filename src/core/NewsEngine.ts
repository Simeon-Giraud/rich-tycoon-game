/**
 * NewsEngine — Generates funny contextual headlines tied to stock movements.
 * Listens to STOCK_NEWS events and emits NEWS_HEADLINE for the ticker UI.
 */

import { EventBus, GameEvents } from './EventBus';
import { StockLive } from './StockMarket';

const BULL_HEADLINES: string[] = [
  '{name} announces revolutionary {product}, investors go wild',
  'Breaking: {ticker} CEO spotted buying a second yacht',
  '{name} beats earnings by 420%, analysts speechless',
  'Leaked memo: {name} developing AI that actually works',
  '{ticker} stock surges after viral TikTok endorsement',
  '{name} partners with NASA to deliver {product} to Mars',
  'Rumor: {name} acquiring a small country for tax purposes',
  '{ticker} rallies as CEO promises "more synergy"',
  '{name} stock jumps after Fortune names it "Best Place to Nap"',
  'Breaking: {name} invents {product}, cures Monday blues',
  '{ticker} soars as new product breaks internet (literally)',
  '{name} reports record profits, attributes success to vibes',
];

const BEAR_HEADLINES: string[] = [
  '{name} intern accidentally deletes production database',
  '{ticker} plummets after CEO tweets at 3 AM again',
  '{name} recalls all {product} units due to "sentience issues"',
  'Breaking: {name} CFO seen carrying cardboard box out of office',
  '{ticker} tanks as competition releases better {product}',
  '{name} loses major contract to a kid\'s lemonade stand',
  'Leaked: {name} spent entire R&D budget on office beanbags',
  '{ticker} drops after CEO confuses blockchain with spreadsheet',
  '{name} stock dips as product demo catches fire on stage',
  'Breaking: {name} customer support replaced by magic 8-ball',
  '{ticker} slides after AI chatbot roasts investors on earnings call',
  '{name} plunges as board discovers the product was just a PDF',
];

const PRODUCTS: Record<string, string[]> = {
  tech:          ['smartphone', 'AI assistant', 'quantum chip', 'cloud platform', 'neural implant'],
  finance:       ['crypto wallet', 'trading bot', 'digital vault', 'NFT index fund', 'meme portfolio'],
  energy:        ['solar panel', 'fusion reactor', 'wind turbine', 'battery pack', 'hamster wheel generator'],
  entertainment: ['streaming service', 'VR headset', 'game console', 'meme generator', 'hologram projector'],
  food:          ['robo-chef', 'lab-grown burger', 'smart fridge', 'delivery drone', 'infinite breadstick'],
};

export class NewsEngine {
  private bus: EventBus;

  constructor() {
    this.bus = EventBus.getInstance();
    this.bus.on(GameEvents.STOCK_NEWS, (stock: StockLive, isUp: boolean) => {
      const headline = this.generate(stock, isUp);
      this.bus.emit(GameEvents.NEWS_HEADLINE, headline);
    });
  }

  private generate(stock: StockLive, isUp: boolean): string {
    const templates = isUp ? BULL_HEADLINES : BEAR_HEADLINES;
    const template = templates[Math.floor(Math.random() * templates.length)];
    const productList = PRODUCTS[stock.sector] ?? PRODUCTS.tech;
    const product = productList[Math.floor(Math.random() * productList.length)];

    return template
      .replace('{name}', stock.name)
      .replace('{ticker}', stock.ticker)
      .replace('{product}', product);
  }
}
