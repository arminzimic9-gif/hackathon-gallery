// The station consumes synchronous Web Storage; Möbius owns device persistence.
export async function preloadStationStorage(invoke, onError) {
  const keys = ['hs.pilot', 'hs.xp', 'hs.best', 'hs.verified', 'hs.audio'];
  const values = await Promise.all(keys.map(key => invoke('device.storage', { operation: 'get', key })));
  const cache = new Map(keys.map((key, i) => [key, values[i] == null ? null :
    typeof values[i] === 'string' ? values[i] : JSON.stringify(values[i])]));
  const writes = new Map();
  return {
    getItem(key) { return cache.get(key) ?? null; },
    setItem(key, value) {
      cache.set(key, String(value));
      // Serialize each key so a slower XP write cannot replace a newer value.
      const write = (writes.get(key) || Promise.resolve()).then(() =>
        invoke('device.storage', { operation: 'set', key, value: String(value) }))
        .catch(error => onError(error));
      writes.set(key, write);
    },
    async flush() { await Promise.all(writes.values()); },
  };
}

export async function stationCollection(state, mediaFor) {
  const art = await Promise.all(state.art.map(async item => ({
    id: item.id, title: item.title, author: item.author, caption: item.caption,
    url: item.placeholder ? undefined : await mediaFor(item.id),
    sample: !!item.placeholder,
  })));
  // The supplied rooms consume winners by slot, not by the `place` field.
  // Preserve holes so a lone second-place winner never appears in first place.
  const winners = [1, 2, 3].map(place => {
    const item = state.art.find(row => row.winner_rank === place && !row.placeholder);
    return item ? { ...art.find(row => row.id === item.id), place } : null;
  });
  return { art, winners };
}

// The official board is attributed server-side to the signed-in participant, so
// the run itself carries no self-declared name; the pilot only supplies colours.
export function flightScore({ score, pilot }, suits, visors) {
  return {
    game: 'flight', score,
    suit_color: suits[pilot.suit], visor_color: visors[pilot.visor],
  };
}
