// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MiniEscrow} from "./MiniEscrow.sol";
import {
    BuilderBadgeDeployer,
    GuestbookDeployer,
    SimpleERC20Deployer,
    TipJarDeployer,
    USDCMiniEscrowDeployer,
    USDCTipJarDeployer
} from "./TemplateDeployers.sol";

contract InkLauncherRegistry {
    using SafeERC20 for IERC20;

    struct Deployment {
        address deployer;
        address deployedContract;
        uint8 templateId;
        string templateName;
        string metadata;
        uint256 timestamp;
    }

    event ContractLaunched(
        address indexed deployer,
        address indexed deployedContract,
        uint8 indexed templateId,
        string templateName,
        string metadata,
        uint256 timestamp
    );

    Deployment[] private deployments;
    mapping(uint8 templateId => uint256 count) private templateUsage;

    function deployTipJar(
        string memory projectName,
        string memory description,
        uint256 minTip
    ) external returns (address) {
        address tipJar = TipJarDeployer.deploy(msg.sender, projectName, description, minTip);
        return _recordDeployment(tipJar, 0, "TipJar", description);
    }

    function deployGuestbook(
        string memory wallName,
        uint256 messageFee,
        uint256 maxMessageLength
    ) external returns (address) {
        address guestbook = GuestbookDeployer.deploy(msg.sender, wallName, messageFee, maxMessageLength);
        return _recordDeployment(guestbook, 1, "Guestbook", wallName);
    }

    function deployBuilderBadge(
        string memory name,
        string memory symbol,
        string memory baseURI,
        bool transferable
    ) external returns (address) {
        address badge = BuilderBadgeDeployer.deploy(msg.sender, name, symbol, baseURI, transferable);
        return _recordDeployment(badge, 2, "BuilderBadge", baseURI);
    }

    function deploySimpleERC20(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        bool mintable
    ) external returns (address) {
        address token = SimpleERC20Deployer.deploy(msg.sender, name, symbol, initialSupply, mintable);
        return _recordDeployment(token, 3, "SimpleERC20", symbol);
    }

    function deployMiniEscrow(
        string memory title,
        string memory metadataURI,
        address worker,
        uint256 deadline
    ) external payable returns (address) {
        MiniEscrow escrow = new MiniEscrow{value: msg.value}(msg.sender, title, metadataURI, worker, deadline);
        return _recordDeployment(address(escrow), 4, "MiniEscrow", metadataURI);
    }

    function deployUSDCTipJar(
        address usdcToken,
        string memory projectName,
        string memory description,
        uint256 minTip
    ) external returns (address) {
        address tipJar = USDCTipJarDeployer.deploy(msg.sender, usdcToken, projectName, description, minTip);
        return _recordDeployment(tipJar, 5, "USDCTipJar", description);
    }

    function deployUSDCMiniEscrow(
        address usdcToken,
        string memory title,
        string memory metadataURI,
        address worker,
        uint256 deadline,
        uint256 rewardAmount
    ) external returns (address) {
        address escrow = USDCMiniEscrowDeployer.deploy(
            msg.sender,
            usdcToken,
            title,
            metadataURI,
            worker,
            deadline,
            rewardAmount
        );

        IERC20(usdcToken).safeTransferFrom(msg.sender, escrow, rewardAmount);

        return _recordDeployment(escrow, 6, "USDCMiniEscrow", metadataURI);
    }

    function getDeployment(uint256 id)
        external
        view
        returns (
            address deployer,
            address deployedContract,
            uint8 templateId,
            string memory templateName,
            string memory metadata,
            uint256 timestamp
        )
    {
        Deployment storage deployment = deployments[id];
        return (
            deployment.deployer,
            deployment.deployedContract,
            deployment.templateId,
            deployment.templateName,
            deployment.metadata,
            deployment.timestamp
        );
    }

    function getDeploymentsCount() external view returns (uint256) {
        return deployments.length;
    }

    function getTemplateUsage(uint8 templateId) external view returns (uint256) {
        return templateUsage[templateId];
    }

    function _recordDeployment(
        address deployedContract,
        uint8 templateId,
        string memory templateName,
        string memory metadata
    ) private returns (address) {
        deployments.push(Deployment({
            deployer: msg.sender,
            deployedContract: deployedContract,
            templateId: templateId,
            templateName: templateName,
            metadata: metadata,
            timestamp: block.timestamp
        }));

        templateUsage[templateId] += 1;

        emit ContractLaunched(
            msg.sender,
            deployedContract,
            templateId,
            templateName,
            metadata,
            block.timestamp
        );

        return deployedContract;
    }
}
