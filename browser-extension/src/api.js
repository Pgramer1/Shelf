function trimTrailingSlash(value) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function buildUrl(baseUrl, path) {
  return `${trimTrailingSlash(baseUrl)}${path.startsWith("/") ? path : `/${path}`}`;
}

async function request({ baseUrl, path, method = "GET", token, data, allowUnauthenticated = false }) {
  const headers = {
    "Content-Type": "application/json"
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (!allowUnauthenticated) {
    throw new Error("Missing auth token");
  }

  const response = await fetch(buildUrl(baseUrl, path), {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${method} ${path} failed (${response.status}): ${text || "No response body"}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function getShelf(baseUrl, token) {
  return request({ baseUrl, path: "/shelf", token });
}

export function searchMedia(baseUrl, token, query) {
  const q = encodeURIComponent(query);
  return request({ baseUrl, path: `/media/search?query=${q}`, token, allowUnauthenticated: true });
}

export function createMedia(baseUrl, token, payload) {
  return request({ baseUrl, path: "/media", method: "POST", token, data: payload, allowUnauthenticated: true });
}

export function addToShelf(baseUrl, token, payload) {
  return request({ baseUrl, path: "/shelf", method: "POST", token, data: payload });
}

export function updateShelfItem(baseUrl, token, itemId, payload) {
  return request({ baseUrl, path: `/shelf/${itemId}`, method: "PUT", token, data: payload });
}
