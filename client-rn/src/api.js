const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://10.82.27.193:5000";

export const api = async (url, method = "GET", body = null, token = null) => {
  const headers = { 
    "Content-Type": "application/json",
    "Bypass-Tunnel-Reminder": "true"
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  
  const finalUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;
  
  try {
    const res = await fetch(finalUrl, { method, headers, body: body ? JSON.stringify(body) : null });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.msg || data.error || "Request failed");
    return data;
  } catch (err) {
    throw err;
  }
};
