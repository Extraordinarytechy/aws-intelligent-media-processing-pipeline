// PrimeVOD Uploader React Component
// Default export: PrimeVODUploader
// Tailwind CSS classes used (no imports required here)

import React, { useState, useRef } from 'react';

// Config
const PART_SIZE = 5 * 1024 * 1024; // 5 MB
const CONCURRENCY = 4; // Number of simultaneous part uploads
const MAX_RETRIES = 3;

export default function PrimeVODUploader() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const uploadPartsRef = useRef([]);
  const controllerRef = useRef(null);

  const log = (msg) => {
    setLogs((s) => [
      `${new Date().toLocaleTimeString()}: ${msg}`,
      ...s.slice(0, 199),
    ]);
  };

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setProgress(0);
    uploadPartsRef.current = [];
    controllerRef.current = null;
    setLogs([]);
  };

  const onSelectFile = (e) => {
    const f = e.target.files[0];
    setFile(f || null);
  };

  const postJson = async (path, body) => {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return res.json();
  };

  const createMultipartUpload = async (key) => {
    log('Calling /init to start multipart upload');
    return await postJson(`/ingest/init`, { key });
  };

  const getPresignedUrl = async (key, uploadId, partNumber) => {
    return await postJson(`/ingest/signPart`, { key, uploadId, partNumber });
  };

  const completeMultipartUpload = async (key, uploadId, parts) => {
    return await postJson(`/ingest/complete`, { key, uploadId, parts });
  };

  const abortMultipartUpload = async (key, uploadId) => {
    return await postJson(`/ingest/abort`, { key, uploadId });
  };

  const uploadChunk = async (url, chunk, attempt = 1) => {
    try {
      const res = await fetch(url, { method: 'PUT', body: chunk });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`PUT failed status ${res.status}: ${t}`);
      }
      const etag = res.headers.get('ETag') || res.headers.get('etag');
      return etag;
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        log(`Retry ${attempt} for chunk due to: ${err.message}`);
        await new Promise((r) => setTimeout(r, 1000 * attempt));
        return uploadChunk(url, chunk, attempt + 1);
      }
      throw err;
    }
  };

  const uploadFile = async () => {
    if (!file) return;
    setStatus('starting');
    log(`Preparing to upload: ${file.name} (${Math.round(file.size / 1024 / 1024)} MB)`);

    const key = `uploads/${Date.now()}_${file.name}`;

    let initResp;
    try {
      initResp = await createMultipartUpload(key);
    } catch (err) {
      log(`Init failed: ${err.message}`);
      setStatus('error');
      return;
    }

    const uploadId = initResp.UploadId || initResp.uploadId;
    if (!uploadId) {
      log('Init response missing UploadId');
      setStatus('error');
      return;
    }
    log(`UploadId: ${uploadId}`);
    setStatus('uploading');

    const totalParts = Math.ceil(file.size / PART_SIZE);
    let uploadedParts = [];
    const partIndexes = Array.from({ length: totalParts }, (_, i) => i + 1);

    let cursor = 0;
    let aborted = false;

    const abortAll = () => { aborted = true; };
    controllerRef.current = { abortAll };

    const runNext = async () => {
      if (aborted || cursor >= partIndexes.length) return;
      const partNumber = partIndexes[cursor++];
      const start = (partNumber - 1) * PART_SIZE;
      const end = Math.min(start + PART_SIZE, file.size);
      const chunk = file.slice(start, end);

      try {
        log(`Requesting URL for part ${partNumber}`);
        const presignResp = await getPresignedUrl(key, uploadId, partNumber);
        const url = presignResp.url || presignResp.presignedUrl;
        if (!url) throw new Error('Missing presigned URL');
        const etag = await uploadChunk(url, chunk);
        if (!etag) throw new Error('Missing ETag');

        uploadedParts.push({ PartNumber: partNumber, ETag: etag.replace(/"/g, '') });
        const pct = Math.min(100, Math.round((uploadedParts.length / totalParts) * 100));
        setProgress(pct);
        log(`Uploaded part ${partNumber}`);
      } catch (err) {
        log(`Part ${partNumber} failed: ${err.message}`);
        aborted = true;
      } finally {
        if (!aborted && cursor < partIndexes.length) await runNext();
      }
    };

    const workers = [];
    for (let i = 0; i < CONCURRENCY; i++) workers.push(runNext());
    await Promise.allSettled(workers);

    if (aborted) {
      setStatus('aborting');
      log('Aborting upload...');
      try {
        await abortMultipartUpload(key, uploadId);
        log('Abort complete');
      } catch (err) {
        log(`Abort failed: ${err.message}`);
      }
      setStatus('error');
      return;
    }

    uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber);

    setStatus('completing');
    log('Completing upload...');
    try {
      const completeResp = await completeMultipartUpload(key, uploadId, uploadedParts);
      log('Upload complete!');
      setStatus('done');
      setProgress(100);
      log(JSON.stringify(completeResp).slice(0, 800));
      uploadPartsRef.current = uploadedParts;
    } catch (err) {
      log(`Complete failed: ${err.message}`);
      setStatus('error');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-2">PrimeVOD — Multipart Uploader</h2>
      <p className="text-sm text-gray-500 mb-4">
        Uploads files using multipart presigned URLs from your ingest API.
      </p>

      <div className="bg-white shadow rounded p-4 mb-4">
        <input type="file" onChange={onSelectFile} className="mb-3" />
        <div className="flex gap-2">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            disabled={!file || status === 'uploading' || status === 'completing'}
            onClick={uploadFile}
          >
            Upload
          </button>
          <button className="px-4 py-2 bg-gray-300 rounded" onClick={reset}>
            Reset
          </button>
          <button
            className="px-4 py-2 bg-red-500 text-white rounded"
            onClick={() => {
              controllerRef.current?.abortAll();
              log('Abort requested by user.');
            }}
          >
            Abort
          </button>
        </div>

        <div className="mt-4">
          <div className="h-3 bg-gray-200 rounded overflow-hidden">
            <div className="h-full bg-green-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-sm mt-1">
            Progress: {progress}% — Status: {status}
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded p-4">
        <h3 className="font-medium mb-2">Logs</h3>
        <div className="h-64 overflow-auto bg-gray-50 p-2 text-xs font-mono">
          {logs.length === 0 ? (
            <div className="text-gray-400">No logs yet</div>
          ) : (
            logs.map((l, i) => <div key={i}>{l}</div>)
          )}
        </div>
      </div>
    </div>
  );
}
