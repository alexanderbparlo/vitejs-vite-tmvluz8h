import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

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
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.COINBASE_API_KEY ?? "";
  const apiSecret = process.env.COINBASE_API_SECRET ?? "";

  const { type, symbol, amount } = req.body;

  if (!type || !symbol || !amount) {
    return res.status(400).json({ error: "Missing required fields: type, symbol, amount" });
  }

  if (!["buy", "sell"].includes(type)) {
    return res.status(400).json({ error: "type must be buy or sell" });
  }

  try {
    const path = "/api/v3/brokerage/orders";
    const orderBody = JSON.stringify({
      client_order_id: uuidv4(),
      product_id: `${symbol}-USD`,
      side: type.toUpperCase(),
      order_configuration: {
        market_market_ioc: {
          // For buys, specify quote_size (USD amount); for sells, specify base_size (coin amount)
          ...(type === "buy"
            ? { quote_size: String(amount) }
            : { base_size: String(amount) }),
        },
      },
    });

    const headers = signRequest("POST", path, orderBody, apiKey, apiSecret);
    const response = await fetch(`https://api.coinbase.com${path}`, {
      method: "POST",
      headers,
      body: orderBody,
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    return res.status(200).json({
      success: true,
      orderId: data.order_id ?? data.success_response?.order_id,
      status: data.status ?? "pending",
    });
  } catch (err) {
    console.error("Trade execution error:", err);
    return res.status(500).json({ error: "Failed to execute trade" });
  }
}
