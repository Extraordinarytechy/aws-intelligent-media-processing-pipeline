# prime-vod
Kickoff: secure, observable VOD reference on AWS (Phase 1 commit).

## Architecture Summary
This repository implements a secure, observable, Video-On-Demand (VOD) pipeline on AWS using:
- **S3** for input/output storage
- **Step Functions** for orchestration
- **MediaConvert** for transcoding to HLS/DASH
- **CloudFront** with Origin Access Control for delivery
- **DynamoDB** for job metadata
- **Lambda + API Gateway** for upload API
- **CloudWatch** for monitoring and canaries

## Phase 1 — Design Checklist
- [ ] Architecture Diagram
- [x] Service Mapping
- [ ] Solution Parameters
- [ ] Cost Estimation
- [ ] MVP Flow
