// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract USDCTipJar is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdcToken;
    string public projectName;
    string public description;
    uint256 public minTip;
    uint256 public totalTips;
    uint256 public tipsCount;

    event TipReceived(address indexed from, uint256 amount, string message, uint256 timestamp);
    event Withdrawn(address indexed to, uint256 amount);

    constructor(
        address initialOwner,
        address tokenAddress,
        string memory initialProjectName,
        string memory initialDescription,
        uint256 initialMinTip
    ) Ownable(initialOwner) {
        require(tokenAddress != address(0), "USDCTipJar: zero token");

        usdcToken = IERC20(tokenAddress);
        projectName = initialProjectName;
        description = initialDescription;
        minTip = initialMinTip;
    }

    function tip(uint256 amount, string memory message) external nonReentrant {
        require(amount >= minTip, "USDCTipJar: tip below minimum");

        totalTips += amount;
        tipsCount += 1;
        usdcToken.safeTransferFrom(msg.sender, address(this), amount);

        emit TipReceived(msg.sender, amount, message, block.timestamp);
    }

    function withdraw(address to) external onlyOwner nonReentrant {
        require(to != address(0), "USDCTipJar: zero recipient");

        uint256 amount = usdcToken.balanceOf(address(this));
        require(amount > 0, "USDCTipJar: no funds");

        usdcToken.safeTransfer(to, amount);

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
