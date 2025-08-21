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

        s3.abort_multipart_upload(Bucket=bucket, Key=key, UploadId=upload_id)
        return {"statusCode": 200, "body": json.dumps({"aborted": True})}
    except Exception as e:
        logger.exception("abort failed")
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}

