import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

type TokenInfo = {
  name: string;
  id: string;
  symbol: string;
};

const TOKENS: TokenInfo[] = [
  { name: "USD Coin", id: "usd-coin", symbol: "USDC" },
  { name: "Dai", id: "dai", symbol: "DAI" },
  { name: "Euro Coin", id: "euro-coin", symbol: "EURC" },
  { name: "Ethereum", id: "ethereum", symbol: "ETH" },
  { name: "Bitcoin", id: "bitcoin", symbol: "BTC" },
  { name: "Tether", id: "tether", symbol: "USDT" },
  { name: "Solana", id: "solana", symbol: "SOL" },
  { name: "Cardano", id: "cardano", symbol: "ADA" },
  { name: "Polkadot", id: "polkadot", symbol: "DOT" },
  { name: "Uniswap", id: "uniswap", symbol: "UNI" },
  { name: "Link", id: "link", symbol: "LINK" },
];

type CoinGeckoResponse = {
  [key: string]: {
    usd: number;
    usd_24h_change: number;
  };
};

const PriceTicker = () => {
  const [prices, setPrices] = useState<
    { symbol: string; price: number; change: number }[]
  >([]);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const ids = TOKENS.map((t) => t.id).join(",");
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
        );
        const data = (await res.json()) as CoinGeckoResponse;

        const parsed = TOKENS.map((token) => ({
          symbol: token.symbol,
          price: data[token.id]?.usd,
          change: data[token.id]?.usd_24h_change ?? 0,
        }));

        setPrices(parsed);
      } catch (err) {
        console.error("Price fetch failed:", err);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30_000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gray-100 p-4 rounded-xl shadow-md mb-6">
      <h1 className="text-lg font-semibold mb-2 text-gray-800">Live Prices</h1>
      <div className="flex flex-wrap gap-4">
        {prices.map(({ symbol, price, change }) => {
          const isUp = change >= 0;
          const Icon = isUp ? ArrowUpRight : ArrowDownRight;
          return (
            <div
              key={symbol}
              className="bg-white rounded-xl px-4 py-2 shadow flex items-center gap-2 min-w-[120px]"
            >
              <span className="font-bold text-gray-800">{symbol}</span>
              <span className="text-gray-700">${price?.toFixed(2) || "0.00"}</span>
              <span
                className={`flex items-center text-sm font-medium ${
                  isUp ? "text-green-600" : "text-red-600"
                }`}
              >
                <Icon size={16} className="mr-1" />
                {change.toFixed(2)}%
              </span>
            </div>
          );
        })}
        <div
          key="more-prices"
          className="flex flex-col items-center justify-center bg-gradient-to-br from-purple-600 to-indigo-600 text-white px-4 py-3 rounded-2xl shadow hover:shadow-md cursor-pointer transition duration-200"
          onClick={() => window.open("https://www.coingecko.com/en", "_blank")}
        >
          <div className="text-lg font-semibold">More Prices</div>
        </div>
      </div>
    </div>
  );
};

export default PriceTicker;
