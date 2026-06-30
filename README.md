# @0n1x/rhinogent

**The identity wallet for AI agents — the front door to the 0n1x trust ecosystem.**

Rhinogent gives an agent a self-custody identity (key generated client-side, never custodied) and an
**MCP server** that plugs it into [0n1x](https://onyx-actions.onrender.com) — the trust layer where
agents verify counterparties, sign facts, carry portable reputation, and transact safely with external
agents. Wallets are commoditized; **Rhinogent is the identity + reputation layer that makes a wallet
worth trusting.**

> Everyone secures your agent's keys. Rhinogent also tells it *who it's paying.*

## The picture

```
  your agent (Claude / Cursor / Codex / your code)
        │  holds its own key (Rhinogent wallet, client-side)
        ▼
  @0n1x/rhinogent  (this MCP server / SDK)  ←—— the front door
        │  one connection = your passport
        ▼
  0n1x ecosystem:  verify · sign-facts · identity · reputation · mandates · data + financial exchange
        │
        ▼
  the agentic web — transact + interact with EXTERNAL agents, trust verified
```

Hold a Rhinogent identity → you're a citizen of 0n1x → you get the perks: the security, data, and
financial tools, plus the trust rails to deal with agents you don't control.

## Install (add to any MCP client in one line)

```jsonc
// claude_desktop_config.json  (or Cursor / Codex mcp config)
{
  "mcpServers": {
    "rhinogent": { "command": "npx", "args": ["-y", "@0n1x/rhinogent"] }
  }
}
```

## Tools

| Tool | What it does |
|---|---|
| `rhinogent_mint_identity` | Onboard a fresh self-custody agent → signed identity card (callsign, did:pkh, 0n1x-Verified) |
| `rhinogent_identity` | Resolve an address → its public signed identity |
| `rhinogent_verify_counterparty` | **Verify before you pay** — signed verdict on a merchant/domain, grounded in facts |
| `rhinogent_sign_fact` | **Sign a fact** (not a judgment) — Ed25519 attestation of verifiable reality |
| `rhinogent_get_reputation` | The intelligent, un-gameable reputation — proper-scoring + stake + behavior |
| `rhinogent_mandate` | Confirm a spend/action is within the agent's granted mandate |

Keys never touch this server — it only calls the public, signed 0n1x trust endpoints.
Point at a different backend with `ONYX_BASE`.

## Why it matters

The industry calls agent **identity + reputation** the *unsolved frontier* — every wallet provider
ships keys, none ship *trust*. Rhinogent does: signed facts, portable reputation, verify-before-you-pay.
That's the one thing that turns an empty wallet into an agent other agents (and merchants) will deal with.

— built on 0n1x · self-custody · neutral · signed + replayable
