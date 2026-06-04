# Ink Contract Launcher

Deploy user-owned smart contracts on Ink and USDC-native settlement contracts on Arc.

Ink Contract Launcher is a no-code deployment helper for onchain builders. It lets users deploy user-owned smart contracts from open-source templates, while the registry creates public metrics around builder activity: deployments, template usage, and follow-up contract interactions.

The app has two product modes:

- Ink mode: user-owned ETH/native contract templates for builder tools and experiments.
- Arc mode: USDC-native contracts plus a Circle Gateway deposit console for settlement liquidity.

## Why This Matters

New builders often need a small contract before they can prove an idea onchain. This launcher turns common experiments into one-wallet-flow deployments: choose a template, edit parameters, sign, and manage the resulting contract from a generated page.

The project creates measurable public onchain signals:

- New contracts deployed by builders.
- Template usage counts by contract type.
- Registry events for launch activity.
- Follow-up interactions on user-owned child contracts.
- USDC settlement activity through Arc templates and Gateway deposits.

## Features

- Wallet connection with wagmi and viem.
- Ink mainnet, Ink Sepolia, Arc Testnet, and localhost Hardhat chain config.
- Seven real Solidity templates.
- One-click deploy forms with parameter validation.
- Generated contract detail pages with owner actions.
- Onchain registry metrics dashboard.
- Circle Gateway deposit flow on Arc Testnet: approve USDC, deposit into GatewayWallet, and read Gateway balances.
- No backend required for the core deployment and Gateway deposit MVP.
- Frontend reads generated ABIs and deployment addresses where available.

## Architecture

```text
apps/web
  Next.js + React + TypeScript + Tailwind
  wagmi + viem wallet, reads, writes, logs

packages/contracts
  Hardhat + TypeScript
  InkLauncherRegistry
  TipJar, Guestbook, BuilderBadge, SimpleERC20, MiniEscrow
  USDCTipJar, USDCMiniEscrow, MockUSDC
  Tests and deployment scripts
```

The registry deploys templates and records `ContractLaunched` events. Template creation code for several contracts is moved into stateless linked deployer libraries so the registry stays below contract-size limits. These libraries are not proxies, are not upgrade paths, and do not retain control over deployed contracts.

## User Ownership Model

The deployed contract belongs to the wallet that calls the registry.

- Contract owner: connected wallet.
- Launcher admin rights: none.
- Upgradeability: none.
- Funds control: only owner or template rules.
- Registry data: public deployment metadata only.

The registry/factory never becomes the owner of TipJar, Guestbook, BuilderBadge, SimpleERC20, or USDCTipJar. For MiniEscrow and USDCMiniEscrow, the creator is the wallet that called the registry.

For USDCMiniEscrow, the registry atomically transfers the user's approved USDC into the newly deployed escrow contract. The registry does not custody funds after deployment and cannot approve, claim, refund, or cancel the escrow.

## No Backdoors

- No upgradeable proxies.
- No hidden owner.
- No launcher admin over user contracts.
- No registry withdrawal rights.
- No registry mint rights.
- No registry escrow approval rights.

Tests include negative impersonation cases proving the registry address cannot withdraw, mint, approve, or manage child contracts.

## Contract Templates

### TipJar

User-owned donation contract with minimum tip, public tip events, owner metadata updates, and owner withdrawal.

### Guestbook

User-owned onchain message wall with message fees, message length limits, public messages, and owner withdrawal.

### BuilderBadge

ERC721 badge contract for contributors, testers, quest winners, or beta users. Can be transferable or soulbound after mint.

### SimpleERC20

Simple ERC20 template with initial supply minted to the user. Can be fixed supply or owner-mintable.

### MiniEscrow

Simple quest or milestone reward escrow. Funds are locked on deployment. A fixed worker or first open submitter can submit proof, creator approves, and worker claims.

### USDCTipJar

Arc-oriented payment contract. Users tip with ERC20 USDC through `approve + tip`, and only the contract owner can withdraw the accumulated USDC.

### USDCMiniEscrow

Arc-oriented milestone escrow. The creator approves USDC to the registry, the registry deploys a user-owned escrow, and the approved USDC is moved directly into that escrow. Worker proof, creator approval, claims, cancellation, and deadline refunds follow the same ownership rules as MiniEscrow.

## Arc And Circle Integration

Arc mode is not just an extra RPC option. It adds stablecoin settlement flows:

