const listeners = [];

export function pushDebug(evt) {
  try {
    // notify subscribers asynchronously to avoid triggering setState during render
    setTimeout(() => {
      try {
        listeners.forEach(fn => {
          try { fn(evt); } catch (err) { /* swallow subscriber errors */ }
        });
      } catch (err) {}
    }, 0);
  } catch (e) {}
}

export function subscribe(fn) {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

export default { pushDebug, subscribe };
