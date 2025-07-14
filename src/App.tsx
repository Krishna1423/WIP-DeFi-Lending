import { Dashboard } from "./pages";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { config } from "./providers/wallet";
import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider, useAccount } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient();

const App = () => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <AppContent />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

const AppContent = () => {
  const { isConnected } = useAccount();

  return (
    <div className="p-4">
      <ConnectButton />
      {isConnected ? (
        <Dashboard />
      ) : (
        <p className="mt-4 text-gray-600">
          Please connect your wallet to view the dashboard.
        </p>
      )}
    </div>
  );
};

export default App;
