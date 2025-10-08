// // src/csrfClient.js
let csrfToken = null;

export async function ensureCsrf() {
  if (csrfToken) return csrfToken;
  const r = await fetch('/api/csrf', { credentials: 'include' });
  const j = await r.json();
  csrfToken = j.csrfToken;
  return csrfToken;
}

// export async function apiFetch(url, options = {}) {
//   const method = (options.method || 'GET').toUpperCase();
//   const needs = !['GET', 'HEAD', 'OPTIONS'].includes(method);
//   const headers = new Headers(options.headers || {});
//   const opts = { credentials: 'include', ...options, headers };

//   if (needs) {
//     headers.set('X-CSRF-Token', await ensureCsrf());
//     // If body is FormData, let the browser set the multipart boundary
//     const isFormData = options?.body instanceof FormData;
//     if (!isFormData && !headers.has('Content-Type')) {
//       headers.set('Content-Type', 'application/json');
//     }
//   }

//   return fetch(url, opts);
// }
// src/csrfClient.js
// small, stable wrapper
const API = import.meta.env.VITE_API_URL;

async function getCsrf() {
  const r = await fetch(`${API}/csrf`, { credentials: 'include' });
  const j = await r.json();
  csrfToken = j.csrfToken;
  return csrfToken;
}

export async function apiFetch(path, opts = {}) {
  if (!csrfToken) await getCsrf();

  const {
    headers = {},
    credentials = 'include', // <-- send cookies
    ...rest
  } = opts;

  const r = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
    credentials,
    headers: {
      'X-CSRF-Token': csrfToken,
      ...headers,
    },
    ...rest,
  });

  let data = {};
  try {
    data = await r.json();
  } catch {}
  return { ok: r.ok, status: r.status, data };
}
