#!/usr/bin/env node
/**
 * @0n1x/rhinogent — MCP server for the Rhinogent agent identity wallet.
 *
 * Thin wrapper over the already-deployed 0n1x trust tools on onyx-actions. An agent
 * in Claude / Cursor / Codex / Gemini gets these as native tools:
 *   · rhinogent_identity          — turn a self-custody address into a signed identity
 *   · rhinogent_verify_counterparty — verify-before-you-pay (signed counterparty check)
 *   · rhinogent_mandate           — check a spend mandate is in scope
 *
 * Keys never touch this server — identity is self-custody, issued client-side by the
 * Rhinogent wallet. This only calls the public, signed trust endpoints.
 *
 *   npx @0n1x/rhinogent           (stdio MCP server)
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = process.env.ONYX_BASE || "https://onyx-actions.onrender.com";
const EVM = /^0x[0-9a-fA-F]{40}$/;

// The connected agent's identity — injected by the Rhinogent site's copy-paste config.
// Every call carries it: AUTHENTICATION (who you are) + TRUST SIGNAL (your 0n1x reputation).
// This is the front-door → ecosystem link (Eco consensus: identity = the universal passport).
const AGENT = {
  callsign: process.env.RHINOGENT_AGENT || null,
  address: process.env.RHINOGENT_ADDRESS || null,
  did: process.env.RHINOGENT_DID || null,
  // SECRET — lives ONLY in the owner's local config, NEVER in the shareable connect block.
  // Public block (above) lets anyone CHECK the identity; this proves you may ACT as it.
  key: process.env.RHINOGENT_KEY || null,
};

import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex } from "@noble/hashes/utils";
import { privateKeyToAccount } from "viem/accounts";

// ACT paths require proof-of-key (mirror of server _siwe.ACT_PATHS). Everything else CHECKS.
const ACT_PATHS = ["/attest", "/onboard", "/perm/check"];
const isActPath = (p) => ACT_PATHS.some((a) => p.startsWith(a));

// Canonical message — signs the LITERAL request, MUST byte-match server _siwe.canonical().
function canonical(method, fullPath, nonce, ts) {
  return `0n1x:request\nagent=${AGENT.callsign || ""}\naddress=${(AGENT.address || "").toLowerCase()}\n` +
    `method=${method.toUpperCase()}\npath=${fullPath}\nnonce=${nonce}\nts=${ts}`;
}

async function getJSON(path) {                 // path includes the full query, exactly as sent
  const headers = { "user-agent": "rhinogent-mcp/0.2" };
  if (AGENT.address) {                         // public credential — identifies, doesn't authorize
    headers["x-rhinogent-agent"] = AGENT.callsign || AGENT.address;
    headers["x-rhinogent-address"] = AGENT.address;
    if (AGENT.did) headers["x-rhinogent-did"] = AGENT.did;
  }
  if (isActPath(path)) {                       // act-as-account → prove key control
    if (!AGENT.key) {
      throw new Error(
        `This acts as your account, so it needs proof of your key. The shared connect ` +
        `block can only CHECK identities. Set RHINOGENT_KEY in your LOCAL config (never share it).`);
    }
    const acct = privateKeyToAccount(AGENT.key.startsWith("0x") ? AGENT.key : `0x${AGENT.key}`);
    const t = ts();
    const nonce = bytesToHex(sha256(new TextEncoder().encode(`${path}${t}${perf()}`))).slice(0, 24);
    headers["x-rhinogent-nonce"] = nonce;
    headers["x-rhinogent-ts"] = String(t);
    headers["x-rhinogent-sig"] = await acct.signMessage({ message: canonical("GET", path, nonce, t) });
  }
  const r = await fetch(BASE + path, { headers });
  if (!r.ok) throw new Error(`onyx-actions ${r.status} for ${path}`);
  return r.json();
}
const ts = () => Math.floor(Date.now() / 1000);
const perf = () => (globalThis.performance ? performance.now() : 0);

const server = new McpServer({ name: "rhinogent", version: "0.1.0" }, {
  instructions:
    "Rhinogent is the identity wallet for AI agents, on the 0n1x trust layer. Use " +
    "rhinogent_identity to read an agent's signed identity, rhinogent_verify_counterparty " +
    "BEFORE paying or trusting another party, and rhinogent_mandate to confirm a spend is " +
    "in scope. Results are Ed25519-signed and independently verifiable.",
});

server.registerTool("rhinogent_identity", {
  title: "Rhinogent identity",
  description: "Resolve a self-custody Base/EVM address into its signed Rhinogent identity " +
    "(callsign, did:pkh, 0n1x-Verified credential). Keys stay with the agent; this reads the public identity.",
  inputSchema: { address: z.string().regex(EVM, "0x-prefixed 42-char EVM address") },
}, async ({ address }) => {
  const d = await getJSON(`/whoami?address=${address}`);
  return { content: [{ type: "text", text: JSON.stringify(d) }] };
});

server.registerTool("rhinogent_verify_counterparty", {
  title: "Verify counterparty (verify before you pay)",
  description: "Verify a merchant/domain/counterparty BEFORE an agent pays or trusts it. " +
    "Returns a signed verdict grounded in facts (domain age, brand match, TLS), not opinion.",
  inputSchema: { domain: z.string().min(3, "a domain like example.com") },
}, async ({ domain }) => {
  const d = await getJSON(`/api/check?url=${encodeURIComponent(domain)}`);
  return { content: [{ type: "text", text: JSON.stringify(d) }] };
});

server.registerTool("rhinogent_mandate", {
  title: "Check spend mandate",
  description: "Confirm a proposed action/spend is within the agent's granted mandate (amount, " +
    "recipient, scope). Returns IN_SCOPE / OUT_OF_SCOPE, signed.",
  inputSchema: {
    agent: z.string().min(1),
    action: z.string().min(1),
    amount_usdc: z.number().nonnegative().optional(),
  },
}, async ({ agent, action, amount_usdc }) => {
  const q = `agent=${encodeURIComponent(agent)}&action=${encodeURIComponent(action)}` +
    (amount_usdc != null ? `&amount=${amount_usdc}` : "");
  const d = await getJSON(`/perm/check?${q}`).catch((e) => ({ error: String(e) }));
  return { content: [{ type: "text", text: JSON.stringify(d) }] };
});

server.registerTool("rhinogent_mint_identity", {
  title: "Mint a Rhinogent identity",
  description: "Onboard a fresh self-custody agent: returns a signed identity card (callsign, " +
    "did:pkh, 0n1x-Verified credential) for a newly-generated Base address. The Rhinogent wallet " +
    "generates the key client-side; this issues the public signed card.",
  inputSchema: { address: z.string().regex(EVM, "0x-prefixed 42-char EVM address") },
}, async ({ address }) => {
  const d = await getJSON(`/onboard?address=${address}`).catch((e) => ({ error: String(e) }));
  return { content: [{ type: "text", text: JSON.stringify(d) }] };
});

server.registerTool("rhinogent_sign_fact", {
  title: "Sign a fact (the moat — facts, not judgments)",
  description: "Get an Ed25519-signed attestation of a verifiable FACT (e.g. an outcome, a price, " +
    "a merchant detail) — signed reality the agent can hand a counterparty, not an opinion.",
  inputSchema: {
    subject: z.string().min(1),
    fact: z.string().min(1),
    evidence: z.string().optional(),
  },
}, async ({ subject, fact, evidence }) => {
  const q = `subject=${encodeURIComponent(subject)}&fact=${encodeURIComponent(fact)}` +
    (evidence ? `&evidence=${encodeURIComponent(evidence)}` : "");
  const d = await getJSON(`/attest?${q}`).catch((e) => ({ error: String(e) }));
  return { content: [{ type: "text", text: JSON.stringify(d) }] };
});

server.registerTool("rhinogent_get_reputation", {
  title: "Get reputation (the intelligent metric)",
  description: "Read an agent's intelligent, un-gameable reputation — proper-scoring accuracy " +
    "(Brier) + stake-weighting + behavioral consistency, built on signed verified outcomes. " +
    "This is what makes a Rhinogent identity worth trusting vs an empty wallet.",
  inputSchema: { agent: z.string().min(1, "callsign or 0x address") },
}, async ({ agent }) => {
  const d = await getJSON(`/rank?agent=${encodeURIComponent(agent)}`).catch((e) => ({ error: String(e) }));
  return { content: [{ type: "text", text: JSON.stringify(d) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("rhinogent MCP server running (stdio) — base:", BASE);
