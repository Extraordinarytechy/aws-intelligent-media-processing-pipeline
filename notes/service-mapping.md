# Service Mapping – prime-vod

## Phase 1 – Infrastructure Overview

| AWS Service                | Purpose |
|----------------------------|---------|
| Amazon S3 (Source)         | Store uploaded source videos |
| Amazon S3 (Destination)    | Store processed/transcoded outputs |
| AWS Step Functions         | Orchestrate ingest, process, and publish workflows |
| AWS Lambda                 | Event-driven automation and workflow handling |
| AWS Elemental MediaConvert | Transcoding and processing of media files |
| AWS Elemental MediaPackage | (Optional) Prepare content for streaming |
| Amazon CloudFront          | Global video delivery via CDN |
| Amazon DynamoDB            | Store metadata and workflow status |
| Amazon SNS                 | Send workflow notifications |
| Amazon SQS                 | Queue workflow results for further processing |
| Amazon CloudWatch          | Monitor workflow execution and logs |

---

## Phase 2 & 3 – Processing & Secure Delivery Enhancements

| AWS Service                          | Purpose                                                                                               |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| **Amazon S3 (Source & Destination)** | Continue storing uploaded videos and processed outputs; may include versioning and lifecycle policies |
| **AWS Step Functions**               | Orchestrate more complex workflows, integrating additional quality checks and analytics               |
| **AWS Lambda**                       | Handle event triggers, metadata extraction, and automated operations                                  |
| **AWS Elemental MediaConvert**       | Advanced transcoding with multi-bitrate outputs for adaptive streaming                                |
| **AWS Elemental MediaPackage**       | Prepare content for streaming with packaging into HLS/DASH formats                                    |
| **Amazon CloudFront**                | Global video distribution with cache invalidation for updated content                                 |
| **Amazon DynamoDB**                  | Store extended metadata, video analytics data, and processing history                                 |
| **Amazon SNS**                       | Publish processing results or failure notifications to subscribers                                    |
| **Amazon SQS**                       | Manage queued processing tasks between services                                                       |
| **Amazon CloudWatch**                | Monitor workflows, collect metrics, and set up alarms for operational anomalies                       |
| **AWS CloudTrail**                   | Track and audit all API calls for security and compliance                                             |
| **AWS X-Ray**                        | Trace requests through the workflow for performance debugging                                         |
| **AWS IAM**                          | Enforce fine-grained access controls for each service and resource                                    |
| **AWS KMS**                          | Encrypt stored and in-transit media files and metadata                                                |
| **AWS CodePipeline / CodeBuild**     | Automate deployment of Lambda functions, Step Functions definitions, and infrastructure updates       |
| **Amazon OpenSearch Service**        | Index and search video metadata, logs, and analytics for operational insights                         |
| **AWS Glue / AWS Athena**            | (Optional) Run analytical queries on stored video processing logs and metadata                        |

---

## Phase 4 – Frontend Ingest & Multipart Upload

| Component / Service             | Purpose |
|--------------------------------|---------|
| React Frontend (`PrimeVODUploader.jsx`) | Handles file selection, multipart uploads, progress tracking, retries, abort/reset |
| API Gateway (Ingest API)       | Exposes `/init`, `/signPart`, `/complete`, `/abort` endpoints for frontend file uploads |
| Lambda Functions (Ingest)      | Implements multipart upload logic for S3 and triggers Step Functions workflow |
| CloudFront OAC + Key Group     | Ensures secure, signed URL access to destination S3 objects from frontend |
| Step Functions                 | Automatically triggers processing workflow upon successful frontend upload |
| MediaConvert                   | Processes uploaded videos from frontend into adaptive bitrate formats (HLS) |
| Destination S3 Bucket          | Stores final processed video content accessible via CloudFront signed URLs |


## Phase 5 – Observability & Synthetic HLS Health

| AWS Service / Component          | Purpose |
|---------------------------------|---------|
| Amazon EventBridge               | Detect MediaConvert job failures and trigger alerts |
| Amazon SNS                       | Receive notifications for failed MediaConvert jobs or workflow anomalies |
| Amazon CloudWatch Alarms         | Monitor Step Functions execution, CloudFront metrics (4xx/5xx errors, cache hit rate, origin latency) |
| Amazon CloudWatch Dashboard      | Centralized visual overview of system health and workflow metrics |
| AWS Synthetics (HLS Canary)     | Validate HLS master playlist and variant streams to ensure playback readiness |
| AWS Lambda                       | Optional helper functions for alarm actions or event processing |
| IAM Roles & Policies             | Allow EventBridge, CloudWatch, and SNS to interact securely |


## Phase 6 – MediaConvert: Automated ABR & Quality Tuning

| AWS Service / Component    | Purpose                                                                           |
| -------------------------- | --------------------------------------------------------------------------------- |
| AWS Elemental MediaConvert | Enable Automated ABR to dynamically select renditions (between min/max bitrate)   |
| MediaConvert QVBR          | Apply Quality-Defined Variable Bitrate to optimize quality per frame              |
| S3 (Destination)           | Store multiple ABR renditions for adaptive streaming                              |
| CloudFront                 | Distribute adaptive HLS playlists generated by ABR                                |
| README Documentation       | Record trade-offs: cost (2-pass encoding), quality vs. storage, ladder complexity |

## Phase 7 – Cost Controls & Lifecycle Hygiene

| AWS Service / Component      | Purpose                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------- |
| Amazon S3 Lifecycle Policies | Transition raw input to Infrequent Access (IA) after 7 days, expire after 30 days |
| CloudFront Logs Retention    | Store logs but apply retention limits or S3 IA transition                         |
| AWS Budgets + Alerts         | Enforce monthly budget guardrail (e.g., \$20)                                     |
| Test Clips (≤30s)            | Keep pipeline costs low during development                                        |
| Documentation                | Add explicit notes in README on cost trade-offs                                   |
