import type { VercelRequest, VercelResponse } from “@vercel/node”;
import crypto from “crypto”;

function buildJWT(apiKey: string, apiSecret: string, method: string, host: string, path: string): string {
const url = `${method} ${host}${path}`;
const header = Buffer.from(JSON.stringify({ alg: “ES256”, kid: apiKey, nonce: crypto.randomBytes(16).toString(“hex”) })).toString(“base64url”);
const now = Math.floor(Date.now() / 1000);
const payload = Buffer.from(JSON.stringify({ sub: apiKey, iss: “cdp”, aud: [“retail_rest_api_proxy”], nbf: now, exp: now + 120, uri: url })).toString(“base64url”);
const signingInput = `${header}.${payload}`;

// Clean up the PEM key
const pemKey = apiSecret.replace(/\n/g, “\n”).trim();
const sign = crypto.createSign(“SHA256”);
sign.update(signingInput);
const derSignature = sign.sign({ key: pemKey, dsaEncoding: “der” });

// Convert DER to raw R||S for ES256
const r = derSignature.slice(4, 4 + 32);
const s = derSignature.slice(4 + 32 + 2);
const rawSig = Buffer.concat([r, s]).toString(“base64url”);

return `${signingInput}.${rawSig}`;
}

const TOP_COINS = [
“BTC-USD”, “ETH-USD”, “SOL-USD”, “BNB-USD”,
“XRP-USD”, “DOGE-USD”, “AVAX-USD”, “DOT-USD”,
“LINK-USD”, “ADA-USD”,
];

interface CoinbaseProduct {
product_id: string;
price: string;
price_percentage_change_24h: string;
volume_24h: string;
}

interface CoinbaseProductsResponse {
products?: CoinbaseProduct[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
res.setHeader(“Access-Control-Allow-Origin”, process.env.ALLOWED_ORIGIN ?? “*”);
res.setHeader(“Access-Control-Allow-Methods”, “GET, OPTIONS”);
res.setHeader(“Access-Control-Allow-Headers”, “Content-Type”);

if (req.method === “OPTIONS”) return res.status(200).end();
if (req.method !== “GET”) return res.status(405).json({ error: “Method not allowed” });

const apiKey = process.env.COINBASE_API_KEY ?? “”;
const apiSecret = process.env.COINBASE_API_SECRET ?? “”;

if (!apiKey || !apiSecret) {
return res.status(500).json({ error: “Coinbase credentials not configured”, hasKey: !!apiKey, hasSecret: !!apiSecret });
}

try {
const host = “api.coinbase.com”;
const productIds = TOP_COINS.join(”&product_ids=”);
const path = `/api/v3/brokerage/products?product_ids=${productIds}`;
const jwt = buildJWT(apiKey, apiSecret, “GET”, host, `/api/v3/brokerage/products`);

```
const response = await fetch(`https://${host}${path}`, {
  headers: {
    "Authorization": `Bearer ${jwt}`,
    "Content-Type": "application/json",
  },
});

const rawText = await response.text();
let data: CoinbaseProductsResponse;
try {
  data = JSON.parse(rawText) as CoinbaseProductsResponse;
} catch {
  return res.status(500).json({ error: "Coinbase returned invalid JSON", raw: rawText.slice(0, 500) });
}

if (!response.ok) {
  return res.status(response.status).json({ error: "Coinbase API error", status: response.status, details: data });
}

const market = (data.products ?? []).map((p: CoinbaseProduct) => ({
  symbol: p.product_id.replace("-USD", ""),
  price: parseFloat(p.price ?? "0"),
  change: parseFloat(p.price_percentage_change_24h ?? "0"),
  volume: parseFloat(p.volume_24h ?? "0"),
}));

return res.status(200).json({ market });
```

} catch (err) {
return res.status(500).json({ error: “Failed to fetch market data”, details: String(err) });
}
}
