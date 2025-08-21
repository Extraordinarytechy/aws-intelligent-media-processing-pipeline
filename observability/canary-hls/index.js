const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

const DOMAIN = process.env.CLOUDFRONT_DOMAIN;
const MASTER_PATH = process.env.MASTER_M3U8_PATH;

const handler = async function () {
  const masterUrl = `https://${DOMAIN}${MASTER_PATH}`"or yoursigned_url_here" ;
  log.info(`Fetching master playlist: ${masterUrl}`);
  const res = await synthetics.executeHttpStep('GET master.m3u8', masterUrl, { method: 'GET' });
  if (res.statusCode !== 200) throw new Error(`Master playlist HTTP ${res.statusCode}`);
  if (!res.body || !res.body.includes('#EXTM3U')) throw new Error('Master playlist missing #EXTM3U');

  const variantLine = (res.body.split('\n').map(l => l.trim())).find(l => l && !l.startsWith('#'));
  if (!variantLine) {
    log.warn('No variant URI found in master playlist.');
    return;
  }

  const variantUrl = variantLine.startsWith('http') ? variantLine : new URL(variantLine, masterUrl).toString();
  log.info(`Fetching variant playlist: ${variantUrl}`);

  const vres = await synthetics.executeHttpStep('GET variant.m3u8', variantUrl, { method: 'GET' });
  if (vres.statusCode !== 200) throw new Error(`Variant playlist HTTP ${vres.statusCode}`);
  if (!vres.body || !vres.body.includes('#EXTINF')) throw new Error('Variant playlist missing #EXTINF');

  const segLine = (vres.body.split('\n').map(l => l.trim())).find(l => l && !l.startsWith('#'));
  if (!segLine) {
    log.warn('No segment found in variant playlist.');
    return;
  }

  const segUrl = segLine.startsWith('http') ? segLine : new URL(segLine, variantUrl).toString();
  log.info(`Fetching first segment: ${segUrl}`);

  const sres = await synthetics.executeHttpStep('GET segment.ts', segUrl, { method: 'GET' });
  if (sres.statusCode !== 200) throw new Error(`Segment HTTP ${sres.statusCode}`);
};

exports.handler = async () => {
  return await handler();
};
