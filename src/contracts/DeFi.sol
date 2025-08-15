// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

contract DeFi is Ownable, AutomationCompatible {

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
        uint256 timestamp;
        LoanStatus status;
    }

    uint128 public loanCounter = 0;
    mapping(uint128 => Loan) public loans;
    uint128[] public allLoanIds;
    mapping(address => uint128[]) public userLoans;  // borrower => list of loan IDs
    mapping(address => bool) public allowedCollateralTokens;
    mapping(address => bool) public allowedLoanTokens;
    //mapping(address => address) public priceFeeds; // token => Chainlink feed

    uint256 public constant MIN_COLLATERAL_RATIO = 150; // 150%
    uint256 public liquidationThreshold = 115; 

    // (optional) scan window for Automation to cap gas
    uint256 public keeperScanLimit = 50;

    // Chainlink price feeds (Sepolia addresses as example)
    AggregatorV3Interface internal priceFeedUSDC = AggregatorV3Interface(0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E);
    AggregatorV3Interface internal priceFeedDAI  = AggregatorV3Interface(0x14866185B1962B63C3Ea9E03Bc1da838bab34C19);
    AggregatorV3Interface internal priceFeedLINK = AggregatorV3Interface(0xc59E3633BAAC79493d908e63626716e204A45EdF);
    AggregatorV3Interface internal priceFeedEURC = AggregatorV3Interface(0x1a81afB8146aeFfCFc5E50e8479e826E7D55b910);

    event LoanRequested(uint128 indexed loanId, address indexed borrower, uint128 amount, address indexed loanToken);
    event LoanFunded(uint128 indexed loanId, address indexed lender);
    event LoanRepaid(uint128 indexed loanId, address indexed borrower, uint128 amount, uint256 timestamp);
    event LoanDefaulted(uint128 indexed loanId, address indexed borrower, address indexed lender);
    event LoanCancelled(uint128 indexed loanId, address indexed borrower);

    constructor(address[] memory _allowedCollateral, address[] memory _allowedLoanTokens) Ownable(msg.sender) {
        for (uint i = 0; i < _allowedCollateral.length; i++) {
            allowedCollateralTokens[_allowedCollateral[i]] = true;
        }
        for (uint i = 0; i < _allowedLoanTokens.length; i++) {
            allowedLoanTokens[_allowedLoanTokens[i]] = true;
        }
    }

    // *** COMMENT/DISABLE THIS FUNCTION FOR ORACLE ***
    // function getMockPrice(address token) internal pure returns (uint256) {
    //     //sepolia usdc
    //     if (token == 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238) return 1e18;  // $1
    //     //sepolia dai
    //     if (token == 0x3e622317f8C93f7328350cF0B56d9eD4C620C5d6)  return 1e18;  // $1 
    //     //sepolia eurc
    //     if (token == 0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4)  return 1e18;
    //     //if (token == 0x...WETH) return 2000e18; // $2000 per ETH
    //     revert("Unsupported token in price oracle");
    // }
    
    function getTokenPrice(address token) internal view returns (uint256) {
        AggregatorV3Interface feed;

        if (token == 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238) { // USDC (Sepolia token)
            feed = priceFeedUSDC;
        } else if (token == 0x3e622317f8C93f7328350cF0B56d9eD4C620C5d6) { // DAI
            feed = priceFeedDAI;
        } else if (token == 0x779877A7B0D9E8603169DdbD7836e478b4624789) { // LINK
            feed = priceFeedLINK;
        } else if (token == 0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4) { // EURC
            feed = priceFeedEURC;
        } else {
            revert("Unsupported token");
        }

        (
            ,
            int256 answer,
            ,               // startedAt
            ,
            
        ) = feed.latestRoundData();

        require(answer > 0, "Invalid price");

        //------------Not needed for testnet, enable this only for mainnet--------------------------
        //require(block.timestamp - updatedAt <= 1 hours, "Price stale"); // tune per feed heartbeat
        //require(answeredInRound >= roundId, "Stale round");

        uint8 d = feed.decimals(); // often 8
        uint256 u = uint256(answer);

        // normalize to 1e18 safely
        if (d < 18) {
            return u * (10 ** (18 - d));
        } else if (d > 18) {
            return u / (10 ** (d - 18));
        } else {
            return u;
        }
    }

    function setLiquidationThreshold(uint256 pct) external onlyOwner {
        require(pct > 0 && pct <= 200, "Bad threshold");
        liquidationThreshold = pct;
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
        //uint256 collateralTokenPrice = getMockPrice(_collateralToken); // e.g., 1 USDC = $1 → return 1e18
         
        // *** Fetch real price from Chainlink ***
        // Price both sides in USD (1e18)
        uint256 collateralPrice = getTokenPrice(_collateralToken);
        uint256 loanTokenPrice  = getTokenPrice(_loanToken);

        // USD values (1e18)
        uint256 collateralValue = (normalizedCollateralAmount * collateralPrice) / 1e18;
        uint256 loanValue       = (normalizedLoanAmount * loanTokenPrice)  / 1e18;

        // Ratio in %
        uint256 collateralRatio = (collateralValue * 100) / loanValue;
        require(collateralRatio >= MIN_COLLATERAL_RATIO, "Collateral ratio below minimum threshold");

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
        timestamp: block.timestamp,
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
            loan.timestamp,
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

        emit LoanRepaid(_loanId, msg.sender, totalRepayment, block.timestamp);
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

    function isUnderCollateralized(uint128 _loanId) public view returns (bool) {
        Loan memory ln = loans[_loanId];
        if (ln.status != LoanStatus.Funded) return false;

        uint8 cd = IERC20Metadata(ln.collateralToken).decimals();
        uint8 ld = IERC20Metadata(ln.loanToken).decimals();

        uint256 nCol = uint256(ln.collateralAmount) * (10 ** (18 - Math.min(cd, 18)));
        uint256 nLoan = uint256(ln.loanAmount)      * (10 ** (18 - Math.min(ld, 18)));

        uint256 colPrice  = getTokenPrice(ln.collateralToken);
        uint256 loanPrice = getTokenPrice(ln.loanToken);

        uint256 colVal = (nCol * colPrice) / 1e18;    // USD 1e18
        uint256 loanVal = (nLoan * loanPrice) / 1e18; // USD 1e18

        uint256 ratio = (colVal * 100) / loanVal;
        return ratio < liquidationThreshold;  // e.g., 115%
    }

    function liquidateLoan(uint128 _loanId) internal {
        Loan storage loan = loans[_loanId];
        require(loan.status == LoanStatus.Funded, "Loan is not active");
        require(isOverdue(_loanId)|| isUnderCollateralized(_loanId), "Not liquidatable");

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

    // ------------------------LIQUIDATION AUTOMATION-------------------------

    /// @notice Chainlink Automation check function
    function checkUpkeep(bytes calldata)
    external
    view
    override
    returns (bool upkeepNeeded, bytes memory performData)
    {
        uint256 n = allLoanIds.length;
        uint256 scanned = 0;
        for (uint i = 0; i < n && scanned < keeperScanLimit; i++) {
            uint128 loanId = allLoanIds[i];
            Loan memory ln = loans[loanId];
            if (ln.status == LoanStatus.Funded && (isOverdue(loanId) || isUnderCollateralized(loanId))) {
                return (true, abi.encode(loanId));
            }
            scanned++;
        }
        return (false, bytes(""));
    }

    function performUpkeep(bytes calldata performData) external override {
        uint128 loanId = abi.decode(performData, (uint128));
        if (isOverdue(loanId) || isUnderCollateralized(loanId)) {
            liquidateLoan(loanId);
        }
    }

    // --------------------- ANALYTICS FUNCTIONS ------------------------------

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

}