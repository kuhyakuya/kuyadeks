// assets/pricing.js

// ===== Helpers =====
const fmtIDR = n => "IDR " + (Number(n)||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
function numberWithSeparators(x){return (x??0).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',')}

// Cari buffer fee sesuai durasi
function computeBufferPercent(durasi, map){
  if(!map) return 0;
  const keys = Object.keys(map).map(Number).sort((a,b)=>a-b);
  let percent = 0;
  for(const k of keys){ if(durasi > k) percent = Number(map[k])||0; }
  return percent;
}

// ===== Load Config =====
async function loadConfig(basePath=".."){
  const [pricesRes, promoRes] = await Promise.allSettled([
    fetch(`${basePath}/config/prices.json?ts=${Date.now()}`).then(r=>r.json()),
    fetch(`${basePath}/config/promo.json?ts=${Date.now()}`).then(r=>r.ok?r.json():{})
  ]);
  return {
    prices: pricesRes.value || {},
    promo: promoRes.value || {}
  };
}

// ===== Diskon =====
function getFinalPrice(pkg, promo){
  const disc = promo?.discounts?.[pkg.id]?.percent || 0;
  const final = disc > 0 ? Math.round(pkg.price * (1 - disc/100)) : pkg.price;
  return { normal: pkg.price, percent: disc, final };
}

// ===== Hitung Total =====
function calcTotal(pkg, cfg, promo, durasi, deadline){
  const {normal, percent, final} = getFinalPrice(pkg, promo);

  // overtime
  const overMin = Math.max(0, durasi-5);
  const overCost = overMin * (pkg.overRatePerMin || 0);

  // subtotal setelah diskon + overtime
  const subTotal = final + overCost;

  // surcharge
  const surPerc = cfg.surcharge?.[deadline] || 0;
  const surchargeVal = Math.round(subTotal * (surPerc/100));

  // buffer fee
  const bufPerc = computeBufferPercent(durasi, cfg.bufferFee);
  const bufVal = Math.round((subTotal+surchargeVal) * (bufPerc/100));

  const total = subTotal + surchargeVal + bufVal;

  return {
    normal,                // harga asli
    discountPercent: percent,
    baseFinal: final,      // harga setelah diskon
    overMin,
    overRate: pkg.overRatePerMin,
    overCost,
    surchargeVal,
    surPerc,
    bufVal,
    bufPerc,
    total
  };
}

// ===== Exports =====
window.Pricing = {
  fmtIDR,
  loadConfig,
  getFinalPrice,
  calcTotal
};
