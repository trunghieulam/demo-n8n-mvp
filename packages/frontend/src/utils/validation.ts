export const validateUrl = (url: string): { valid: boolean; error?: string } => {
  if (!url) return { valid: false, error: 'URL is required' };
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'URL must use HTTP or HTTPS' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
};

export const validateJson = (json: string): { valid: boolean; error?: string } => {
  if (!json) return { valid: true }; // Optional
  try {
    JSON.parse(json);
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid JSON format' };
  }
};
