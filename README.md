# Faveri

Faveri is a launch terminal for simple user-owned onchain contracts and USDC settlement flows.

The product goal is to make useful smart contracts feel like a normal product workflow: choose a route, pick a contract kit, fill in a few fields, sign from a wallet, and manage the launched contract from a clean generated page.

Faveri currently has two rails:

- **Ink rail** for user-owned builder contracts, public goods, creator tools, and lightweight onchain experiments.
- **Arc rail** for USDC payments, escrow, Gateway liquidity, and settlement activity.

The long-term idea is not to become another contract wizard with too many knobs. Faveri should feel like a reliable launch terminal for real work: less deployment friction, clearer ownership, better payment flows, and public activity signals that show what builders are actually using.

The Ink rail is live on Ink Mainnet. The Arc rail extends the same product idea into USDC settlement workflows.

## Why Faveri Exists

Most builders do not need a custom Solidity system for every small idea. They need a trustworthy primitive they can launch fast:

- a place to receive support,
- a simple public message wall,
- a contributor badge,
- a small token experiment,
- an escrow for paid work,
- a USDC settlement contract.

Faveri packages these flows into reusable contract kits. The user still owns the deployed contract, but they do not need to write deployment scripts, copy ABIs, or build a contract dashboard from scratch.

The important product shift is this:

```text
from "deploy a contract and disappear"
to   "launch, use, manage, and measure the contract"
```

## Arc / USDC Rail

The Arc rail is the most payment-focused part of Faveri.

It is built around USDC workflows:

- launch a USDC Tip Jar for support, donations, and lightweight payments,
- launch a USDC Mini Escrow for milestones and paid work,
- approve and deposit USDC into Circle Gateway for optional settlement liquidity,
- read aggregate public activity from onchain events and contract state.

### USDC Tip Jar

A creator, builder, or project can launch a USDC Tip Jar and receive USDC support directly through their own contract. People can send a tip with a message, and the owner can withdraw the collected USDC later.

This is the lightweight flow: useful for public goods, creators, open-source work, hackathon teams, and small product experiments.

### USDC Mini Escrow

USDC Mini Escrow is the stronger settlement flow.

A creator locks USDC into a contract, assigns a worker or leaves submission open, and sets a deadline. The worker submits proof. The creator approves the work. Then the worker can claim the USDC.

This turns a simple work agreement into an onchain settlement flow:

- funds are committed,
- proof is recorded,
- approval is explicit,
- payment becomes claimable through the contract.

### Gateway

Gateway is optional in the current product. A user does not need Gateway to launch a Faveri contract.

In the Arc rail, Gateway is used as a settlement-liquidity layer: the UI can guide a user through USDC approval and deposit, then read wallet and Gateway balance signals from onchain contracts. This gives Faveri a path toward richer USDC liquidity, funding, and cross-environment settlement workflows.

Current Arc configuration:

- Arc Testnet chain ID: `5042002`
- Arc RPC: `https://rpc.testnet.arc.network`
- Arc explorer: `https://testnet.arcscan.app`
- Arc USDC: `0x3600000000000000000000000000000000000000`
- GatewayWallet: `0x0077777d7EBA4688BDeF3E311b846F25870A19B9`

## Ink Rail

The Ink rail focuses on simple user-owned builder contracts:

- **Tip Jar**: collect ETH tips for a project or public good.
- **Guestbook**: create a public onchain message wall.
- **Builder Badge**: mint contributor, tester, or community badges.
- **Simple ERC20**: launch a fixed-supply or owner-mintable token experiment.
- **Mini Escrow**: lock ETH for a task, approve proof, and let the worker claim.

Ink support is part of the same broader idea: make common onchain primitives easier to launch and manage without hiding contract ownership behind a platform account.

Supported Ink networks:

- Ink Mainnet: `57073`
- Ink Sepolia: `763373`
- Localhost Hardhat: `31337`

Current Ink Mainnet deployment:

