import { spawn } from "node:child_process";
import express from "express";
import { CHAIN_ID } from "./constants";
import { db } from "../lib/db/driver";

const ANVIL_PORT = 8545;
const PROXY_PORT = 8546;

export function startAnvil() {
  const anvil = spawn("anvil", ["--port", ANVIL_PORT.toString(), "--no-mining", "--chain-id", CHAIN_ID.toString()]);

  anvil.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });
  
  anvil.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });
  
  anvil.on('close', (code) => {
    console.log(`Anvil exited with code ${code}`);
  });

return new Promise<void>((resolve) => {
  const checkRpc = async () => {
    try {
      const res = await fetch(`http://localhost:${ANVIL_PORT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_chainId',
          params: [],
          id: 1,
        }),
      });
      const data = await res.json();
      if (data && data.result) {
        console.log("Anvil RPC is ready.");
        resolve();
        return;
      }
    } catch (error) {
      // RPC not ready yet, retry after a short delay
    }
    setTimeout(checkRpc, 100);
  };
  checkRpc();
});
}

export function killAnvil() {
  const killAnvil = spawn("pkill", ["-f", "anvil"]);

  killAnvil.on("error", (error) => {
    console.error("Error executing pkill command:", error);
  });

  killAnvil.on("close", (code) => {
    console.log("Anvil processes terminated.");
  });
   
}

export async function mineBlock() {
    await fetch(`http://localhost:${ANVIL_PORT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'evm_mine',
        params: [],
        id: 2,
      }),
    });
  }


export function startProxy() {
    const app = express();
    
    app.use(express.json());

    app.post("*", async (req, res) => {
        const url = new URL(req.originalUrl, `http://localhost:${ANVIL_PORT}`);
        const method = req.method;
        const body = req.body;

        const response = await fetch(url, { method, body });
        const data = await response.json();

        res.json(data);
    })

    app.listen(PROXY_PORT, () => {
        console.log(`Proxy server is running on port ${PROXY_PORT}`);
    })
}

export async function cleanDB() {
  await db.schema.dropTable("transaction").execute();
  await db.schema.dropTable("kysely_migration").execute();
  await db.schema.dropTable("kysely_migration_lock").execute();
}
