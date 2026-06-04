// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BuilderBadge} from "./BuilderBadge.sol";
import {Guestbook} from "./Guestbook.sol";
import {SimpleERC20} from "./SimpleERC20.sol";
import {TipJar} from "./TipJar.sol";
import {USDCMiniEscrow} from "./USDCMiniEscrow.sol";
import {USDCTipJar} from "./USDCTipJar.sol";

library TipJarDeployer {
    function deploy(
        address initialOwner,
        string memory projectName,
        string memory description,
        uint256 minTip
    ) external returns (address) {
        return address(new TipJar(initialOwner, projectName, description, minTip));
    }
}

library GuestbookDeployer {
    function deploy(
        address initialOwner,
        string memory wallName,
        uint256 messageFee,
        uint256 maxMessageLength
    ) external returns (address) {
        return address(new Guestbook(initialOwner, wallName, messageFee, maxMessageLength));
    }
}

library BuilderBadgeDeployer {
    function deploy(
        address initialOwner,
        string memory name,
        string memory symbol,
        string memory baseURI,
        bool transferable
    ) external returns (address) {
        return address(new BuilderBadge(initialOwner, name, symbol, baseURI, transferable));
    }
}

library SimpleERC20Deployer {
    function deploy(
        address initialOwner,
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        bool mintable
    ) external returns (address) {
        return address(new SimpleERC20(initialOwner, name, symbol, initialSupply, mintable));
    }
}

library USDCTipJarDeployer {
    function deploy(
        address initialOwner,
        address usdcToken,
        string memory projectName,
        string memory description,
        uint256 minTip
    ) external returns (address) {
        return address(new USDCTipJar(initialOwner, usdcToken, projectName, description, minTip));
    }
}

library USDCMiniEscrowDeployer {
    function deploy(
        address creator,
        address usdcToken,
        string memory title,
        string memory metadataURI,
        address worker,
        uint256 deadline,
        uint256 rewardAmount
    ) external returns (address) {
        return address(new USDCMiniEscrow(creator, usdcToken, title, metadataURI, worker, deadline, rewardAmount));
    }
}
