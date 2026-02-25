import type { VercelRequest, VercelResponse } from “@vercel/node”;
import crypto from “crypto”;
import { v4 as uuidv4 } from “uuid”;

function buildJWT(apiKey: string, apiSecret: string, method: string, host: string, path: string): string {
const url = `${method} ${host}${path}`;
const header = Buffer.from(JSON.stringify({ alg: “ES256”, kid: apiKey, nonce: crypto.randomBytes(16).toString(“hex”) })).toString(“base64url”);
const now = Math.floor(Date.now() / 1000);
const payload = Buffer.from(JSON.stringify({ sub: apiKey, iss: “cdp”, aud: [“retail_rest_api_proxy”], nbf: now, exp: now + 120, uri: url })).toString(“base64url”);
const signingInput = `${header}.${payload}`;

const pemKey = apiSecret.replace(/\n/g, “\n”).trim();
const sign = crypto.createSign(“SHA256”);
sign.update(signingInput);
const derSignature = sign.sign({ key: pemKey, dsaEncoding: “der” });

const r = derSignature.slice(4, 4 + 32);
const s = derSignature.slice(4 + 32 + 2);
const rawSig = Buffer.concat([r, s]).toString(“base64url”);

return `${signingInput}.${rawSig}`;
}

interface TradeOrderResponse {
order_id?: string;
success_response?: { order_id?: string };
status?: string;
error?: string;
error_response?: { message?: string };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
res.setHeader(“Access-Control-Allow-Origin”, process.env.ALLOWED_ORIGIN ?? “*”);
res.setHeader(“Access-Control-Allow-Methods”, “POST, OPTIONS”);
res.setHeader(“Access-Control-Allow-Headers”, “Content-Type”);

if (req.method === “OPTIONS”) return res.status(200).end();
if (req.method !== “POST”) return res.status(405).json({ error: “Method not allowed” });

const apiKey = process.env.COINBASE_API_KEY ?? “”;
const apiSecret = process.env.COINBASE_API_SECRET ?? “”;

const { type, symbol, amount } = req.body as { type: string; symbol: string; amount: number };

if (!type || !symbol || !amount) {
return res.status(400).json({ error: “Missing required fields: type, symbol, amount” });
}

if (![“buy”, “sell”].includes(type)) {
return res.status(400).json({ error: “type must be buy or sell” });
}

try {
const host = “api.coinbase.com”;
const path = “/api/v3/brokerage/orders”;
const orderBody = JSON.stringify({
client_order_id: uuidv4(),
product_id: `${symbol}-USD`,
side: type.toUpperCase(),
order_configuration: {
market_market_ioc: {
…(type === “buy” ? { quote_size: String(amount) } : { base_size: String(amount) }),
},
},
});

```
const jwt = buildJWT(apiKey, apiSecret, "POST", host, path);
const response = await fetch(`https://${host}${path}`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${jwt}`,
    "Content-Type": "application/json",
  },
  body: orderBody,
});

const data = await response.json() as TradeOrderResponse;

if (!response.ok) {
  const errorMsg = data.error_response?.message ?? data.error ?? "Trade failed";
  return res.status(response.status).json({ error: errorMsg });
}

return res.status(200).json({
  success: true,
  orderId: data.order_id ?? data.success_response?.order_id,
  status: data.status ?? "pending",
});
```

} catch (err) {
return res.status(500).json({ error: “Failed to execute trade”, details: String(err) });
}
}
