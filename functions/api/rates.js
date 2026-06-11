/**
 * Cloudflare Pages Function — MNB exchange-rate proxy.
 * Route: /api/rates  → returns { rates: { HUF:1, EUR, USD, BRL }, source:"MNB", date }
 * where each value is HUF per 1 unit of that currency (MNB convention).
 *
 * The browser can't call MNB directly (no CORS); this server-side function can.
 * The front-end caches the result for a week and falls back to ECB/Frankfurter
 * then a built-in snapshot when this endpoint isn't deployed (e.g. GitHub Pages).
 */
const WANT = ["EUR", "USD", "BRL"];
const SOAP =
  '<?xml version="1.0" encoding="utf-8"?>' +
  '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://www.mnb.hu/webservices/">' +
  '<soap:Body><web:GetCurrentExchangeRates/></soap:Body></soap:Envelope>';

async function fetchMNB() {
  const r = await fetch("https://www.mnb.hu/arfolyamok.asmx", {
    method: "POST",
    headers: {
      "content-type": "text/xml; charset=utf-8",
      "SOAPAction": "http://www.mnb.hu/webservices/MNBArfolyamServiceSoap/GetCurrentExchangeRates"
    },
    body: SOAP
  });
  const raw = await r.text();
  // The SOAP result embeds an escaped XML document — unescape it.
  const xml = raw.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  const rates = { HUF: 1 };
  const re = /<Rate unit="(\d+)" curr="([A-Z]{3})">([\d.,\s]+)<\/Rate>/g;
  let m;
  while ((m = re.exec(xml))) {
    const unit = parseInt(m[1], 10) || 1;
    const cur = m[2];
    if (WANT.indexOf(cur) < 0) continue;
    const val = parseFloat(m[3].replace(/\s/g, "").replace(/\./g, "").replace(",", "."));
    if (val) rates[cur] = val / unit;
  }
  const dm = xml.match(/<Day date="([\d-]+)"/);
  return { rates, source: "MNB", date: dm ? dm[1] : null };
}

export async function onRequestGet() {
  const cors = { "content-type": "application/json", "access-control-allow-origin": "*", "cache-control": "public, max-age=86400" };
  try {
    const data = await fetchMNB();
    if (!data.rates.EUR || !data.rates.USD) throw new Error("MNB response could not be parsed");
    return new Response(JSON.stringify(data), { headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e && e.message) || e) }), { status: 502, headers: cors });
  }
}
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS" } });
}
