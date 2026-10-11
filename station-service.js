// Transport for the station's own service.
//
// Two lanes, one contract. The curator lane is the authenticated app service and
// is only reachable with an owner/app token. The visitor lane is the service's
// public face, which is what a published station answers with, so guests and
// signed-in participants never depend on a curator credential.
const SERVICE_ID = 'hackathon-gallery';
export const PUBLIC_BASE = '/api/app-services/' + SERVICE_ID + '/';
const MAX_FILE = 3_000_000;

async function readJson(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.detail || 'The station could not complete that request.');
  }
  return payload;
}

export async function requestGallery(appId, token, path, body) {
  const response = await fetch('/api/apps/' + appId + '/service/' + path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return readJson(response);
}

export async function publicRequest(path, body) {
  const response = await fetch(PUBLIC_BASE + path, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return readJson(response);
}

export async function readDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read this image.'));
    reader.readAsDataURL(blob);
  });
}

export async function prepareImage(blob) {
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(blob.type)) {
    throw new Error('Choose a PNG, JPEG, WebP or GIF.');
  }
  if (blob.size > MAX_FILE) throw new Error('Choose an image under 3 MB.');
  if (blob.type === 'image/gif') return readDataUrl(blob);
  const image = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, 1440 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    const optimized = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', .82));
    if (!optimized) throw new Error('Could not optimize this image.');
    return readDataUrl(optimized);
  } finally { image.close(); }
}

/**
 * Visitor reads with one curator-lane probe.
 *
 * The first read tries the authenticated lane so the owner's shell keeps its
 * existing path (and so curation can be offered). A published visitor gets a
 * public-app token there, which the service refuses; every later read then uses
 * the public lane instead of retrying a credential that will never work.
 */
export function createVisitorApi(appId, token) {
  let lane = token ? 'curator' : 'public';

  let probed = false;

  async function read(path, publicPath = path) {
    if (lane === 'curator') {
      try {
        const value = await requestGallery(appId, token, path);
        probed = true;
        return value;
      } catch (error) {
        // Only a first read may discover that this frame is a published visitor.
        // Once the curator lane has answered, a later failure is a real failure.
        if (probed) throw error;
        probed = true;
        lane = 'public';
      }
    }
    return publicRequest(publicPath);
  }

  async function media(id) {
    const url = lane === 'curator' ? '/api/apps/' + appId + '/service/media/' + encodeURIComponent(id)
      : PUBLIC_BASE + 'media/' + encodeURIComponent(id);
    const response = await fetch(url, lane === 'curator' ? { headers: { Authorization: 'Bearer ' + token } } : {});
    if (!response.ok) {
      if (lane !== 'curator' || probed) throw new Error('Could not load artwork.');
      probed = true;
      lane = 'public';
      const retry = await fetch(PUBLIC_BASE + 'media/' + encodeURIComponent(id));
      if (!retry.ok) throw new Error('Could not load artwork.');
      return readDataUrl(await retry.blob());
    }
    return readDataUrl(await response.blob());
  }

  return {
    get lane() { return lane; },
    /** True when this frame holds a curator credential, so owner tools apply. */
    get canCurate() { return lane === 'curator'; },
    state: () => read('state', 'gallery'),
    scores: () => read('scores'),
    media,
  };
}
