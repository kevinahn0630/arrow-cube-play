// Buying with money (2026-11-03): the coin packs and taking the ads out (economy.js
// PACKS, NO_ADS), through Google Play Billing in the app: capacitor-plugin-cdv-purchase,
// its native plugin and its store.js, which tools/build-app.mjs copies to
// vendor/cdv-purchase since the game has no bundler. In a browser nothing can be bought
// and the shop shows no packs; a development build opened with ?fakepay pretends, to try
// the shop out.
import { PACKS, NO_ADS } from './economy.js';
import { DEV } from './build.js';

const cap = window.Capacitor;
const fake = DEV && new URLSearchParams(location.search).has('fakepay');
// Whether this build can take money at all.
const canPay = !!cap?.isNativePlatform?.() || fake;
// Whether the packs can be offered: once Play has said what they cost (not before, nor
// where Play has no such products, as in an APK installed by hand).
export const canSell = () => fake || (ready && PACKS.every((p) => priceOf(p.id)) && !!priceOf(NO_ADS.id));

let store = null; // CdvPurchase.store once it has loaded
let ready = false;
let on = null; // the game's handlers: coins(n, transaction id), noAds(), change()

// Loads the store and registers the products. What comes in is paid out through the
// handlers: purchases made now, and any bought before but not yet paid out (the app
// closed in between), which Play hands over again until they are finished.
export function startBilling(handlers) {
  on = handlers;
  if (fake) ready = true;
  if (fake || !canPay) return;
  window.CdvPurchaseCapacitor = { installed: true };
  const script = document.createElement('script');
  script.src = 'vendor/cdv-purchase/store.js';
  script.onload = setUp;
  document.head.append(script);
}

function setUp() {
  const { store: s, ProductType, Platform, LogLevel } = window.CdvPurchase;
  store = s;
  s.verbosity = LogLevel.WARNING;
  s.register([
    ...PACKS.map(({ id }) => ({ id, type: ProductType.CONSUMABLE, platform: Platform.GOOGLE_PLAY })),
    { id: NO_ADS.id, type: ProductType.NON_CONSUMABLE, platform: Platform.GOOGLE_PLAY },
  ]);
  // Finishing a pack's purchase consumes it, so it can be bought again; finishing the
  // ads' acknowledges it, and Play keeps it owned.
  s.when()
    .approved((tx) => {
      for (const { id } of tx.products) deliver(id, tx.transactionId);
      tx.finish();
    })
    .productUpdated(() => on.change())
    .receiptUpdated(() => s.owned(NO_ADS.id) && on.noAds());
  s.initialize([Platform.GOOGLE_PLAY]).then(() => {
    ready = true;
    on.change();
  });
}

function deliver(id, tx) {
  const pack = PACKS.find((p) => p.id === id);
  if (pack) on.coins(pack.coins, tx);
  else if (id === NO_ADS.id) on.noAds();
}

// Buys a product. Resolves to 'done' (what was bought arrives through the handlers),
// 'cancelled' or 'failed'.
export async function buyProduct(id) {
  if (fake) {
    await new Promise((r) => setTimeout(r, 300));
    deliver(id, `fake-${Date.now()}`);
    return 'done';
  }
  if (!ready) return 'failed';
  const { Platform, ErrorCode } = window.CdvPurchase;
  const offer = store.get(id, Platform.GOOGLE_PLAY)?.getOffer();
  if (!offer) return 'failed';
  const error = await offer.order();
  if (!error) return 'done';
  // The Capacitor plugin passes Play's own code for a purchase the player backed out of
  // (USER_CANCELED, 1) rather than the store's PAYMENT_CANCELLED.
  const cancelled = error.code === ErrorCode.PAYMENT_CANCELLED || Number(error.code) === 1 || /CANCEL/i.test(error.message ?? '');
  return cancelled ? 'cancelled' : 'failed';
}

// A product's price as Play has it ('1,200원' in won), or null until it has said.
export function priceOf(id) {
  const p = ready && store ? store.get(id)?.pricing : null;
  if (!p) return null;
  return p.currency === 'KRW' ? `${(p.priceMicros / 1e6).toLocaleString('ko-KR')}원` : p.price;
}
