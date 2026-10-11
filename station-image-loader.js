// The supplied package creates its own GLTFLoaders. Configure those instances
// at their parse boundary so the archive stays unchanged. Möbius permits
// embedded object URLs as images, not fetch() connections. TextureLoader is
// Three's existing image-element path; it preserves GLTF texture semantics.
const installations = new WeakMap();

export function installStationImageLoader(GLTFLoader, TextureLoader) {
  const prototype = GLTFLoader.prototype;
  let state = installations.get(prototype);
  if (!state) {
    const loaders = new Set(), original = prototype.parse;
    const configure = parser => {
      const { manager, crossOrigin, requestHeader } = parser.options;
      parser.textureLoader = new TextureLoader(manager)
        .setCrossOrigin(crossOrigin).setRequestHeader(requestHeader);
      return { name: 'MOBIUS_station_image_loading' };
    };
    function parse(...args) {
      if (!loaders.has(this)) { this.register(configure); loaders.add(this); }
      return original.apply(this, args);
    }
    state = { users: 0, loaders, configure, original, parse };
    installations.set(prototype, state);
    prototype.parse = parse;
  }
  state.users++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--state.users) return;
    if (prototype.parse === state.parse) prototype.parse = state.original;
    for (const loader of state.loaders) loader.unregister(state.configure);
    installations.delete(prototype);
  };
}
