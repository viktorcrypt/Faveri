# Faveri

User-owned contract deployment and stablecoin settlement flows.

Faveri is a no-code / low-code launchpad for builders who need real onchain primitives without writing deployment scripts from scratch. Users connect a wallet, choose a template, customize parameters, deploy a user-owned contract, and manage it from a generated contract page.

The project started as an Ink contract launcher and expanded into a multi-mode builder tool:

- **Ink mode**: deploy user-owned smart contracts on Ink for builder tools, public goods, creator flows, and experiments.
- **Arc mode**: deploy USDC-native contracts on Arc Testnet and use Circle Gateway for settlement liquidity.

Faveri is designed to be a serious developer product: transparent ownership, no launcher admin rights over user contracts, public onchain metrics, and real wallet transactions instead of mocked flows.

## Why It Matters

Builders often need simple but trustworthy contracts before they can test an idea with real users. Faveri turns common contract patterns into one-wallet-flow deployments:

1. Connect wallet.
2. Choose a contract template.
3. Edit parameters.
4. Sign deployment.
5. Open the generated contract page.
6. Manage the contract through its own rules.

Every deployment is recorded by an onchain registry, creating public signals around builder activity:

- Contracts launched.
- Template usage.
- Deployer addresses.
- Contract addresses.
- Public metadata.
- Follow-up contract interactions.
- USDC settlement activity in Arc mode.

## Product Modes

### Ink Mode

Ink mode focuses on user-owned contract launching for builders.

Supported networks:

- Ink Mainnet: `57073`
- Ink Sepolia: `763373`
- Localhost Hardhat: `31337`

Templates:

- TipJar
- Guestbook
- BuilderBadge
- SimpleERC20
- MiniEscrow

### Arc / USDC Mode

Arc mode focuses on stablecoin settlement and Circle-aligned payment flows.

Supported network:

- Arc Testnet: `5042002`

Core assets and contracts:

- Arc RPC: `https://rpc.testnet.arc.network`
- Arc explorer: `https://testnet.arcscan.app`
- Arc USDC ERC20: `0x3600000000000000000000000000000000000000`
- Circle GatewayWallet: `0x0077777d7EBA4688BDeF3E311b846F25870A19B9`
- Gateway domain shown in UI: `26`

Arc templates:

- USDCTipJar
- USDCMiniEscrow

Circle Gateway flow:

1. User switches to Arc Testnet.
2. User approves USDC to GatewayWallet.
3. User deposits USDC into GatewayWallet.
4. UI reads wallet USDC, Gateway total balance, available balance, withdrawable balance, withdrawing balance, domain, allowance, and token support.

This makes Arc mode a real value/liquidity/settlement flow, not just another EVM network selector.

## Features

- Wallet connection with wagmi and viem.
- Next.js, React, TypeScript, and Tailwind frontend.
- Hardhat Solidity workspace.
- Seven real Solidity templates.
- Localhost, Ink Mainnet, Ink Sepolia, and Arc Testnet support.
- One-click deployment forms with client-side validation.
- Generated contract pages by deployed address and template.
- Owner-only actions gated in the UI and enforced onchain.
- Registry analytics dashboard.
- Public `ContractLaunched` events for metrics.
- Circle Gateway deposit console in Arc mode.
- Generated ABIs and deployment address resolution.
- No backend required for the current MVP.

## Architecture

```text
apps/web
  Next.js + React + TypeScript + Tailwind
  wagmi + viem wallet connection, reads, writes, logs
  generated ABIs and deployment-address resolution

packages/contracts
  Hardhat + TypeScript
  Solidity ^0.8.24
  OpenZeppelin v5
  InkLauncherRegistry
  Template deployer libraries
  TipJar, Guestbook, BuilderBadge, SimpleERC20, MiniEscrow
  USDCTipJar, USDCMiniEscrow, MockUSDC
  Tests and deployment scripts
```

The registry deploys templates and records `ContractLaunched` events. Some creation logic is moved into stateless linked deployer libraries so the registry stays below contract-size limits. These libraries are not proxies, are not upgrade paths, and do not retain control over deployed contracts.

## Ownership Model

The deployed contract belongs to the wallet that calls the registry.

- Contract owner: connected wallet.
- Launcher admin rights: none.
- Upgradeability: none.
- Funds control: only owner or template rules.
- Registry data: public deployment metadata only.

The registry never becomes the owner of `TipJar`, `Guestbook`, `BuilderBadge`, `SimpleERC20`, or `USDCTipJar`. For `MiniEscrow` and `USDCMiniEscrow`, the creator is the wallet that called the registry.

For `USDCMiniEscrow`, the registry atomically transfers the user's approved USDC into the newly deployed escrow contract. The registry does not custody funds after deployment and cannot approve, claim, refund, or cancel the escrow.

## Contract Templates

### TipJar

User-owned donation contract with minimum tip, public tip events, owner metadata updates, and owner withdrawal.

### Guestbook

User-owned onchain message wall with message fees, message length limits, public messages, and owner withdrawal.

### BuilderBadge

ERC721 badge contract for contributors, testers, quest winners, beta users, or community members. Can be transferable or soulbound after mint.

### SimpleERC20

Simple ERC20 template with initial supply minted to the user. Can be fixed supply or owner-mintable.

### MiniEscrow

Native-token milestone escrow. Funds are locked on deployment. A fixed worker or first open submitter can submit proof, creator approves, and worker claims.

### USDCTipJar

Arc-oriented payment contract. Users tip with ERC20 USDC through `approve + tip`, and only the contract owner can withdraw accumulated USDC.

### USDCMiniEscrow

