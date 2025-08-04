import React from "react";

interface StatsGridProps {
  stats: Record<string, { borrowed: number; collateral: number }>;
  activeLoans: number;
}

const StatsGrid: React.FC<StatsGridProps> = ({ stats, activeLoans }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Object.entries(stats).map(([symbol, { borrowed, collateral }]) => (
        <div
          key={symbol}
          className="bg-white p-5 rounded-lg shadow-md border border-gray-100"
        >
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            {symbol} Summary
          </h3>
          <p className="text-sm text-gray-600">
            <span className="font-medium text-gray-700">Total Borrowed:</span>{" "}
            {borrowed.toFixed(2)} {symbol}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium text-gray-700">Collateral:</span>{" "}
            {collateral.toFixed(2)} {symbol}
          </p>
        </div>
      ))}

      <div className="bg-white p-5 rounded-lg shadow-md border border-gray-100">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          Active Loans
        </h3>
        <p className="text-sm text-gray-600">{activeLoans}</p>
      </div>
    </div>
  );
};

export default StatsGrid;
