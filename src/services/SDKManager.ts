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
      // The SDK script is loaded in index.html, so window.CrazyGames should be available
      if (window.CrazyGames && window.CrazyGames.SDK) {
        this.sdk = window.CrazyGames.SDK;
        console.log('CrazyGames SDK initialized successfully');
      } else {
        console.warn('CrazyGames SDK not found on window object');
      }
    } catch (error) {
      console.error('Error initializing CrazyGames SDK:', error);
    }
  }

  /**
   * Signals that the gameplay has started.
   * Should be called when the player starts playing or resumes after a pause.
   */
  public startGameplay(): void {
    if (this.sdk && this.sdk.game) {
      this.sdk.game.gameplayStart();
      console.log('Gameplay started');
    }
  }

  /**
   * Signals that the gameplay has stopped.
   * Should be called when the player pauses the game or enters a menu.
   */
  public stopGameplay(): void {
    if (this.sdk && this.sdk.game) {
      this.sdk.game.gameplayStop();
      console.log('Gameplay stopped');
    }
  }

  /**
   * Shows a rewarded advertisement.
   * @param onSuccess Callback executed when the ad is successfully finished.
   */
  public showRewardedAd(onSuccess: () => void): void {
    if (!this.sdk || !this.sdk.ad) {
      console.warn('SDK or Ad module not available, executing success callback immediately');
      onSuccess();
      return;
    }

    this.sdk.ad.requestAd('rewarded', {
      adStarted: () => {
        console.log('Rewarded ad started');
        this.stopGameplay(); // Automatically stop gameplay when ad starts
      },
      adFinished: () => {
        console.log('Rewarded ad finished');
        this.startGameplay(); // Resume gameplay
        onSuccess();
      },
      adError: (error: string) => {
        console.error('Rewarded ad error:', error);
        this.startGameplay(); // Resume gameplay even on error
        // Note: Depending on policy, you might still want to reward or notify the user
      },
    });
  }
}

// Export a singleton instance
export const sdkManager = SDKManager.getInstance();
