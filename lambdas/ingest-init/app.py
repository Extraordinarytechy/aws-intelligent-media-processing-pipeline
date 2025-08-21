import os, json, boto3, uuid

s3 = boto3.client("s3")
SOURCE_BUCKET = os.environ.get("SOURCE_BUCKET")

def _ok(body):
    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST"
        },
        "body": json.dumps(body)
    }

def _err(code, msg):
    return {
        "statusCode": code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST"
        },
        "body": json.dumps({"error": msg})
    }

def _parse_body(event):
    # Works for Lambda test, API Gateway proxy, or direct invoke
    if isinstance(event, dict) and "body" in event:
        body = event["body"]
        if isinstance(body, str):
            return json.loads(body or "{}")
        return body or {}
    return event if isinstance(event, dict) else {}

def lambda_handler(event, context):
    try:
        if not SOURCE_BUCKET:
            return _err(500, "Missing SOURCE_BUCKET env var")

        body = _parse_body(event)
        key = body.get("key")
        content_type = body.get("contentType", "application/octet-stream")

        if not key:
            # fallback key if client didn't send one
            key = f"uploads/{uuid.uuid4()}.bin"

        resp = s3.create_multipart_upload(
            Bucket=SOURCE_BUCKET,
            Key=key,
            ContentType=content_type,
            ServerSideEncryption="AES256"  # matches SSE-S3 default
        )

        return _ok({
            "bucket": SOURCE_BUCKET,
            "key": key,
            "uploadId": resp["UploadId"]
        })

    except Exception as e:
        return _err(500, f"{type(e).__name__}: {str(e)}")

