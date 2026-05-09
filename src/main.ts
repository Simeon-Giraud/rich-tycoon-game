import './style.css';
import { EconomyEngine } from './core/EconomyEngine';
import { BusinessManager } from './core/BusinessManager';
import { StockMarket } from './core/StockMarket';
import { NewsEngine } from './core/NewsEngine';
import { LifestyleManager } from './core/LifestyleManager';
import { SaveManager } from './services/SaveManager';
import { MainView } from './ui/MainView';
import { ShopPanel } from './ui/ShopPanel';
import { StocksPanel } from './ui/StocksPanel';
import { LifestylePanel } from './ui/LifestylePanel';
import { NewsTicker } from './ui/NewsTicker';
import { sdkManager } from './services/SDKManager';

async function boot() {
  // 1. Create core systems
  const engine = new EconomyEngine();
  const bizManager = new BusinessManager();
  const stockMarket = new StockMarket();
  const lifestyleManager = new LifestyleManager();
  new NewsEngine();

  const saveManager = new SaveManager(engine, bizManager, stockMarket, lifestyleManager);

  // 2. Load previous save (async — checks cloud first)
  const hasSave = await saveManager.load();
  console.log(hasSave ? '[Boot] Restored save' : '[Boot] Fresh game');

  // Apply multipliers right after load
  const { click, passive, cost } = lifestyleManager.getMultipliers();
  engine.setClickMultiplier(click);
  bizManager.setMultipliers(passive, cost);
  engine.setPassiveIncome(bizManager.getTotalPassiveIncome());

  // 3. Create main UI
  const view = new MainView(document.getElementById('app')!);
  view.onClickEarn(() => engine.click());

  // 4. Business shop (Empire tab)
  const shopAnchor = document.getElementById('shop-anchor')!;
  const shop = new ShopPanel(shopAnchor);
  shop.setBusinesses(bizManager.getViews());
  shop.onBuy((bizId: string) => {
    const c = bizManager.getCurrentCost(bizId);
    if (engine.spend(c)) {
      bizManager.buy(bizId, engine.getBalance() + c);
      engine.setPassiveIncome(bizManager.getTotalPassiveIncome());
    }
  });

  // 5. Stock market (Stocks tab)
  const stocksAnchor = document.getElementById('content-stocks')!;
  const stocksPanel = new StocksPanel(stocksAnchor);
  stocksPanel.setStocks(stockMarket.getAll());
  stocksPanel.setPortfolioAccessors(
    (id: string) => stockMarket.getPortfolioEntry(id),
    () => stockMarket.getTotalPnL(),
    () => stockMarket.getPortfolioValue(),
  );
  stocksPanel.onBuy((stockId: string, qty: number) => {
    const c = stockMarket.buyShares(stockId, qty, engine.getBalance());
    if (c > 0) engine.spend(c);
  });
  stocksPanel.onSell((stockId: string, qty: number) => {
    const revenue = stockMarket.sellShares(stockId, qty);
    if (revenue > 0) engine.spend(-revenue);
  });
  stocksPanel.onSellAll((stockId: string) => {
    const revenue = stockMarket.sellAll(stockId);
    if (revenue > 0) engine.spend(-revenue);
  });

  // 6. Lifestyle & Trophies (Lifestyle tab)
  const lifestyleAnchor = document.getElementById('content-lifestyle')!;
  const lifestylePanel = new LifestylePanel(lifestyleAnchor);
  lifestylePanel.setItems(lifestyleManager.getAll());
  lifestylePanel.onBuy((id: string) => {
    const item = lifestyleManager.getAll().find(i => i.id === id);
    if (!item) return;
    if (engine.spend(item.currentCost)) {
      lifestyleManager.buy(id);
      const { click, passive, cost } = lifestyleManager.getMultipliers();
      engine.setClickMultiplier(click);
      bizManager.setMultipliers(passive, cost);
      engine.setPassiveIncome(bizManager.getTotalPassiveIncome());
    }
  });

  // 7. News ticker
  const newsAnchor = document.getElementById('news-anchor')!;
  new NewsTicker(newsAnchor);

  // 8. Start all systems
  engine.startPassiveTick();
  stockMarket.start();
  saveManager.startAutoSave();
  sdkManager.startGameplay();

  // 9. Pause when tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      engine.stopPassiveTick();
      stockMarket.stop();
      sdkManager.stopGameplay();
    } else {
      engine.startPassiveTick();
      stockMarket.start();
      sdkManager.startGameplay();
    }
  });

  console.log('[Boot] Billionaire Tycoon ready 🤑');
}

boot();
