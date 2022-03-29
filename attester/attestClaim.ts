import { config as envConfig } from "dotenv";
import * as Kilt from "@kiltprotocol/sdk-js";

import { generateRequest } from "../claimer/generateRequest";
import { getAccount } from "./generateAccount";
import { getFullDid } from "./generateDid";
import { generateKeypairs } from "./generateKeypairs";
import { getLightDid } from "../claimer/generateLightDid";

export async function attestClaim(
  request: Kilt.IRequestForAttestation
): Promise<Kilt.IAttestation> {
  // Init
  await Kilt.init({ address: process.env.WSS_ADDRESS });

  // load account & DID
  const mnemonic = process.env.ATTESTER_MNEMONIC as string;
  const attesterDid = process.env.ATTESTER_DID_URI as string;
  const account = await getAccount(mnemonic);
  const keystore = new Kilt.Did.DemoKeystore();
  await generateKeypairs(keystore, mnemonic);
  const fullDid = await getFullDid(
    Kilt.Did.DidUtils.getIdentifierFromKiltDid(attesterDid)
  );

  // build the attestation object
  const attestation = Kilt.Attestation.fromRequestAndDid(request, fullDid.did);

  // check the request content and deny based on your business logic.
  // e.g. verify age with other credentials (birth certificate, passport, ...)

  // form tx and authorized extrinsic
  //   （这一步很快）
  console.log("Attester -> form tx and authorized extrinsic ...");
  const tx = await attestation.getStoreTx();
  const extrinsic = await fullDid.authorizeExtrinsic(
    tx,
    keystore,
    account.address
  );

  // write to chain
  // 写到链，比较慢
  console.log("Attester -> submit attestation...");
  await Kilt.BlockchainUtils.signAndSubmitTx(extrinsic, account, {
    resolveOn: Kilt.BlockchainUtils.IS_FINALIZED,
    reSign: true,
  });

  return attestation;
}

export async function attestingFlow(): Promise<Kilt.ICredential> {
  // first the claimer
  const request = await generateRequest({
    age: 27,
    name: "Mia Musterfrau",
  });

  console.log(`request for ${JSON.stringify(request)}`);

  // send the request to the attester 🕊
  const { lightDid } = await getLightDid();
  console.log(`lightDid ${JSON.stringify(lightDid)}`);

  const mnemonic = process.env.CLAIMER_MNEMONIC as string;
  const keystore1 = new Kilt.Did.DemoKeystore();
  await generateKeypairs(keystore1, mnemonic);

  console.log(`supportedAlgs ${await keystore1.supportedAlgs()}`);

  const attesterDid = process.env.ATTESTER_DID_URI as string;
  const fullDid = await getFullDid(
    Kilt.Did.DidUtils.getIdentifierFromKiltDid(attesterDid)
  );
  console.log(`fulllDid ${JSON.stringify(fullDid)}`);

  const requestForAttestationMessage = new Kilt.Message(
    {
      content: { requestForAttestation: request },
      type: Kilt.Message.BodyType.REQUEST_ATTESTATION,
    },
    lightDid.did,
    fullDid.did
  );

  // 1. encrypt:
  const encryptedRequestForAttestationMessage =
    await requestForAttestationMessage.encrypt(
      lightDid.encryptionKey!.id,
      lightDid,
      keystore1,
      fullDid.assembleKeyId(fullDid.encryptionKey!.id)
    );

  const mnemonic2 = process.env.ATTESTER_MNEMONIC as string;
  const keystore2 = new Kilt.Did.DemoKeystore();
  await generateKeypairs(keystore2, mnemonic2);

  const decryptedRequestForAttestationMessage = await Kilt.Message.decrypt(
    encryptedRequestForAttestationMessage,
    keystore2,
    fullDid
  );
  let extractedRequestForAttestation: Kilt.IRequestForAttestation;
  if (
    decryptedRequestForAttestationMessage.body.type ===
    Kilt.Message.BodyType.REQUEST_ATTESTATION
  ) {
    extractedRequestForAttestation =
      decryptedRequestForAttestationMessage.body.content.requestForAttestation;
  } else {
    throw new Error("Invalid request for attestation received.");
  }

  console.log(
    `extractedRequestForAttestation ${JSON.stringify(
      extractedRequestForAttestation
    )}`
  );
  throw new Error();
  // the attester checks the attributes and issues an attestation
  const attestation = await attestClaim(request);

  // send the attestation back to the claimer 🕊

  // build the credential and return it
  const credential = Kilt.Credential.fromRequestAndAttestation(
    request,
    attestation
  );

  return credential;
}

// don't execute if this is imported by another file
if (require.main === module) {
  envConfig();
  attestingFlow()
    .catch((e) => {
      console.log("Error while going throw attesting workflow", e);
      process.exit(1);
    })
    .then((c) => {
      console.log(
        "The claimer build their credential and now has to store it."
      );
      console.log("⚠️  add the following to your .env file. ⚠️");
      console.log(`CLAIMER_CREDENTIAL='${JSON.stringify(c)}'`);
      process.exit();
    });
}
