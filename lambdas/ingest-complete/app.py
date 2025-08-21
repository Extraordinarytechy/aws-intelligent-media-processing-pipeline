import json
import os
import logging
import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)
s3 = boto3.client("s3")
DEFAULT_BUCKET = os.environ.get("SOURCE_BUCKET")

def lambda_handler(event, context):
    try:
        body = event.get("body", event)
        if isinstance(body, str):
            body = json.loads(body)

        bucket = body.get("bucket", DEFAULT_BUCKET)
        key = body["key"]
        upload_id = body["uploadId"]
        parts = body["parts"]  # [{ "PartNumber": 1, "ETag": "\"etag-value\"" }, ...]

        # ensure parts sorted by PartNumber
        parts_sorted = sorted(parts, key=lambda p: int(p["PartNumber"]))
        multipart = {"Parts": [{"ETag": p["ETag"], "PartNumber": int(p["PartNumber"])} for p in parts_sorted]}

        resp = s3.complete_multipart_upload(
            Bucket=bucket,
            Key=key,
            UploadId=upload_id,
            MultipartUpload=multipart
        )

        return {"statusCode": 200, "body": json.dumps({"result": resp})}
    except Exception as e:
        logger.exception("complete failed")
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}

