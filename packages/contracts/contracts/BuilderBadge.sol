// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract BuilderBadge is ERC721, Ownable {
    using Strings for uint256;

    string private badgeBaseURI;
    bool public immutable transferable;
    uint256 public nextTokenId = 1;

    event BadgeMinted(address indexed to, uint256 indexed tokenId);

    error NonTransferableBadge();

    constructor(
        address initialOwner,
        string memory name_,
        string memory symbol_,
        string memory initialBaseURI,
        bool isTransferable
    ) ERC721(name_, symbol_) Ownable(initialOwner) {
        badgeBaseURI = initialBaseURI;
        transferable = isTransferable;
    }

    function mint(address to) external onlyOwner returns (uint256 tokenId) {
        require(to != address(0), "BuilderBadge: zero recipient");
        tokenId = nextTokenId;
        nextTokenId += 1;

        _safeMint(to, tokenId);

        emit BadgeMinted(to, tokenId);
    }

    function batchMint(address[] calldata recipients) external onlyOwner {
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "BuilderBadge: zero recipient");
            uint256 tokenId = nextTokenId;
            nextTokenId += 1;

            _safeMint(recipients[i], tokenId);

            emit BadgeMinted(recipients[i], tokenId);
        }
    }

    function setBaseURI(string memory newBaseURI) external onlyOwner {
        badgeBaseURI = newBaseURI;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        if (bytes(badgeBaseURI).length == 0) {
            return "";
        }

        return string.concat(badgeBaseURI, tokenId.toString());
    }

    function totalMinted() external view returns (uint256) {
        return nextTokenId - 1;
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (!transferable && from != address(0) && to != address(0)) {
            revert NonTransferableBadge();
        }

        return super._update(to, tokenId, auth);
    }
}