Arc-oriented USDC milestone escrow. The creator approves USDC to the registry, the registry deploys a user-owned escrow, and the approved USDC is moved directly into that escrow. Worker proof, creator approval, claims, cancellation, and deadline refunds follow the same ownership model as MiniEscrow.

## Metrics

The registry stores and emits:

- Deployer address.
- Deployed contract address.
- Template ID.
- Template name.
- Public metadata string.
- Timestamp.

The frontend reads registry storage and `ContractLaunched` logs with viem.

## Local Development

Install dependencies:

```bash
pnpm install
```

Run checks:

```bash
pnpm compile
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Run local chain and deploy:

```bash
pnpm chain
pnpm deploy:localhost
```

Run frontend:

```bash
pnpm dev
```

Open:

```text
http://localhost:3000
```

Stop foreground servers with `Ctrl+C` in the same terminal.

On localhost, the deploy script also deploys `MockUSDC`, mints local USDC to the deployer account, and writes both registry and MockUSDC addresses to:

```text
apps/web/src/generated/deployments.json
```

## Environment Variables

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Required / supported variables:

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

Never put a real private key in frontend code. `PRIVATE_KEY` is used only by Hardhat deployment scripts.

## Deploy Contracts

### Ink Mainnet

```bash
pnpm compile
pnpm deploy:ink
```

After deployment, set or confirm:

```bash
NEXT_PUBLIC_REGISTRY_ADDRESS_INK_MAINNET=0x...
```

The existing generated Ink mainnet address may point to an older registry deployment. Redeploy with `pnpm deploy:ink` when you want Ink mainnet to use the newest registry ABI and template set.

### Ink Sepolia

```bash
pnpm compile
pnpm deploy:ink-sepolia
```

After deployment, set or confirm:

```bash
NEXT_PUBLIC_REGISTRY_ADDRESS_INK_SEPOLIA=0x...
```

### Arc Testnet

```bash
pnpm compile
pnpm deploy:arc
```

After deployment, set or confirm:

```bash
NEXT_PUBLIC_REGISTRY_ADDRESS_ARC_TESTNET=0x...
NEXT_PUBLIC_USDC_ADDRESS_ARC_TESTNET=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_GATEWAY_WALLET_ADDRESS_ARC_TESTNET=0x0077777d7EBA4688BDeF3E311b846F25870A19B9
```

Arc mode needs a fresh Arc registry deployment before USDC contract launching works. Gateway deposits use the configured GatewayWallet address and do not require the Faveri registry.

## Deploy Frontend To Vercel

Recommended Vercel settings:

- Framework preset: Next.js
- Root directory: `apps/web`
- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Output directory: default Next.js output

Set Vercel environment variables:

```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_REGISTRY_ADDRESS_INK_MAINNET=
NEXT_PUBLIC_REGISTRY_ADDRESS_INK_SEPOLIA=
NEXT_PUBLIC_REGISTRY_ADDRESS_ARC_TESTNET=
NEXT_PUBLIC_USDC_ADDRESS_ARC_TESTNET=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_GATEWAY_WALLET_ADDRESS_ARC_TESTNET=0x0077777d7EBA4688BDeF3E311b846F25870A19B9
```

Do not add `PRIVATE_KEY` to Vercel. Contract deployment happens locally through Hardhat, not from the frontend.

## Scripts

- `pnpm compile` - compile Solidity and export frontend ABIs.
- `pnpm test` - run Hardhat tests.
- `pnpm chain` - start local Hardhat node.
- `pnpm deploy:localhost` - deploy registry, linked libraries, and MockUSDC locally.
- `pnpm deploy:ink` - deploy to Ink mainnet.
- `pnpm deploy:ink-mainnet` - deploy to Ink mainnet.
- `pnpm deploy:ink-sepolia` - deploy to Ink Sepolia.
- `pnpm deploy:arc` - deploy to Arc Testnet.
- `pnpm deploy:arc-testnet` - deploy to Arc Testnet.
- `pnpm dev` - run the Next.js frontend.
- `pnpm lint` - run lint checks.
- `pnpm typecheck` - run TypeScript checks.
- `pnpm build` - build the Next.js frontend.

## Security Notes

- Template contracts use Solidity `^0.8.24`.
- OpenZeppelin v5 contracts are used where useful.
- BuilderBadge uses the OpenZeppelin v5 `_update` override pattern to block transfers when non-transferable.
- ReentrancyGuard protects ETH and USDC withdrawals and escrow payouts.
- Escrow creator cannot reclaim funds after approval.
- Worker cannot claim before approval.
- Registry only records public deployment metadata.
- USDC templates require ERC20 approvals. The UI performs explicit approval transactions before moving USDC.
- Gateway deposits use the GatewayWallet address configured by environment variable.
- Blockchain data is public. Do not submit private data in messages, descriptions, metadata URIs, or proof URIs.

## Test Status

Current verification set:

```bash
pnpm compile
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Latest local test pass:

```text
22 passing
```

The tests cover registry deployment, ownership guarantees, template usage counts, ETH templates, USDC templates, escrow lifecycle, and negative impersonation cases proving the registry cannot manage child contracts.

## Roadmap

- Fresh deploys on Ink Mainnet and Arc Testnet with the newest registry ABI.
- Vercel production deployment.
- Contract verification on Ink and Arc explorers.
- CCTP funding route into Arc mode.
- x402 / nanopayment demo backed by Gateway balance.
- Richer event indexing for follow-up interactions.
- Import-by-address for contracts not launched in the current browser session.
- Template source previews before deployment.
- CSV export for launch analytics.
- Additional templates for public goods and builder operations.
