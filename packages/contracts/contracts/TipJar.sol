// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TipJar is Ownable, ReentrancyGuard {
    string public projectName;
    string public description;
    uint256 public minTip;
    uint256 public totalTips;
    uint256 public tipsCount;

    event TipReceived(address indexed from, uint256 amount, string message, uint256 timestamp);
    event Withdrawn(address indexed to, uint256 amount);

    constructor(
        address initialOwner,
        string memory initialProjectName,
        string memory initialDescription,
        uint256 initialMinTip
    ) Ownable(initialOwner) {
        projectName = initialProjectName;
        description = initialDescription;
        minTip = initialMinTip;
    }

    function tip(string memory message) external payable {
        require(msg.value >= minTip, "TipJar: tip below minimum");

        totalTips += msg.value;
        tipsCount += 1;

        emit TipReceived(msg.sender, msg.value, message, block.timestamp);
    }

    function withdraw(address payable to) external onlyOwner nonReentrant {
        require(to != address(0), "TipJar: zero recipient");
        uint256 amount = address(this).balance;
        require(amount > 0, "TipJar: no funds");

        (bool success,) = to.call{value: amount}("");
        require(success, "TipJar: withdraw failed");

        emit Withdrawn(to, amount);
    }

    function setMetadata(string memory newProjectName, string memory newDescription) external onlyOwner {
        projectName = newProjectName;
        description = newDescription;
    }

    function setMinTip(uint256 newMinTip) external onlyOwner {
        minTip = newMinTip;
    }
}
