
from datetime import datetime, timedelta, timezone
from botocore.signers import CloudFrontSigner
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding

def _rsa_signer_loader(private_key_path):
    def rsa_signer(message):
        with open(private_key_path, 'rb') as f:
            priv_key = serialization.load_pem_private_key(f.read(), password=None)
        return priv_key.sign(message, padding.PKCS1v15(), hashes.SHA1())
    return rsa_signer

def sign_url(url, key_pair_id, private_key_path, expire_minutes=60):
    expires = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    signer = CloudFrontSigner(key_pair_id, _rsa_signer_loader(private_key_path))
    return signer.generate_presigned_url(url, date_less_than=expires)

if __name__ == "__main__":
    
    KEY_PAIR_ID = "K1QTZM6I2J6RJE" 
    PRIVATE_KEY_PATH = "/home/extraordinarytechy/prime-vod-clean/infra/cloudfront/private_key.pem"
    URL = "your master URL"

    print(sign_url(URL, KEY_PAIR_ID, PRIVATE_KEY_PATH, expire_minutes=60))

