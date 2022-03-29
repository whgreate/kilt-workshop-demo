// 自己按照workshop写个更直接的版本

// yarn ts-node ./my-test.ts
import { config as envConfig } from "dotenv";
import * as Kilt from "@kiltprotocol/sdk-js";

async function test() {
  envConfig();
  await Kilt.init({ address: process.env.WSS_ADDRESS });
  // 本质：chain_helpers_1.BlockchainApiConnection.getConnectionOrConnect()，
  // 后Did.chain.js generateCreateTxFromCreationDetails用又来一遍浪费
  const { api } = await Kilt.connect();
  console.log(`connected.`);

  console.log(`${api.registry.chainTokens}`);
  console.log(
    `${JSON.stringify(api.tx.did.create.meta.args[0].type.toString())}`
  );

  const rawCreationDetails = {};
  const encodedDidCreationDetails = api.registry.createType(
    api.tx.did.create.meta.args[0].type.toString(),
    rawCreationDetails
  );

  console.log(`${JSON.stringify(encodedDidCreationDetails)}`);

  keys;
}

test();
