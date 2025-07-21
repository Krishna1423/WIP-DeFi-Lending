// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract DeFi {
    struct Loan {
        address borrower;
        address lender;
        address collateralToken;
        address loanToken;
        uint128 collateralAmount;
        uint128 loanAmount;
        uint16 interestRate; // in basis points (e.g., 500 = 5%)
        uint256 startTime;
        uint256 duration; // in seconds
        bool isFunded;
        bool isRepaid;
    }

    uint64 public loanCounter;
    mapping(uint128 => Loan) public loans;
    mapping(address => bool) public allowedCollateralTokens;
    mapping(address => bool) public allowedLoanTokens;
    uint256 public constant MIN_COLLATERAL_RATIO = 150; // 150%

    event LoanRequested(uint128 loanId, address borrower, uint128 amount);
    event LoanFunded(uint128 loanId, address lender);
    event LoanRepaid(uint128 loanId);

    constructor(address[] memory _allowedCollateral, address[] memory _allowedLoanTokens) {
        for (uint i = 0; i < _allowedCollateral.length; i++) {
            allowedCollateralTokens[_allowedCollateral[i]] = true;
        }
        for (uint i = 0; i < _allowedLoanTokens.length; i++) {
            allowedLoanTokens[_allowedLoanTokens[i]] = true;
        }
    }

    // Borrower requests a loan
    function requestLoan(
        address _collateralToken,
        address _loanToken,
        uint128 _collateralAmount,
        uint128 _loanAmount,
        uint16 _interestRate, // e.g. 500 = 5%
        uint256 _duration // in seconds
    ) external {
        require(allowedCollateralTokens[_collateralToken], "Collateral token not supported");
        require(allowedLoanTokens[_loanToken], "Loan token not supported");

        // Transfer collateral to contract
        require(
            IERC20(_collateralToken).transferFrom(msg.sender, address(this), _collateralAmount),
            "Collateral transfer failed"
        );

        // Mocked oracle call: assume price returned in 18 decimals
        uint256 collateralTokenPrice = getMockPrice(_collateralToken); // e.g., 1 USDC = $1 → return 1e18
        uint256 collateralValue = (_collateralAmount * collateralTokenPrice) / 1e18;

        // Collateral ratio = (collateralValue / loanAmount) * 100
        uint256 collateralRatio = (collateralValue * 100) / _loanAmount;

        require(collateralRatio >= MIN_COLLATERAL_RATIO, "Collateral ratio below minimum threshold");

        loanCounter++;
        loans[loanCounter] = Loan({
            borrower: msg.sender,
            lender: address(0),
            collateralToken: _collateralToken,
            loanToken: _loanToken,
            collateralAmount: _collateralAmount,
            loanAmount: _loanAmount,
            interestRate: _interestRate,
            startTime: 0,
            duration: _duration,
            isFunded: false,
            isRepaid: false
        });

        emit LoanRequested(loanCounter, msg.sender, _loanAmount);
    }

    function getMockPrice(address token) internal pure returns (uint256) {
        //sepolia usdc
        if (token == 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238) return 1e18;  // $1
        //sepolia dai
        if (token == 0x3e622317f8C93f7328350cF0B56d9eD4C620C5d6)  return 1e18;  // $1
        //if (token == 0x...WETH) return 2000e18; // $2000 per ETH
        return 0;
    }


    // Lender funds the loan
    function fundLoan(uint128 _loanId) external {
        Loan storage loan = loans[_loanId];
        require(!loan.isFunded, "Already funded");
        require(loan.borrower != address(0), "Invalid loan");

        // Transfer loan amount to borrower
        require(
            IERC20(loan.loanToken).transferFrom(msg.sender, loan.borrower, loan.loanAmount),
            "Funding failed"
        );

        loan.lender = msg.sender;
        loan.startTime = block.timestamp;
        loan.isFunded = true;

        emit LoanFunded(_loanId, msg.sender);
    }

    // Borrower repays the loan with interest
    function repayLoan(uint128 _loanId) external {
        Loan storage loan = loans[_loanId];
        require(loan.isFunded, "Loan not funded");
        require(!loan.isRepaid, "Already repaid");
        require(msg.sender == loan.borrower, "Only borrower can repay");

        uint256 interest = (loan.loanAmount * loan.interestRate) / 10000;
        uint256 totalRepayment = loan.loanAmount + interest;

        require(
            IERC20(loan.loanToken).transferFrom(msg.sender, loan.lender, totalRepayment),
            "Repayment failed"
        );

        // Return collateral to borrower
        require(
            IERC20(loan.collateralToken).transfer(loan.borrower, loan.collateralAmount),
            "Collateral return failed"
        );

        loan.isRepaid = true;

        emit LoanRepaid(_loanId);
    }

    // Check if loan is overdue
    function isOverdue(uint128 _loanId) public view returns (bool) {
        Loan storage loan = loans[_loanId];
        return (loan.isFunded && !loan.isRepaid && block.timestamp > loan.startTime + loan.duration);
    }

    // ========== ANALYTICS FUNCTIONS ==========

    function getUserStats(address user) external view returns (uint256 totalBorrowed, uint256 totalCollateral, uint256 activeLoans) {
        for (uint128 i = 1; i <= loanCounter; i++) {
            Loan memory loan = loans[i];
            if (loan.borrower == user) {
                if (loan.isFunded && !loan.isRepaid) {
                    activeLoans++;
                    totalBorrowed += loan.loanAmount;
                    totalCollateral += loan.collateralAmount;
                }
            }
        }
    }

    function getUserLoanHistory(address user) external view returns (Loan[] memory) {
        uint256 count = 0;
        for (uint128 i = 1; i <= loanCounter; i++) {
            if (loans[i].borrower == user) {
                count++;
            }
        }

        Loan[] memory history = new Loan[](count);
        uint256 index = 0;
        for (uint128 i = 1; i <= loanCounter; i++) {
            if (loans[i].borrower == user) {
                history[index] = loans[i];
                index++;
            }
        }

        return history;
    }
}
