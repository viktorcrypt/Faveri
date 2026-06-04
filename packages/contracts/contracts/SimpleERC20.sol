// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SimpleERC20 is ERC20, Ownable {
    bool public immutable mintable;

    error MintingDisabled();

    constructor(
        address initialOwner,
        string memory name_,
        string memory symbol_,
        uint256 initialSupply,
        bool isMintable
    ) ERC20(name_, symbol_) Ownable(initialOwner) {
        mintable = isMintable;
        _mint(initialOwner, initialSupply);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        if (!mintable) {
            revert MintingDisabled();
        }

        _mint(to, amount);
    }
}