- Arc Testnet chain ID: `5042002`
- RPC: `https://rpc.testnet.arc.network`
- Explorer: `https://testnet.arcscan.app`
- Native gas display: `USDC`
- Arc USDC ERC20: `0x3600000000000000000000000000000000000000`
- Circle GatewayWallet: `0x0077777d7EBA4688BDeF3E311b846F25870A19B9`

Gateway flow in the frontend:

1. User switches to Arc Testnet.
2. User approves USDC to GatewayWallet.
3. User deposits USDC into GatewayWallet.
4. UI reads wallet USDC, Gateway total balance, available balance, withdrawable balance, withdrawing balance, domain, allowance, and token support.

This creates a real value/liquidity/settlement surface for Arc. CCTP and x402-style nanopayments are natural next steps, but they are not presented as fake buttons in this MVP.

## Metrics Collected

The registry stores and emits:

- Deployer address.
- Deployed contract address.
- Template ID.
- Template name.
- Public metadata string.
- Timestamp.

The frontend reads registry storage and `ContractLaunched` logs with viem.

## Local Development

```bash
pnpm install
pnpm compile
pnpm test
pnpm chain
pnpm deploy:localhost
pnpm dev
```

Open the frontend at `http://localhost:3000`.

If the registry address is missing, the UI shows:

```text
Deploy the registry first and set NEXT_PUBLIC_REGISTRY_ADDRESS_*
```

The deploy script also writes `apps/web/src/generated/deployments.json`, which the frontend can read. On localhost it also deploys `MockUSDC` and writes that address for local USDC template testing.

For local demos, run the frontend in the foreground so it is easy to stop:

```bash
pnpm dev
```

Stop it with `Ctrl+C` in the same terminal.

If you start it in a separate PowerShell process, keep the process ID:

```powershell
$p = Start-Process -FilePath "pnpm" -ArgumentList "dev" -WorkingDirectory "." -PassThru
$p.Id
Stop-Process -Id $p.Id
```

## Deployment To Ink Mainnet

Network:

- Chain ID: `57073`
- RPC: `https://rpc-gel.inkonchain.com`
- Explorer: `https://explorer.inkonchain.com`
- Native currency: `ETH`

Deploy:

```bash
cp .env.example .env
pnpm install
pnpm compile
pnpm deploy:ink
```

After deployment, set:

```bash
NEXT_PUBLIC_REGISTRY_ADDRESS_INK_MAINNET=0x...
```

The existing generated Ink mainnet address may point to an older registry deployment. Redeploy with `pnpm deploy:ink` when you want Ink mainnet to use the newest registry ABI and template set.

## Deployment To Arc Testnet

Network:

- Chain ID: `5042002`
- RPC: `https://rpc.testnet.arc.network`
- Explorer: `https://testnet.arcscan.app`
- Native currency: `USDC`
- USDC ERC20: `0x3600000000000000000000000000000000000000`

Deploy:

```bash
cp .env.example .env
pnpm install
pnpm compile
pnpm deploy:arc
```

After deployment, set:

```bash
NEXT_PUBLIC_REGISTRY_ADDRESS_ARC_TESTNET=0x...
NEXT_PUBLIC_USDC_ADDRESS_ARC_TESTNET=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_GATEWAY_WALLET_ADDRESS_ARC_TESTNET=0x0077777d7EBA4688BDeF3E311b846F25870A19B9
```

Arc mode needs a fresh Arc registry deployment before contract launching works. The deploy script writes the Arc registry address to `apps/web/src/generated/deployments.json`; the environment variable can override it if needed.

## Environment Variables

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

Never put a real private key in the frontend. `PRIVATE_KEY` is used only by Hardhat deployment scripts.

## Scripts

- `pnpm compile` - compile Solidity and export frontend ABIs.
- `pnpm test` - run Hardhat tests.
- `pnpm chain` - start local Hardhat node.
- `pnpm deploy:localhost` - deploy registry and linked libraries locally.
- `pnpm deploy:ink` - deploy to Ink mainnet.
- `pnpm deploy:ink-sepolia` - optional deploy to Ink Sepolia.
- `pnpm deploy:arc` / `pnpm deploy:arc-testnet` - deploy to Arc Testnet.
- `pnpm dev` - run the Next.js frontend.
- `pnpm lint` - run lint/type lint checks.
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

## Roadmap

- Verify contracts on Ink and Arc explorers.
- Add richer event indexing for follow-up interactions.
- Add CCTP funding routes into Arc mode.
- Add x402/nanopayment resource server examples backed by Gateway balance.
- Add optional template source previews before deployment.
- Add import-by-address for contracts not launched in the current browser session.
- Add CSV export for launch analytics.
- Add more templates for public goods and builder operations.
