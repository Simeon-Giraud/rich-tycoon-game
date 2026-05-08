import './style.css';
import { EconomyEngine } from './core/EconomyEngine';
import { SaveManager } from './services/SaveManager';
import { MainView } from './ui/MainView';
import { sdkManager } from './services/SDKManager';

const engine = new EconomyEngine();
const saveManager = new SaveManager(engine);
const hasSave = saveManager.load();
console.log(hasSave ? '[Boot] Restored save' : '[Boot] Fresh game');

const view = new MainView(document.getElementById('app')!);
view.onClickEarn(() => engine.click());

engine.startPassiveTick();
saveManager.startAutoSave();
sdkManager.startGameplay();

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    engine.stopPassiveTick();
    sdkManager.stopGameplay();
  } else {
    engine.startPassiveTick();
    sdkManager.startGameplay();
  }
});

console.log('[Boot] Billionaire Tycoon ready 🤑');
