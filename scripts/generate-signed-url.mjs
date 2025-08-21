import { getSignedUrl } from "@aws-sdk/cloudfront-signer";
import fs from "fs";

// Key pair info
const keyPairId = "Your keypair id";
const privateKeyPath = "/home/extraordinarytechy/prime-vod-clean/infra/cloudfront/private_key.pem";
const privateKey = fs.readFileSync(privateKeyPath, "utf8");

// URL to your master .m3u8
const url = "master URL";

const signedUrl = getSignedUrl({
  url,
  keyPairId,
  privateKey,
  expires: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
});

console.log("Signed URL:", signedUrl);

