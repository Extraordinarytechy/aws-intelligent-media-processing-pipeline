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
        part_number = int(body["partNumber"])

        url = s3.generate_presigned_url(
            ClientMethod="upload_part",
            Params={
                "Bucket": bucket,
                "Key": key,
                "UploadId": upload_id,
                "PartNumber": part_number
            },
            ExpiresIn=900  # 15 minutes
        )

        return {
            "statusCode": 200,
            "body": json.dumps({"url": url, "partNumber": part_number})
        }
    except Exception as e:
        logger.exception("sign-part failed")
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}

