import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { WagmiProvider } from "wagmi";
import { config } from "./providers/wallet";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <RainbowKitProvider>
        <App />
      </RainbowKitProvider>
    </WagmiProvider>
  </React.StrictMode>
);
