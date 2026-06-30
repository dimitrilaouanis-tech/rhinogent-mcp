/**
 * connect.mjs — the copy-paste bridge between the Rhinogent SITE and any chat agent.
 *
 * When a user mints a wallet on the Rhinogent dashboard, the site calls connectSnippet()
 * with the freshly-minted identity and shows the result. The user copies it into their
 * Claude / Cursor / Codex MCP config, and the agent is linked to 0n1x INSTANTLY — its
 * identity (callsign + address + did:pkh) rides every tool call as auth + trust signal.
 *
 * Import in the Next.js dashboard:
 *   import { connectSnippet } from "@0n1x/rhinogent/connect";
 *   const block = connectSnippet(mintedIdentity);   // -> show in a copy box
 */

/** Build the MCP config block to paste into a chat agent. Identity baked into env. */
export function connectSnippet({ callsign, address, did } = {}) {
  return JSON.stringify(
    {
      mcpServers: {
        rhinogent: {
          command: "npx",
          args: ["-y", "github:dimitrilaouanis-tech/rhinogent-mcp"],
          env: {
            RHINOGENT_AGENT: callsign || "",
            RHINOGENT_ADDRESS: address || "",
            RHINOGENT_DID: did || "",
          },
        },
      },
    },
    null,
    2
  );
}

/** A one-line human summary to show above the copy box. */
export function connectSummary({ callsign, address } = {}) {
  return `You are ${callsign || "a new agent"} (${(address || "").slice(0, 8)}…). ` +
    `Paste the block into your agent's MCP config — it's now a Rhinogent agent and can verify ` +
    `counterparties, sign facts, carry reputation, and transact safely.`;
}

// quick CLI: node connect.mjs <callsign> <address> <did>
if (import.meta.url === `file://${process.argv[1]}`) {
  const [callsign, address, did] = process.argv.slice(2);
  const id = { callsign: callsign || "Keen-Beacon-1A2B", address: address || "0x1A2B3c4D5e6F7081920aBcDeF0123456789AbCdE", did: did || "did:pkh:eip155:8453:0x1A2B…" };
  console.log("// " + connectSummary(id) + "\n");
  console.log(connectSnippet(id));
}
