import { config as envConfig } from "dotenv";

import * as Kilt from "@kiltprotocol/sdk-js";

import { getAccount } from "./generateAccount";
import { generateKeypairs } from "./generateKeypairs";

export async function createFullDid(): Promise<Kilt.Did.FullDidDetails> {
  console.log(`connectiing kilt address..`);

  await Kilt.init({ address: process.env.WSS_ADDRESS });
  const { api } = await Kilt.connect();
  console.log(`connected.`);

  const mnemonic = process.env.ATTESTER_MNEMONIC as string;

  // Init keystore and load attester account
  const account = await getAccount(mnemonic);
  console.log(`loglog1 account: ${JSON.stringify(account.address)}`);
  const keystore = new Kilt.Did.DemoKeystore();

  // generate the keypairs
  // we are using the same mnemonic as for the attester account, but we could also use a new secret
  const keys = await generateKeypairs(keystore, mnemonic);

  console.log(
    `loglog2 keys.authentication.publicKey: ${keys.authentication.publicKey} , keys.authentication.type: ${keys.authentication.publicKey}`
  );

  // get extrinsic that will create the DID on chain and DID-URI that can be used to resolve the DID Document
  return new Kilt.Did.FullDidCreationBuilder(api, keys.authentication)
    .addEncryptionKey(keys.keyAgreement)
    .setAttestationKey(keys.assertionMethod)
    .setDelegationKey(keys.capabilityDelegation)
    .consumeWithHandler(keystore, account.address, async (creationTx) => {
      await Kilt.BlockchainUtils.signAndSubmitTx(creationTx, account, {
        reSign: true,
        resolveOn: Kilt.BlockchainUtils.IS_FINALIZED,
      });
    });
}

export async function getFullDid(
  didIdentifier: Kilt.IDidIdentifier
): Promise<Kilt.Did.FullDidDetails> {
  // make sure the did is already on chain
  const onChain = await Kilt.Did.FullDidDetails.fromChainInfo(didIdentifier);
  if (!onChain)
    throw Error(`failed to find on chain did: did:kilt:${didIdentifier}`);
  return onChain;
}

// don't execute if this is imported by another file
if (require.main === module) {
  envConfig();
  createFullDid()
    .catch((e) => {
      console.log("Error while creating attester DID", e);
      process.exit(1);
    })
    .then((did) => {
      console.log("\nsave following to .env to continue\n");
      console.error(`ATTESTER_DID_URI=${did.did}\n`);
      process.exit();
    });
}
