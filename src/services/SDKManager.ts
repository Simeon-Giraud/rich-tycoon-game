/**
 * SDKManager — CrazyGames SDK integration.
 * Handles gameplay signals, rewarded ads, and cloud saves.
 */

export class SDKManager {
  private static instance: SDKManager;
  private sdk: any;

  private constructor() {
    this.initSDK();
  }

  public static getInstance(): SDKManager {
    if (!SDKManager.instance) {
      SDKManager.instance = new SDKManager();
    }
    return SDKManager.instance;
  }

  private async initSDK() {
    try {
      if (window.CrazyGames && window.CrazyGames.SDK) {
        this.sdk = window.CrazyGames.SDK;
        console.log('[SDK] CrazyGames SDK initialized');
      } else {
        console.warn('[SDK] CrazyGames SDK not found — running in dev mode');
      }
    } catch (error) {
      console.error('[SDK] Init error:', error);
    }
  }

  public isAvailable(): boolean {
    return !!this.sdk;
  }

  /* ── Gameplay Signals ───────────────────────────────────── */

  public startGameplay(): void {
    if (this.sdk?.game) {
      this.sdk.game.gameplayStart();
    }
  }

  public stopGameplay(): void {
    if (this.sdk?.game) {
      this.sdk.game.gameplayStop();
    }
  }

  /* ── Cloud Saves (CrazyGames Data API) ──────────────────── */

  public async cloudSave(payload: string): Promise<boolean> {
    if (!this.sdk?.data) {
      console.log('[SDK] No data API — skipping cloud save');
      return false;
    }
    try {
      await this.sdk.data.save(payload);
      console.log('[SDK] Cloud save successful');
      return true;
    } catch (err) {
      console.error('[SDK] Cloud save failed:', err);
      return false;
    }
  }

  public async cloudLoad(): Promise<string | null> {
    if (!this.sdk?.data) {
      console.log('[SDK] No data API — skipping cloud load');
      return null;
    }
    try {
      const data = await this.sdk.data.load();
      if (data) {
        console.log('[SDK] Cloud load successful');
        return data;
      }
      return null;
    } catch (err) {
      console.error('[SDK] Cloud load failed:', err);
      return null;
    }
  }

  /* ── Rewarded Ads ───────────────────────────────────────── */

  public showRewardedAd(onSuccess: () => void): void {
    if (!this.sdk?.ad) {
      console.warn('[SDK] No ad module — granting reward directly (dev mode)');
      onSuccess();
      return;
    }

    this.sdk.ad.requestAd('rewarded', {
      adStarted: () => {
        this.stopGameplay();
      },
      adFinished: () => {
        this.startGameplay();
        onSuccess();
      },
      adError: (error: string) => {
        console.error('[SDK] Rewarded ad error:', error);
        this.startGameplay();
      },
    });
  }
}

export const sdkManager = SDKManager.getInstance();
