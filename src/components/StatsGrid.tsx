const StatsGrid = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium">Total Balance</h3>
                <p className="text-2xl font-bold">$5,000</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium">Active Loans</h3>
                <p className="text-2xl font-bold">2</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-medium">Pending</h3>
                <p className="text-2xl font-bold">$1,200</p>
            </div>
        </div>
    );
};

export default StatsGrid;