export default function LendMarketplace() {
    const loans = [
        { id: 1, amount: '250', duration: '7', interest: '3%', borrower: '0x1a2...3b4' },
        { id: 2, amount: '500', duration: '30', interest: '5%', borrower: '0x5c6...7d8' }
    ];

    return (
        <div className="marketplace">
            <div className="marketplace-header">
                <h2>Available Loans</h2>
                <div className="filter-controls">
                    <select className="filter-select">
                        <option>All Loans</option>
                        <option>Short-term (7d)</option>
                        <option>Medium-term (7-30d)</option>
                    </select>
                </div>
            </div>

            <div className="loan-grid">
                {loans.map(loan => (
                    <div key={loan.id} className="loan-card">
                        <div className="loan-amount">
                            <span>{loan.amount}</span> DAI
                        </div>
                        <div className="loan-details">
                            <p><i className="fas fa-clock"></i> {loan.duration} days</p>
                            <p><i className="fas fa-percentage"></i> {loan.interest} interest</p>
                            <p className="borrower-address">
                                <i className="fas fa-user"></i> {loan.borrower}
                            </p>
                        </div>
                        <button className="fund-button">
                            <i className="fas fa-wallet"></i> Fund Loan
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}