- Registry: `0x7A62447235c47aBEC0d26267D9032E0f28DF0BC9`
- Explorer: `https://explorer.inkonchain.com/address/0x7A62447235c47aBEC0d26267D9032E0f28DF0BC9`

Current Ink Mainnet registry signals as of June 26, 2026:

- `135` total contract launches.
- `20` deploying wallets.
- Template usage: `36` Tip Jars, `23` Guestbooks, `24` Builder Badges, `31` Simple ERC20s, and `21` Mini Escrows.

## Product Principles

### User-Owned By Default

Faveri helps deploy contracts, but it should not become the owner of the user's contract.

After launch, the generated contract page is a control surface for the user's contract. Owner actions are enabled only when the owner wallet is connected, and contract rules still execute onchain.

### Simple First Screen

The interface should not start with a wall of chain data. A user chooses a rail, chooses a kit, and sees only the fields that matter for the current launch.

### Public Signals, Not Wallet Surveillance

Analytics should show aggregate onchain activity:

- launches,
- template demand,
- contract interactions,
- settlement activity.

The product should not turn into a wallet table for regular users. The analytics page is designed to show network-level momentum without making every user's address the center of the interface.

### Real Transactions

Faveri avoids fake onchain actions. The MVP supports real wallet transactions, real deployed contracts, real contract pages, and real registry events.

## Current Features

- Arc and Ink route selection.
- Wallet connection with wagmi and viem.
- Contract kit selection with polished visual cards.
- Deployment forms for all supported templates.
- Generated contract pages by address and template.
- Owner actions from the generated contract page.
- USDC approval and deposit flow for Gateway.
- Aggregate analytics route for public onchain signals.
- Hardhat contracts, tests, and deployment scripts.
- Generated ABI and deployment-address files for the frontend.

## Contract Kits

| Kit | Rail | Asset | Purpose |
| --- | --- | --- | --- |
| Tip Jar | Ink | ETH | Receive ETH support and tips. |
| Guestbook | Ink | ETH | Collect public onchain messages. |
| Builder Badge | Ink | ETH | Mint badges for contributors or community members. |
| Simple ERC20 | Ink | ETH | Create a small token experiment. |
| Mini Escrow | Ink | ETH | Pay for work after proof and approval. |
| USDC Tip Jar | Arc | USDC | Receive USDC support and lightweight payments. |
| USDC Mini Escrow | Arc | USDC | Lock, approve, and settle paid work in USDC. |

## Architecture Snapshot

```text
apps/web
  Next.js + React + TypeScript + Tailwind
  wagmi + viem for wallets, reads, writes, and logs
  generated ABIs and deployment addresses

packages/contracts
  Hardhat + TypeScript
  Solidity ^0.8.24
  OpenZeppelin v5
  Registry, template contracts, deployment scripts, tests
```

The registry deploys contract kits and emits launch events for analytics. Some deployment logic is split into stateless deployer libraries to keep contract size manageable. These libraries are deployment helpers, not upgrade systems.

## Local Development

Install dependencies:

```bash
pnpm install
```

Run the frontend:

```bash
pnpm dev
```

Open:

```text
http://localhost:3000
```

Run checks:

