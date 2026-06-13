// Thin client for the upstream / device backend (Raspberry Pi, data service…).
// Uses Node's built-in fetch. This is how the backend "fetches data from" and
// "pushes information to" the other backend. Only config.upstream.baseUrl
// changes between localhost and Vultr.
import config from '../config/index.js';

const { baseUrl, apiKey, timeoutMs } = config.upstream;

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const url = `${baseUrl}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    const data = text ? safeJson(text) : null;

    if (!res.ok) {
      const err = new Error(`Upstream ${method} ${path} failed: ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  } catch (e) {
    if (e.name === 'AbortError') {
      const err = new Error(`Upstream ${method} ${path} timed out after ${timeoutMs}ms`);
      err.status = 504;
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text; // upstream returned non-JSON; pass it through as-is
  }
}

export const upstream = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
