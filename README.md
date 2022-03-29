### DID

yarn ts-node ./attester/generateDid.ts

### CType

注意点：

1. Creating CTypes requires an account and a full DID
2. 先 authorizeExtrinsic，再 signAndSubmitTx，为啥？
3. 不需要返回值，await generateKeypairs(keystore, mnemonic)，为啥？
4. ctype.verifyStored 为 true，因为肯定有人先创建了 ctype 了,所以 ctype 只和具体内容相关吧，相同内容的 ctype 只能有一个人能够创建

yarn ts-node attester/generateCtype.ts

# Claimer DID

claimer doesn't have an account.
The claimer doesn't need to hold funds and also doesn't need a blockchain account.

yarn ts-node ./claimer/generateLightDid.ts

# Claimer Request an Attestation

生成一个 request.json 放本地了，然后给 attester 写到区块链

每次执行这个命令，都会生成不同的文件
yarn ts-node claimer/generateRequest.ts

# Attester Attestaion

如果同意，就写到区块链
yarn ts-node attester/attestClaim.ts

返回一个结果，其实只是比 request.json 多了这个
{"claimHash":"0x70a6f83f976644700ca4d0f44d0533d32478e386d7095a122dce0f23dadc190c","cTypeHash":"0xd8ad043d91d8fdbc382ee0ce33dc96af4ee62ab2d20f7980c49d3e577d80e5f5","delegationId":null,"owner":"did:kilt:4o1agqEshKHmycwZZ6pnpffbGRx9dBuX6hwMhC66xgXZkXw3","revoked":false}

owner 就是 attester 的账号，claimHash 就是 rootHash，所以就可以理解为 owner 对一个 claim 签名了，这个时候就可以给别人去看了

区块链查询
https://kilt-testnet.subscan.io/account/4o1agqEshKHmycwZZ6pnpffbGRx9dBuX6hwMhC66xgXZkXw3

### 大锤的目标

创建 claimRequest 的时候不传 request
claim.utils.js 157~159 行 注释，然后
claimer/createClaim.js 里面的 did 就可以随便改了
