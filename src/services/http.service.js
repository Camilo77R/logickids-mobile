export const normalizeBaseUrl = (baseUrl) => baseUrl.trim().replace(/\/+$/, '');

export const buildJsonHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

export const parseJsonResponse = async (response) => {
  const json = await response.json().catch(() => null);

  if (!response.ok || !json?.success) {
    const message = json?.message ?? `Fallo HTTP ${response.status}`;
    throw new Error(message);
  }

  return json.data;
};