```bash
pnpm compile
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Run local chain and deploy locally:

```bash
pnpm chain
pnpm deploy:localhost
```

Stop foreground servers with `Ctrl+C` in the same terminal.

## Environment Variables

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Supported variables:

```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_REGISTRY_ADDRESS_LOCALHOST=
NEXT_PUBLIC_REGISTRY_ADDRESS_INK_MAINNET=
NEXT_PUBLIC_REGISTRY_ADDRESS_INK_SEPOLIA=
NEXT_PUBLIC_REGISTRY_ADDRESS_ARC_TESTNET=
NEXT_PUBLIC_USDC_ADDRESS_LOCALHOST=
NEXT_PUBLIC_USDC_ADDRESS_ARC_TESTNET=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_GATEWAY_WALLET_ADDRESS_ARC_TESTNET=0x0077777d7EBA4688BDeF3E311b846F25870A19B9
INK_MAINNET_RPC_URL=https://rpc-gel.inkonchain.com
INK_SEPOLIA_RPC_URL=https://rpc-gel-sepolia.inkonchain.com
ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
PRIVATE_KEY=
```

`PRIVATE_KEY` is only for Hardhat deployment scripts. Do not put private keys in frontend code or Vercel public variables.

## Deploy Contracts

Deploy to Ink Mainnet:

```bash
pnpm compile
pnpm deploy:ink
```

Deploy to Ink Sepolia:

```bash
pnpm compile
pnpm deploy:ink-sepolia
```

Deploy to Arc Testnet:

```bash
pnpm compile
pnpm deploy:arc
```

The deployment script writes frontend-readable addresses to:

```text
apps/web/src/generated/deployments.json
```

For production deployments, set the matching `NEXT_PUBLIC_REGISTRY_ADDRESS_*` variable in the frontend environment.

## Deploy Frontend To Vercel

Recommended settings:

- Framework preset: Next.js
- Root directory: `apps/web`
- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Output directory: default Next.js output

Required public variables for the current live Arc flow:

```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_REGISTRY_ADDRESS_ARC_TESTNET=0xDb5C8D18c67C5d4E00563E82150E1FD9E9ae8b9D
NEXT_PUBLIC_USDC_ADDRESS_ARC_TESTNET=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_GATEWAY_WALLET_ADDRESS_ARC_TESTNET=0x0077777d7EBA4688BDeF3E311b846F25870A19B9
```

Add Ink variables as needed:

```bash
NEXT_PUBLIC_REGISTRY_ADDRESS_INK_MAINNET=
NEXT_PUBLIC_REGISTRY_ADDRESS_INK_SEPOLIA=
```

Do not add `PRIVATE_KEY` to Vercel.

## Scripts

- `pnpm compile` - compile Solidity and export frontend ABIs.
- `pnpm test` - run Hardhat tests.
- `pnpm chain` - start local Hardhat node.
- `pnpm deploy:localhost` - deploy locally.
- `pnpm deploy:ink` - deploy to Ink mainnet.
- `pnpm deploy:ink-sepolia` - deploy to Ink Sepolia.
- `pnpm deploy:arc` - deploy to Arc Testnet.
- `pnpm dev` - run the frontend.
- `pnpm lint` - run lint checks.
- `pnpm typecheck` - run TypeScript checks.
- `pnpm build` - build the frontend.

## Safety Notes

- Blockchain data is public. Do not put secrets or private user data into messages, descriptions, metadata URIs, or proof URIs.
- USDC flows require explicit ERC20 approvals before tokens can move.
- Escrow contracts enforce the proof, approval, claim, cancel, and refund rules onchain.
- Gateway deposits use the configured GatewayWallet address.
- Faveri's frontend never asks users for a private key.

## Roadmap

Near-term ideas:

- Record and publish a focused Arc + USDC settlement demo.
- Verify deployed contracts on Arc and Ink explorers.
- Improve the contract pages with clearer post-launch guidance.
- Add import-by-address for contracts launched from another browser or device.
- Add richer aggregate analytics for follow-up actions after deployment.

USDC and settlement ideas:

- Add a CCTP funding route into Arc.
- Add an x402 / nanopayment demo connected to Faveri contract pages.
- Expand Gateway usage from deposit visibility into a fuller settlement-liquidity workflow.
- Add simple invoice-style pages backed by USDC Tip Jar or Escrow contracts.

Builder-product ideas:

- More templates for public goods, community operations, and creator payments.
- Template previews that show the exact user flow before deployment.
- Shareable contract pages with cleaner public-facing views.
- Better mobile flow for quick contract launch and management.
- Optional indexing layer for faster analytics while keeping onchain events as the source of truth.

Faveri is still an MVP, but the direction is clear: make useful onchain contracts easier to launch, easier to manage, and easier to measure.
