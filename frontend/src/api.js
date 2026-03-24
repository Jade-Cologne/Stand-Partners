const BASE = "/api";

async function get(path, params = {}) {
  const url = new URL(BASE + path, window.location.origin);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const api = {
  orchestras: {
    list: (params) => get("/orchestras", params).then(r => r.items ?? r),
    mapPins: () => get("/orchestras/map"),
    get: (id) => get(`/orchestras/${id}`),
    auditions: (id, params) => get(`/orchestras/${id}/auditions`, params),
  },
  auditions: {
    list: (params) => get("/auditions", params),
    get: (id) => get(`/auditions/${id}`),
  },
  excerpts: {
    list: (params) => get("/excerpts", params),
    get: (id) => get(`/excerpts/${id}`),
  },
  requests: {
    submit: (body) => post("/requests", body),
  },
};
