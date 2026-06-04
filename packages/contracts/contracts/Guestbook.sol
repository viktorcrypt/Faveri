// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Guestbook is Ownable, ReentrancyGuard {
    struct Message {
        address author;
        string content;
        uint256 value;
        uint256 timestamp;
    }

    string public wallName;
    uint256 public messageFee;
    uint256 public maxMessageLength;

    Message[] private messages;

    event MessagePosted(address indexed author, string content, uint256 value, uint256 timestamp);
    event Withdrawn(address indexed to, uint256 amount);

    constructor(
        address initialOwner,
        string memory initialWallName,
        uint256 initialMessageFee,
        uint256 initialMaxMessageLength
    ) Ownable(initialOwner) {
        require(initialMaxMessageLength > 0, "Guestbook: max length is zero");
        wallName = initialWallName;
        messageFee = initialMessageFee;
        maxMessageLength = initialMaxMessageLength;
    }

    function postMessage(string memory content) external payable {
        uint256 length = bytes(content).length;
        require(length > 0, "Guestbook: empty message");
        require(length <= maxMessageLength, "Guestbook: message too long");
        require(msg.value >= messageFee, "Guestbook: fee too low");

        messages.push(Message({
            author: msg.sender,
            content: content,
            value: msg.value,
            timestamp: block.timestamp
        }));

        emit MessagePosted(msg.sender, content, msg.value, block.timestamp);
    }

    function withdraw(address payable to) external onlyOwner nonReentrant {
        require(to != address(0), "Guestbook: zero recipient");
        uint256 amount = address(this).balance;
        require(amount > 0, "Guestbook: no funds");

        (bool success,) = to.call{value: amount}("");
        require(success, "Guestbook: withdraw failed");

        emit Withdrawn(to, amount);
    }

    function setMessageFee(uint256 newMessageFee) external onlyOwner {
        messageFee = newMessageFee;
    }

    function setWallName(string memory newWallName) external onlyOwner {
        wallName = newWallName;
    }

    function getMessagesCount() external view returns (uint256) {
        return messages.length;
    }

    function getMessage(uint256 index)
        external
        view
        returns (address author, string memory content, uint256 value, uint256 timestamp)
    {
        Message storage message = messages[index];
        return (message.author, message.content, message.value, message.timestamp);
    }
}
