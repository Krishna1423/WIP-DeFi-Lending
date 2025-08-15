import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Lend from "./pages/Lend";
import Borrow from "./pages/Borrow";
import MyLoans from "./pages/Loans";

import NavBar from "./components/NavBar";
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
          <Router>
            <AppContent />
          </Router>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

const AppContent = () => {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="p-4">
        {isConnected ? (
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/borrow" element={<Borrow />} />
            <Route path="/lend" element={<Lend />} />
            <Route path="/my-loans" element={<MyLoans />} />
          </Routes>
        ) : (
          <div className="mt-4 text-gray-600 text-center">
            <ConnectButton />
            <p>Please connect your wallet to access the app.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
