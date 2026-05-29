const TOKEN_KEYS = ['qr_token', 'token', 'codigo', 'code'];

export const extractQrToken = (rawValue) => {
  const value = String(rawValue || '').trim();

  if (!value) {
    return '';
  }

  try {
    const parsedUrl = new URL(value);
    const tokenFromQuery = TOKEN_KEYS.map((key) => parsedUrl.searchParams.get(key)).find(Boolean);

    if (tokenFromQuery) {
      return tokenFromQuery.trim();
    }
  } catch {
    
  }

  try {
    const parsedJson = JSON.parse(value);
    const tokenFromJson = TOKEN_KEYS.map((key) => parsedJson?.[key]).find(Boolean);

    if (tokenFromJson) {
      return String(tokenFromJson).trim();
    }
  } catch {
    
  }

  return value;
};
