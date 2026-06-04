// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract USDCMiniEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Status {
        Open,
        Submitted,
        Approved,
        Claimed,
        Refunded,
        Cancelled
    }

    IERC20 public immutable usdcToken;
    address public immutable creator;
    string public title;
    string public metadataURI;
    address public immutable worker;
    address public selectedWorker;
    uint256 public immutable reward;
    uint256 public immutable deadline;
    string public proofURI;
    Status public status;

    event ProofSubmitted(address indexed worker, string proofURI);
    event Approved(address indexed creator, address indexed worker);
    event Claimed(address indexed worker, uint256 amount);
    event Refunded(address indexed creator, uint256 amount);
    event Cancelled(address indexed creator, uint256 amount);

    modifier onlyCreator() {
        require(msg.sender == creator, "USDCMiniEscrow: only creator");
        _;
    }

    constructor(
        address initialCreator,
        address tokenAddress,
        string memory initialTitle,
        string memory initialMetadataURI,
        address fixedWorker,
        uint256 escrowDeadline,
        uint256 rewardAmount
    ) {
        require(initialCreator != address(0), "USDCMiniEscrow: zero creator");
        require(tokenAddress != address(0), "USDCMiniEscrow: zero token");
        require(rewardAmount > 0, "USDCMiniEscrow: reward required");
        require(escrowDeadline > block.timestamp, "USDCMiniEscrow: deadline in past");

        creator = initialCreator;
        usdcToken = IERC20(tokenAddress);
        title = initialTitle;
        metadataURI = initialMetadataURI;
        worker = fixedWorker;
        reward = rewardAmount;
        deadline = escrowDeadline;
        status = Status.Open;
    }

    function submitProof(string memory newProofURI) external {
        require(status == Status.Open, "USDCMiniEscrow: not open");
        require(bytes(newProofURI).length > 0, "USDCMiniEscrow: empty proof");
        require(block.timestamp <= deadline, "USDCMiniEscrow: deadline passed");

        if (worker != address(0)) {
            require(msg.sender == worker, "USDCMiniEscrow: wrong worker");
        }

        selectedWorker = msg.sender;
        proofURI = newProofURI;
        status = Status.Submitted;

        emit ProofSubmitted(msg.sender, newProofURI);
    }

    function approve() external onlyCreator {
        require(status == Status.Submitted, "USDCMiniEscrow: no submission");

        status = Status.Approved;

        emit Approved(msg.sender, selectedWorker);
    }

    function claim() external nonReentrant {
        require(status == Status.Approved, "USDCMiniEscrow: not approved");
        require(msg.sender == selectedWorker, "USDCMiniEscrow: only worker");

        status = Status.Claimed;
        usdcToken.safeTransfer(msg.sender, reward);

        emit Claimed(msg.sender, reward);
    }

    function refundAfterDeadline() external onlyCreator nonReentrant {
        require(block.timestamp > deadline, "USDCMiniEscrow: deadline active");
        require(status == Status.Open, "USDCMiniEscrow: submission exists");

        status = Status.Refunded;
        usdcToken.safeTransfer(creator, reward);

        emit Refunded(creator, reward);
    }

    function cancelBeforeSubmission() external onlyCreator nonReentrant {
        require(status == Status.Open, "USDCMiniEscrow: submission exists");

        status = Status.Cancelled;
        usdcToken.safeTransfer(creator, reward);

        emit Cancelled(creator, reward);
    }

    function getSummary()
        external
        view
        returns (
            address escrowCreator,
            address tokenAddress,
            string memory escrowTitle,
            string memory escrowMetadataURI,
            address fixedWorker,
            address currentWorker,
            uint256 escrowReward,
            uint256 escrowDeadline,
            string memory currentProofURI,
            Status currentStatus
        )
    {
        return (
            creator,
            address(usdcToken),
            title,
            metadataURI,
            worker,
            selectedWorker,
            reward,
            deadline,
            proofURI,
            status
        );
    }
}
