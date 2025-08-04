// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract DeFi {

    enum LoanStatus { Requested, Funded, Repaid, Defaulted, Cancelled }

    struct Loan {
        uint128 loanId; 
        address borrower;
        address lender;
        address collateralToken;
        address loanToken;
        uint128 collateralAmount;
        uint128 loanAmount;
        uint16 interestRate; // in basis points (e.g., 500 = 5%)
        uint256 startTime;
        uint256 duration; // in seconds
        LoanStatus status;
    }

    uint128 public loanCounter = 0;
    mapping(uint128 => Loan) public loans;
    uint128[] public allLoanIds;
    mapping(address => uint128[]) public userLoans;  // borrower => list of loan IDs
    mapping(address => bool) public allowedCollateralTokens;
    mapping(address => bool) public allowedLoanTokens;
    uint256 public constant MIN_COLLATERAL_RATIO = 150; // 150%

    event LoanRequested(uint128 indexed loanId, address indexed borrower, uint128 amount, address indexed loanToken);
    event LoanFunded(uint128 indexed loanId, address indexed lender);
    event LoanRepaid(uint128 indexed loanId, uint128 amount);
    event LoanDefaulted(uint128 indexed loanId, address indexed borrower, address indexed lender);
    event LoanCancelled(uint128 indexed loanId, address indexed borrower);

    constructor(address[] memory _allowedCollateral, address[] memory _allowedLoanTokens) {
        for (uint i = 0; i < _allowedCollateral.length; i++) {
            allowedCollateralTokens[_allowedCollateral[i]] = true;
        }
        for (uint i = 0; i < _allowedLoanTokens.length; i++) {
            allowedLoanTokens[_allowedLoanTokens[i]] = true;
        }
    }

    function getMockPrice(address token) internal pure returns (uint256) {
        //sepolia usdc
        if (token == 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238) return 1e18;  // $1
        //sepolia dai
        if (token == 0x3e622317f8C93f7328350cF0B56d9eD4C620C5d6)  return 1e18;  // $1 
        //sepolia eurc
        if (token == 0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4)  return 1e18;
        //if (token == 0x...WETH) return 2000e18; // $2000 per ETH
        revert("Unsupported token in price oracle");
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

        uint8 collateralDecimals = IERC20Metadata(_collateralToken).decimals();
        uint8 loanDecimals = IERC20Metadata(_loanToken).decimals();

        // Adjust amounts to 18 decimals with underflow check
        uint256 normalizedCollateralAmount = _collateralAmount * (10 ** (18 - Math.min(collateralDecimals, 18)));
        uint256 normalizedLoanAmount = _loanAmount * (10 ** (18 - Math.min(loanDecimals, 18)));

        // Mocked oracle call still returns price in 1e18
        uint256 collateralTokenPrice = getMockPrice(_collateralToken); // e.g., 1 USDC = $1 → return 1e18

        // Final collateralValue is in 1e18
        uint256 collateralValue = (normalizedCollateralAmount * collateralTokenPrice) / 1e18;

        // Collateral ratio = (collateralValue / loanAmount) * 100
        uint256 collateralRatio = (collateralValue * 100) / normalizedLoanAmount;

        require(collateralRatio >= MIN_COLLATERAL_RATIO, "Collateral ratio below minimum threshold");

        // // Mocked oracle call: assume price returned in 18 decimals
        // uint256 collateralTokenPrice = getMockPrice(_collateralToken); // e.g., 1 USDC = $1 → return 1e18
        // uint256 collateralValue = (_collateralAmount * collateralTokenPrice) / 1e18;

        // // Collateral ratio = (collateralValue / loanAmount) * 100
        // uint256 collateralRatio = (collateralValue * 100) / _loanAmount;

        loans[loanCounter] = Loan({
        loanId: loanCounter, // loanId 
        borrower: msg.sender,
        lender: address(0),
        collateralToken: _collateralToken,
        loanToken: _loanToken,
        collateralAmount: _collateralAmount,
        loanAmount: _loanAmount,
        interestRate: _interestRate,
        startTime: 0,
        duration: _duration,
        status: LoanStatus.Requested
    });
   
        userLoans[msg.sender].push(loanCounter);
        allLoanIds.push(loanCounter);
        emit LoanRequested(loanCounter, msg.sender, _loanAmount, _loanToken);
        unchecked {
            loanCounter++;
        }
    }

    function getAllRequestedLoans() external view returns (uint128[] memory, Loan[] memory) {
        uint count = 0;
        for (uint i = 0; i < allLoanIds.length; i++) {
            if (loans[allLoanIds[i]].status == LoanStatus.Requested) {
                count++;
            }
        }

        Loan[] memory result = new Loan[](count);
        uint128[] memory ids = new uint128[](count);

        uint index = 0;
        for (uint i = 0; i < allLoanIds.length; i++) {
            uint128 loanId = allLoanIds[i];
            if (loans[loanId].status == LoanStatus.Requested) {
                result[index] = loans[loanId];
                ids[index] = loanId;
                index++;
            }
        }      

        return (ids, result);
    }
    
    function getLoanDetails(uint128 loanId) external view returns (
        uint128,
        address,
        address,
        address,
        address,
        uint128,
        uint128,
        uint16,
        uint256,
        uint256,
        LoanStatus
    ) {
        Loan memory loan = loans[loanId];
        return (
            loan.loanId,
            loan.borrower,
            loan.lender,
            loan.collateralToken,
            loan.loanToken,
            loan.collateralAmount,
            loan.loanAmount,
            loan.interestRate,
            loan.startTime,
            loan.duration,
            loan.status
        );
    }

    // Get all loans for a specific user
    function getLoansByUser(address user) external view returns (Loan[] memory) {
        uint128[] memory loanIds = userLoans[user];
        Loan[] memory result = new Loan[](loanIds.length);

        for (uint i = 0; i < loanIds.length; i++) {
            result[i] = loans[loanIds[i]];
        }

        return result;
    }

    // Get active loans only
    function getActiveLoansByUser(address user) external view returns (Loan[] memory) {
        uint128[] memory loanIds = userLoans[user];

        // First count active loans
        uint256 count = 0;
        for (uint i = 0; i < loanIds.length; i++) {
            if (loans[loanIds[i]].status == LoanStatus.Requested || loans[loanIds[i]].status == LoanStatus.Funded) {
                count++;
            }
        }

        // Then populate result array
        Loan[] memory active = new Loan[](count);
        uint256 j = 0;
        for (uint i = 0; i < loanIds.length; i++) {
            if (loans[loanIds[i]].status == LoanStatus.Requested || loans[loanIds[i]].status == LoanStatus.Funded) {
                active[j++] = loans[loanIds[i]];
            }
        }

        return active;

    }
    
    // Lender funds the loan
    function fundLoan(uint128 _loanId) external {
        Loan storage loan = loans[_loanId];
        require(loan.status != LoanStatus.Funded, "Already funded");
        require(loan.status == LoanStatus.Requested, "Loan not available for funding");
        require(loan.borrower != address(0), "Invalid loan");

        // Transfer loan amount to borrower
        require(
            IERC20(loan.loanToken).transferFrom(msg.sender, loan.borrower, loan.loanAmount),
            "Funding failed"
        );

        loan.lender = msg.sender;
        loan.startTime = block.timestamp;
        loan.status = LoanStatus.Funded;

        emit LoanFunded(_loanId, msg.sender);
    }

    // Borrower repays the loan with interest
    function repayLoan(uint128 _loanId) external {
        Loan storage loan = loans[_loanId];
        require(loan.status == LoanStatus.Funded, "Loan not active for repayment");
        require(msg.sender == loan.borrower, "Only borrower can repay");

        uint128 interest = (loan.loanAmount * loan.interestRate) / 10000;
        uint128 totalRepayment = loan.loanAmount + interest;

        require(
            IERC20(loan.loanToken).transferFrom(msg.sender, loan.lender, totalRepayment),
            "Repayment failed"
        );

        // Return collateral to borrower
        require(
            IERC20(loan.collateralToken).transfer(loan.borrower, loan.collateralAmount),
            "Collateral return failed"
        );

        loan.status = LoanStatus.Repaid;

        emit LoanRepaid(_loanId, totalRepayment);
    }

    function isLoanActive(uint128 _loanId) public view returns (bool) {
        Loan memory loan = loans[_loanId];
        return loan.status == LoanStatus.Funded;
    }

    // Check if loan is overdue
    function isOverdue(uint128 _loanId) public view returns (bool) {
        Loan storage loan = loans[_loanId];
        return (loan.status == LoanStatus.Funded && loan.status != LoanStatus.Repaid && block.timestamp > loan.startTime + loan.duration);
    }

    function liquidateLoan(uint128 _loanId) external {
        Loan storage loan = loans[_loanId];
        require(loan.status == LoanStatus.Funded, "Loan is not active");
        require(isOverdue(_loanId), "Loan is not overdue");

        // Mark loan as defaulted
        loan.status = LoanStatus.Defaulted;

        // Transfer collateral to lender
        require(
            IERC20(loan.collateralToken).transfer(loan.lender, loan.collateralAmount),
            "Collateral transfer failed"
        );

        emit LoanDefaulted(_loanId, loan.borrower, loan.lender);
    }


    function cancelLoan(uint128 _loanId) external {
        Loan storage loan = loans[_loanId];

        require(loan.borrower == msg.sender, "Only the borrower can cancel");
        require(loan.status == LoanStatus.Requested, "Loan cannot be cancelled");

        // Refund the collateral
        require(
            IERC20(loan.collateralToken).transfer(loan.borrower, loan.collateralAmount),
            "Collateral refund failed"
        );

        loan.status = LoanStatus.Cancelled;

        emit LoanCancelled(_loanId, msg.sender);
    }


    // ========== ANALYTICS FUNCTIONS ==========

    function getUserStats(address user) external view returns (
    address[] memory collateralTokens,
    uint256[] memory collateralAmounts,
    address[] memory loanTokens,
    uint256[] memory loanAmounts,
    uint256 activeLoans
) {
    uint128[] memory loanIds = userLoans[user];

    address[] memory tempCollateralTokens = new address[](loanIds.length);
    uint256[] memory tempCollateralAmounts = new uint256[](loanIds.length);
    uint256 collateralTypes = 0;

    address[] memory tempLoanTokens = new address[](loanIds.length);
    uint256[] memory tempLoanAmounts = new uint256[](loanIds.length);
    uint256 loanTypes = 0;

    for (uint i = 0; i < loanIds.length; i++) {
        Loan memory loan = loans[loanIds[i]];
        if (loan.status == LoanStatus.Funded || loan.status == LoanStatus.Requested) {
            activeLoans++;

            // Collateral aggregation
            bool foundCollateral = false;
            for (uint j = 0; j < collateralTypes; j++) {
                if (tempCollateralTokens[j] == loan.collateralToken) {
                    tempCollateralAmounts[j] += loan.collateralAmount;
                    foundCollateral = true;
                    break;
                }
            }
            if (!foundCollateral) {
                tempCollateralTokens[collateralTypes] = loan.collateralToken;
                tempCollateralAmounts[collateralTypes] = loan.collateralAmount;
                collateralTypes++;
            }

            // Borrowed aggregation (only for Funded loans)
            if (loan.status == LoanStatus.Funded) {
                bool foundLoan = false;
                for (uint j = 0; j < loanTypes; j++) {
                    if (tempLoanTokens[j] == loan.loanToken) {
                        tempLoanAmounts[j] += loan.loanAmount;
                        foundLoan = true;
                        break;
                    }
                }
                if (!foundLoan) {
                    tempLoanTokens[loanTypes] = loan.loanToken;
                    tempLoanAmounts[loanTypes] = loan.loanAmount;
                    loanTypes++;
                }
            }
        }
    }

    // Resize and return final arrays
    collateralTokens = new address[](collateralTypes);
    collateralAmounts = new uint256[](collateralTypes);
    for (uint i = 0; i < collateralTypes; i++) {
        collateralTokens[i] = tempCollateralTokens[i];
        collateralAmounts[i] = tempCollateralAmounts[i];
    }

    loanTokens = new address[](loanTypes);
    loanAmounts = new uint256[](loanTypes);
    for (uint i = 0; i < loanTypes; i++) {
        loanTokens[i] = tempLoanTokens[i];
        loanAmounts[i] = tempLoanAmounts[i];
    }
}


    function getUserLoanHistory(address user) external view returns (Loan[] memory) {
        uint128[] memory loanIds = userLoans[user];
        Loan[] memory result = new Loan[](loanIds.length);

        for (uint i = 0; i < loanIds.length; i++) {
            result[i] = loans[loanIds[i]];
        }

        return result;
    }

    // function getUserLoanHistory(address user) external view returns (Loan[] memory) {
    //     uint256 count = 0;
    //     for (uint128 i = 1; i <= loanCounter; i++) {
    //         if (loans[i].borrower == user) {
    //             count++;
    //         }
    //     }

    //     Loan[] memory history = new Loan[](count);
    //     uint256 index = 0;
    //     for (uint128 i = 1; i <= loanCounter; i++) {
    //         if (loans[i].borrower == user) {
    //             history[index] = loans[i];
    //             index++;
    //         }
    //     }

    //     return history;
    // }
}