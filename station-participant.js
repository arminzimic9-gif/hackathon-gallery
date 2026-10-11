// Participant identity for the public station.
//
// A code issued by the organiser is exchanged for a signed, expiring token that
// lives in this visitor's device storage. Guests keep the whole experience; the
// token is what makes an artwork submission and an official flight result
// attributable, and the service re-checks it on every write.
import { publicRequest } from './station-service.js';

export function parseParticipant(raw) {
  if (!raw) return null;
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return data && typeof data.token === 'string' && typeof data.code === 'string' ? data : null;
  } catch { return null; }
}

/** Re-validate a stored sign-in; an expired or withdrawn code returns to guest. */
export async function restoreParticipant(raw) {
  const saved = parseParticipant(raw);
  if (!saved) return null;
  try {
    const confirmed = await publicRequest('verify', { token: saved.token });
    return { ...saved, name: confirmed.name, code: confirmed.code, expires_at: confirmed.expires_at };
  } catch { return null; }
}

export async function signInParticipant(code, name) {
  const result = await publicRequest('signin', { code, name });
  return { code: result.code, name: result.name, token: result.token, expires_at: result.expires_at };
}

export function submitWork(participant, work) {
  return publicRequest('submit', { token: participant.token, ...work });
}

export function submitFlightScore(participant, score) {
  return publicRequest('scores/submit', { token: participant.token, ...score });
}
