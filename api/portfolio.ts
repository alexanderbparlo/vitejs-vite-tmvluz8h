import type { VercelRequest, VercelResponse } from “@vercel/node”;
import crypto from “crypto”;

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

interface CoinbaseAccount {
currency: string;
name: string;
available_balance: { value: string; currency: string };
}

interface CoinbaseAccountsResponse {
accounts?: CoinbaseAccount[];
}

interface CoinbasePriceResponse {
pricebooks?: Array<{ asks?: Array<{ price: string }> }>;
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
const accountsPath = “/api/v3/brokerage/accounts”;
const jwt = buildJWT(apiKey, apiSecret, “GET”, host, accountsPath);

```
const accountsRes = await fetch(`https://${host}${accountsPath}`, {
  headers: {
    "Authorization": `Bearer ${jwt}`,
    "Content-Type": "application/json",
  },
});

const rawText = await accountsRes.text();
let accountsData: CoinbaseAccountsResponse;
try {
  accountsData = JSON.parse(rawText) as CoinbaseAccountsResponse;
} catch {
  return res.status(500).json({ error: "Coinbase returned invalid JSON", raw: rawText.slice(0, 500) });
}

if (!accountsRes.ok) {
  return res.status(accountsRes.status).json({ error: "Coinbase API error", status: accountsRes.status, details: accountsData });
}

const accounts = (accountsData.accounts ?? []).filter(
  (a: CoinbaseAccount) => parseFloat(a.available_balance?.value ?? "0") > 0
);

const symbols = accounts
  .map((a: CoinbaseAccount) => a.currency)
  .filter((c: string) => c !== "USD" && c !== "USDC" && c !== "USDT");

const pricePromises = symbols.map(async (symbol: string) => {
  const pricePath = `/api/v3/brokerage/best_bid_ask?product_ids=${symbol}-USD`;
  const priceJwt = buildJWT(apiKey, apiSecret, "GET", host, `/api/v3/brokerage/best_bid_ask`);
  const priceRes = await fetch(`https://${host}${pricePath}`, {
    headers: { "Authorization": `Bearer ${priceJwt}`, "Content-Type": "application/json" },
  });
  const priceData = await priceRes.json() as CoinbasePriceResponse;
  const price = parseFloat(priceData.pricebooks?.[0]?.asks?.[0]?.price ?? "0");
  return { symbol, price };
});

const prices = await Promise.all(pricePromises);
const priceMap: Record<string, number> = {};
prices.forEach(({ symbol, price }: { symbol: string; price: number }) => {
  priceMap[symbol] = price;
});

const portfolio = accounts.map((account: CoinbaseAccount) => {
  const symbol = account.currency;
  const amount = parseFloat(account.available_balance.value);
  const price = priceMap[symbol] ?? 1;
  return { symbol, name: account.name, amount, price, value: amount * price };
});

const totalValue = portfolio.reduce((sum: number, h: { value: number }) => sum + h.value, 0);
return res.status(200).json({ portfolio, totalValue });
```

} catch (err) {
return res.status(500).json({ error: “Failed to fetch portfolio”, details: String(err) });
}
}
