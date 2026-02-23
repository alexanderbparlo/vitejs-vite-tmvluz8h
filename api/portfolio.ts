import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";

function signRequest(
  method: string,
  path: string,
  body: string,
  apiKey: string,
  apiSecret: string
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message = timestamp + method.toUpperCase() + path + body;
  const signature = crypto.createHmac("sha256", apiSecret).update(message).digest("hex");
  return {
    "CB-ACCESS-KEY": apiKey,
    "CB-ACCESS-SIGN": signature,
    "CB-ACCESS-TIMESTAMP": timestamp,
    "Content-Type": "application/json",
  };
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
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN ?? "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.COINBASE_API_KEY ?? "";
  const apiSecret = process.env.COINBASE_API_SECRET ?? "";

  if (!apiKey || !apiSecret) {
    return res.status(500).json({ error: "Coinbase credentials not configured", hasKey: !!apiKey, hasSecret: !!apiSecret });
  }

  try {
    const path = "/api/v3/brokerage/accounts";
    const headers = signRequest("GET", path, "", apiKey, apiSecret);
    const accountsRes = await fetch(`https://api.coinbase.com${path}`, { headers });
    const rawText = await accountsRes.text();

    let accountsData: CoinbaseAccountsResponse;
    try {
      accountsData = JSON.parse(rawText) as CoinbaseAccountsResponse;
    } catch {
      return res.status(500).json({ error: "Coinbase returned invalid JSON", raw: rawText.slice(0, 500) });
    }

    if (!accountsRes.ok) {
      return res.status(accountsRes.status).json({
        error: "Coinbase API error",
        status: accountsRes.status,
        details: accountsData,
      });
    }

    const accounts = (accountsData.accounts ?? []).filter(
      (a: CoinbaseAccount) => parseFloat(a.available_balance?.value ?? "0") > 0
    );

    const symbols = accounts
      .map((a: CoinbaseAccount) => a.currency)
      .filter((c: string) => c !== "USD" && c !== "USDC" && c !== "USDT");

    const pricePromises = symbols.map(async (symbol: string) => {
      const pricePath = `/api/v3/brokerage/best_bid_ask?product_ids=${symbol}-USD`;
      const priceHeaders = signRequest("GET", pricePath, "", apiKey, apiSecret);
      const priceRes = await fetch(`https://api.coinbase.com${pricePath}`, { headers: priceHeaders });
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
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch portfolio", details: String(err) });
  }
}
