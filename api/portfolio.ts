import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";

// Sign a Coinbase Advanced Trade API request
function signRequest(
  method: string,
  path: string,
  body: string,
  apiKey: string,
  apiSecret: string
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message = timestamp + method.toUpperCase() + path + body;
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(message)
    .digest("hex");

  return {
    "CB-ACCESS-KEY": apiKey,
    "CB-ACCESS-SIGN": signature,
    "CB-ACCESS-TIMESTAMP": timestamp,
    "Content-Type": "application/json",
  };
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
    return res.status(500).json({ error: "Coinbase credentials not configured" });
  }

  try {
    const path = "/api/v3/brokerage/accounts";
    const headers = signRequest("GET", path, "", apiKey, apiSecret);

    const accountsRes = await fetch(`https://api.coinbase.com${path}`, { headers });
    const accountsData = await accountsRes.json();

    if (!accountsRes.ok) {
      return res.status(accountsRes.status).json({ error: accountsData });
    }

    // Filter accounts that have a balance
    const accounts = (accountsData.accounts ?? []).filter(
      (a: { available_balance: { value: string } }) =>
        parseFloat(a.available_balance?.value ?? "0") > 0
    );

    // Get current prices for each held asset
    const symbols = accounts
      .map((a: { currency: string }) => a.currency)
      .filter((c: string) => c !== "USD" && c !== "USDC" && c !== "USDT");

    const pricePromises = symbols.map(async (symbol: string) => {
      const pricePath = `/api/v3/brokerage/best_bid_ask?product_ids=${symbol}-USD`;
      const priceHeaders = signRequest("GET", pricePath, "", apiKey, apiSecret);
      const priceRes = await fetch(`https://api.coinbase.com${pricePath}`, { headers: priceHeaders });
      const priceData = await priceRes.json();
      const price = parseFloat(priceData.pricebooks?.[0]?.asks?.[0]?.price ?? "0");
      return { symbol, price };
    });

    const prices = await Promise.all(pricePromises);
    const priceMap: Record<string, number> = {};
    prices.forEach(({ symbol, price }: { symbol: string; price: number }) => {
      priceMap[symbol] = price;
    });

    // Build portfolio response
    const portfolio = accounts.map((account: {
      currency: string;
      available_balance: { value: string; currency: string };
      name: string;
    }) => {
      const symbol = account.currency;
      const amount = parseFloat(account.available_balance.value);
      const price = priceMap[symbol] ?? 1; // USD stablecoins default to 1
      return {
        symbol,
        name: account.name,
        amount,
        price,
        value: amount * price,
      };
    });

    const totalValue = portfolio.reduce(
      (sum: number, h: { value: number }) => sum + h.value,
      0
    );

    return res.status(200).json({ portfolio, totalValue });
  } catch (err) {
    console.error("Coinbase portfolio error:", err);
    return res.status(500).json({ error: "Failed to fetch portfolio" });
  }
}
