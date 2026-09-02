const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL && process.env.NEXT_PUBLIC_BACKEND_URL.trim() !== ""
    ? process.env.NEXT_PUBLIC_BACKEND_URL
    : "http://localhost:5000";

export async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string }> {
  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("staffpie_token");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const targetUrl = `${BACKEND_URL}${cleanEndpoint}`;

  try {
    const res = await fetch(targetUrl, { ...options, headers });
    
    // Safely check if response is JSON or HTML error page
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await res.text();
      return {
        success: false,
        message: `Server returned non-JSON response (${res.status})`,
      };
    }

    const json = await res.json();
    return json;
  } catch (err: any) {
    console.error(`[API Error] Failed fetching ${targetUrl}:`, err);
    return { success: false, message: err.message || "Failed to fetch data" };
  }
}