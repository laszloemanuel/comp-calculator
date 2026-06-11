/**
 * Netlify Function — MNB exchange-rate proxy (Netlify equivalent of functions/api/rates.js).
 * Reachable at /api/rates via the redirect in netlify.toml.
 */
const WANT = ["EUR", "USD", "BRL"];
const SOAP =
  '<?xml version="1.0" encoding="utf-8"?>' +
  '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://www.mnb.hu/webservices/">' +
  '<soap:Body><web:GetCurrentExchangeRates/></soap:Body></soap:Envelope>';
const CORS = { "content-type": "application/json", "access-control-allow-origin": "*", "cache-control": "public, max-age=86400" };

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };
  try {
    const r = await fetch("https://www.mnb.hu/arfolyamok.asmx", {
      method: "POST",
      headers: { "content-type": "text/xml; charset=utf-8", "SOAPAction": "http://www.mnb.hu/webservices/MNBArfolyamServiceSoap/GetCurrentExchangeRates" },
      body: SOAP
    });
    const xml = (await r.text()).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
    const rates = { HUF: 1 };
    const re = /<Rate unit="(\d+)" curr="([A-Z]{3})">([\d.,\s]+)<\/Rate>/g;
    let m;
    while ((m = re.exec(xml))) {
      const unit = parseInt(m[1], 10) || 1, cur = m[2];
      if (WANT.indexOf(cur) < 0) continue;
      const val = parseFloat(m[3].replace(/\s/g, "").replace(/\./g, "").replace(",", "."));
      if (val) rates[cur] = val / unit;
    }
    if (!rates.EUR || !rates.USD) throw new Error("MNB response could not be parsed");
    const dm = xml.match(/<Day date="([\d-]+)"/);
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ rates, source: "MNB", date: dm ? dm[1] : null }) };
  } catch (e) {
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: String((e && e.message) || e) }) };
  }
};
