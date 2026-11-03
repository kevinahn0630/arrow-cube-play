// Rewarded ads. In the app: AdMob (@capacitor-community/admob), called through the
// Capacitor bridge since the game has no bundler, with Google's test ads until the
// app has its own AdMob account. In a browser there are no ads and the reward comes
// at once (the web build is for friends to try, 2026-11-03 user decision).
const cap = window.Capacitor;
const native = !!cap?.isNativePlatform?.();
// Google's sample rewarded ad unit: always serves a test ad.
const UNIT = 'ca-app-pub-3940256099942544/5224354917';

let loading = null; // the next ad being loaded: resolves to whether it loaded
function preload() {
  loading = cap.nativePromise('AdMob', 'prepareRewardVideoAd', { adId: UNIT }).then(
    () => true,
    () => false,
  );
}
if (native) cap.nativePromise('AdMob', 'initialize', {}).then(preload, preload);

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
