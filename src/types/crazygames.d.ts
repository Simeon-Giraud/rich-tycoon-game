interface CrazyGamesSDK {
  ad: {
    requestAd: (
      type: 'rewarded' | 'midroll',
      callbacks: {
        adStarted: () => void;
        adFinished: () => void;
        adError: (error: string) => void;
      }
    ) => void;
  };
  game: {
    sdkFinished: () => void;
    gameplayStart: () => void;
    gameplayStop: () => void;
  };
  user: {
    isUserAccountAvailable: boolean;
    getUser: () => Promise<any>;
    getSystemInfo: () => any;
  };
  data: {
    save: (data: string) => Promise<void>;
    load: () => Promise<string | null>;
  };
}

interface Window {
  CrazyGames: {
    SDK: CrazyGamesSDK;
  };
}
