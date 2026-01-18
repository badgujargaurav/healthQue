import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://localhost:4000/api/v1';

async function getTokens() {
  const accessToken = await AsyncStorage.getItem('accessToken');
  const refreshToken = await AsyncStorage.getItem('refreshToken');
  return { accessToken, refreshToken };
}

async function setTokens({ accessToken, refreshToken }) {
  if (accessToken) await AsyncStorage.setItem('accessToken', accessToken);
  if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
}

async function clearTokens() {
  await AsyncStorage.removeItem('accessToken');
  await AsyncStorage.removeItem('refreshToken');
}

async function refreshTokenRequest(refreshToken) {
  const res = await fetch(`${API_BASE}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  if (!res.ok) throw new Error('Refresh failed');
  const data = await res.json();
  // backend may return rotated refresh token
  if (data.refreshToken) {
    await setTokens({ accessToken: data.token, refreshToken: data.refreshToken });
  }
  return data.token;
}

async function fetchWithAuth(url, options = {}) {
  const { accessToken, refreshToken } = await getTokens();
  const headers = Object.assign({}, options.headers || {});
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  // dev helper: log outgoing requests for debugging sorting/query issues
  try {
    const isDev = (typeof __DEV__ !== 'undefined' ? __DEV__ : (process.env.NODE_ENV !== 'production'));
    if (isDev && typeof console !== 'undefined') {
      const info = { url, method: (options && options.method) || 'GET' };
      try { info.query = url.split('?')[1] || ''; } catch (e) { info.query = ''; }
    }
  } catch (e) { /* ignore logging errors */ }

  let res = await fetch(url, Object.assign({}, options, { headers }));
  if (res.status === 401 && refreshToken) {
    try {
      const newAccess = await refreshTokenRequest(refreshToken);
      await setTokens({ accessToken: newAccess });
      headers.Authorization = `Bearer ${newAccess}`;
      res = await fetch(url, Object.assign({}, options, { headers }));
    } catch (e) {
      await clearTokens();
      // call registered handler if available
      if (typeof sessionExpiredHandler === 'function') {
        try { sessionExpiredHandler(); } catch (err) { /* swallow */ }
      }
      throw new Error('Session expired');
    }
  }
  // read body as text once to avoid multiple body reads and handle non-JSON responses
  const contentType = res.headers.get('content-type') || '';
  const bodyText = await res.text();
  const wrapper = {
    ok: res.ok,
    status: res.status,
    headers: res.headers,
    async json() {
      if (!contentType.includes('application/json')) {
        // try to parse anyway for lenient servers
        try { return JSON.parse(bodyText); } catch (err) { throw new Error('Response is not JSON'); }
      }
      try { return JSON.parse(bodyText); } catch (err) { throw new Error('Invalid JSON in response'); }
    },
    async text() { return bodyText; }
  };
  return wrapper;
}

let sessionExpiredHandler = null;
function setSessionExpiredHandler(fn) { sessionExpiredHandler = fn; }

async function parseResponse(res) {
  const result = { ok: res.ok, status: res.status, data: null, text: null };
  try {
    result.data = await res.json();
  } catch (e) {
    try { result.text = await res.text(); } catch (err) { result.text = null; }
  }
  return result;
}

export { API_BASE, getTokens, setTokens, clearTokens, fetchWithAuth, setSessionExpiredHandler, parseResponse };

// Helper to perform soft-delete via PATCH with `{ is_deleted: 1 }` payload.
async function softDelete(url, options = {}) {
  const opts = Object.assign({}, options);
  opts.method = 'PATCH';
  opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  // merge provided body with is_deleted flag
  if (!opts.body) {
    opts.body = JSON.stringify({ is_deleted: 1 });
  } else {
    let parsed;
    try {
      parsed = typeof opts.body === 'string' ? JSON.parse(opts.body) : opts.body;
    } catch (e) {
      parsed = opts.body;
    }
    parsed = Object.assign({}, parsed, { is_deleted: 1 });
    opts.body = JSON.stringify(parsed);
  }
  return fetchWithAuth(url, opts);
}

// alias
const deleteAsPatch = softDelete;

export { softDelete, deleteAsPatch };
