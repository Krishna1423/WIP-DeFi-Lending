import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygonMumbai } from 'wagmi/chains';
import { http } from 'viem';

export const config = getDefaultConfig({
    appName: 'Micro-Lending',
    projectId: 'YOUR_PROJECT_ID', // Replace at cloud.walletconnect.com
    chains: [polygonMumbai],
    transports: {
        [polygonMumbai.id]: http(),
    },
    ssr: false // Important for Vite compatibility
});

export { RainbowKitProvider } from '@rainbow-me/rainbowkit';