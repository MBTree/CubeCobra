export const getCsrfToken = () => {
  if (typeof document === 'undefined') {
    return null;
  }
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute('content') : null;
};

export const csrfFetch = (resource, init = { method: 'GET' }) => {
  init.credentials = init.credentials || 'same-origin';
  init.headers = {
    ...init.headers,
    'CSRF-Token': getCsrfToken(),
  };
  return fetch(resource, init);
};

export const postJson = (resource, body) => {
  return csrfFetch(resource, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const callApi = async (route, body) => {
  return csrfFetch(route, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
