// Ads: rewarded ones the player chooses to watch, and a full-screen one now and then
// between stages (economy.js AD_EVERY). In the app: AdMob (@capacitor-community/admob),
// called through the Capacitor bridge since the game has no bundler, with Google's test
// ads until the app has its own AdMob account. In a browser there are no ads and the
// reward comes at once (the web build is for friends to try, 2026-11-03 user decision).
const cap = window.Capacitor;
export const native = !!cap?.isNativePlatform?.();
// Google's sample ad units: they always serve test ads.
const UNIT = 'ca-app-pub-3940256099942544/5224354917';
const BETWEEN = 'ca-app-pub-3940256099942544/1033173712';

let loading = null; // the next rewarded ad being loaded: resolves to whether it loaded
let loadingBetween = null; // the same for the next full-screen ad
let lastAd = 0; // when the last ad of either kind closed
// Time since the last ad closed.
export const sinceAd = () => Date.now() - lastAd;
function preload() {
  loading = cap.nativePromise('AdMob', 'prepareRewardVideoAd', { adId: UNIT }).then(
    () => true,
    () => false,
  );
}
function preloadBetween() {
  loadingBetween = cap.nativePromise('AdMob', 'prepareInterstitial', { adId: BETWEEN }).then(
    () => true,
    () => false,
  );
}
if (native)
  cap.nativePromise('AdMob', 'initialize', {}).then(
    () => (preload(), preloadBetween()),
    () => (preload(), preloadBetween()),
  );

// Shows a full-screen ad if one has loaded; resolves once it is closed (true), or at
// once if there was none to show (false).
export async function interstitial() {
  if (!native) return false;
  if (!loadingBetween) preloadBetween();
  if (!(await loadingBetween)) {
    preloadBetween();
    return false;
  }
  return new Promise((resolve) => {
    let done = false;
    const ends = [];
    const finish = (shown) => {
      if (done) return;
      done = true;
      for (const l of ends) l.remove();
      lastAd = Date.now();
      preloadBetween();
      resolve(shown);
    };
    // showInterstitial resolves as the ad opens; it is over when it is dismissed.
    ends.push(cap.addListener('AdMob', 'interstitialAdDismissed', () => finish(true)));
    ends.push(cap.addListener('AdMob', 'interstitialAdFailedToShow', () => finish(false)));
    cap.nativePromise('AdMob', 'showInterstitial', {}).catch(() => finish(false));
  });
}

// Shows a rewarded ad. Resolves to 'earned' once the player has earned the reward,
// 'closed' if they closed it before that, 'failed' if no ad would load.
export async function rewarded() {
  if (!native) return 'earned';
  if (!loading) preload();
  if (!(await loading)) {
    preload();
    return 'failed';
  }
  return new Promise((resolve) => {
    let done = false;
    let closed = null;
    const finish = (how) => {
      if (done) return;
      done = true;
      closed?.remove();
      lastAd = Date.now();
      preload();
      resolve(how);
    };
    // The reward comes before the ad is closed; closing without it means no reward.
    closed = cap.addListener('AdMob', 'onRewardedVideoAdDismissed', () => setTimeout(() => finish('closed'), 400));
    cap.nativePromise('AdMob', 'showRewardVideoAd', {}).then(
      () => finish('earned'),
      () => finish('failed'),
    );
  });
}
