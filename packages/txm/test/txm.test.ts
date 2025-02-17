import { beforeAll, afterAll, expect, test } from "vitest";
import { killAnvil, mineBlock, startProxy } from "./utils";
import { startAnvil } from "./utils";
import { TransactionManager } from "../lib/TransactionManager";
import { migrateToLatest } from "../lib/migrate";
import { PRIVATE_KEY, RPC_URL, CHAIN_ID } from "./constants";
import { abis } from "@happy.tech/contracts/random/anvil"
import { cleanDB } from "./utils";
import { TxmHookType } from "../lib/HookManager";
import { sleep } from "@happy.tech/common";

const txm = new TransactionManager({
  privateKey: PRIVATE_KEY,
  chainId: CHAIN_ID,
  rpc: {
    url: RPC_URL,
    pollingInterval: 200,
  },
  abis: abis,
});

beforeAll(async () => {
  await cleanDB();
  await migrateToLatest();
  await startAnvil();
  await startProxy();
  await txm.start();
});


test("Setup is correct", async () => {
  let blockMined = false;
  txm.addHook(TxmHookType.NewBlock, () => {
    blockMined = true;
  });

  await mineBlock();

  await sleep(1000);

  expect(blockMined).toBe(true);
});

afterAll(() => {
  killAnvil();
});