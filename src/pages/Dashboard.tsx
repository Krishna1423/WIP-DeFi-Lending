import { Card, StatsGrid, TransactionHistory } from '../components';

const Dashboard = () => {
    return (
        <div className="dashboard-container p-6">
            <h1 className="text-3xl font-bold mb-6">Your Financial Overview</h1>
            <StatsGrid />
            <div className="grid md:grid-cols-2 gap-6 mt-8">
                <Card title="Recent Activity">
                    <TransactionHistory />
                </Card>
                <Card title="Quick Actions">
                    <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                        Request Loan
                    </button>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;