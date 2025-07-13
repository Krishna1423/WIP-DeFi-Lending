import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { WagmiProvider } from 'wagmi';
import { config } from './providers/wallet';
import { RainbowKitProvider } from './providers/wallet';
//import '@fortawesome/fontawesome-free/css/all.min.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <WagmiProvider config={config}>
            <RainbowKitProvider>
                <App />
            </RainbowKitProvider>
        </WagmiProvider>
    </React.StrictMode>
);