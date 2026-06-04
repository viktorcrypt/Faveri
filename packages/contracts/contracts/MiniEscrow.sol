// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MiniEscrow is ReentrancyGuard {
    enum Status {
        Open,
        Submitted,
        Approved,
        Claimed,
        Refunded,
        Cancelled
    }

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
        require(msg.sender == creator, "MiniEscrow: only creator");
        _;
    }

    constructor(
        address initialCreator,
        string memory initialTitle,
        string memory initialMetadataURI,
        address fixedWorker,
        uint256 escrowDeadline
    ) payable {
        require(initialCreator != address(0), "MiniEscrow: zero creator");
        require(msg.value > 0, "MiniEscrow: reward required");
        require(escrowDeadline > block.timestamp, "MiniEscrow: deadline in past");

        creator = initialCreator;
        title = initialTitle;
        metadataURI = initialMetadataURI;
        worker = fixedWorker;
        reward = msg.value;
        deadline = escrowDeadline;
        status = Status.Open;
    }

    function submitProof(string memory newProofURI) external {
        require(status == Status.Open, "MiniEscrow: not open");
        require(bytes(newProofURI).length > 0, "MiniEscrow: empty proof");
        require(block.timestamp <= deadline, "MiniEscrow: deadline passed");

        if (worker != address(0)) {
            require(msg.sender == worker, "MiniEscrow: wrong worker");
        }

        selectedWorker = msg.sender;
        proofURI = newProofURI;
        status = Status.Submitted;

        emit ProofSubmitted(msg.sender, newProofURI);
    }

    function approve() external onlyCreator {
        require(status == Status.Submitted, "MiniEscrow: no submission");

        status = Status.Approved;

        emit Approved(msg.sender, selectedWorker);
    }

    function claim() external nonReentrant {
        require(status == Status.Approved, "MiniEscrow: not approved");
        require(msg.sender == selectedWorker, "MiniEscrow: only worker");

        status = Status.Claimed;

        (bool success,) = payable(msg.sender).call{value: reward}("");
        require(success, "MiniEscrow: claim failed");

        emit Claimed(msg.sender, reward);
    }

    function refundAfterDeadline() external onlyCreator nonReentrant {
        require(block.timestamp > deadline, "MiniEscrow: deadline active");
        require(status == Status.Open, "MiniEscrow: submission exists");

        status = Status.Refunded;

        (bool success,) = payable(creator).call{value: reward}("");
        require(success, "MiniEscrow: refund failed");

        emit Refunded(creator, reward);
    }

    function cancelBeforeSubmission() external onlyCreator nonReentrant {
        require(status == Status.Open, "MiniEscrow: submission exists");

        status = Status.Cancelled;

        (bool success,) = payable(creator).call{value: reward}("");
        require(success, "MiniEscrow: cancel failed");

        emit Cancelled(creator, reward);
    }

    function getSummary()
        external
        view
        returns (
            address escrowCreator,
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
