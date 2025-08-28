
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://server.wt4q.com';

export const API_ROUTES = {
  ADMIN_AUTH: {
    LOGIN: `${API_BASE_URL}/api/Admin/Adminlogin`,
    LOGOUT: `${API_BASE_URL}/api/Admin/Adminlogout`,
    ME: `${API_BASE_URL}/api/Admin/me`,
  },

  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    REGISTER: `${API_BASE_URL}/api/UserRegistration`,
    LOGOUT: `${API_BASE_URL}/api/auth/logout`,
    REFRESH: `${API_BASE_URL}/api/auth/refresh`,
    SESSION: `${API_BASE_URL}/api/auth/session`,
  },

  USERS: {
    GET_ALL: `${API_BASE_URL}/api/User`,
    GET_BY_EMAIL: (email: string) => `${API_BASE_URL}/api/User/${email}`,
    ME: `${API_BASE_URL}/api/User/me`,
    UPDATE: `${API_BASE_URL}/api/User`,
    DELETE: `${API_BASE_URL}/api/User`,
    ACTIVITY: `${API_BASE_URL}/api/User/activity`,
    CHANGE_PASSWORD: `${API_BASE_URL}/api/User/password`,
  },

  ARTICLE: {
    CREATE: `${API_BASE_URL}/api/Article`,
    GET_ALL: `${API_BASE_URL}/api/Article`,
    GET_BY_SLUG: (slug: string) => `${API_BASE_URL}/api/Article/${slug}`,
    GET_BY_ID: (id: string) => `${API_BASE_URL}/api/Article/id/${id}`,
    GET_RECOMMENDATIONS: (slug: string, count = 5) =>
      `${API_BASE_URL}/api/Article/${slug}/recommendations?count=${count}`,
    SEARCH: (query: string) =>
      `${API_BASE_URL}/api/ArticleSearch?query=${encodeURIComponent(query)}`,
    SEARCH_ADVANCED: `${API_BASE_URL}/api/ArticleSearch/advanced`,
    FILTER: `${API_BASE_URL}/api/ArticleFilter`,
    UPDATE: (id: string) => `${API_BASE_URL}/api/Article/${id}`,
    DELETE: `${API_BASE_URL}/api/Article`,
    LIKE: (id: string) => `${API_BASE_URL}/api/Article/${id}/like`,
    COMMENT: `${API_BASE_URL}/api/Article/Comment`,
    MODIFY_COMMENT: `${API_BASE_URL}/api/Article/ModifyComment`,
    REPORT_COMMENT: `${API_BASE_URL}/api/Article/ReportComment`,
    SEARCH_BY_AUTHOR: (id: string) => `${API_BASE_URL}/api/ArticleSearch/by-author/${id}`,
    BREAKING: `${API_BASE_URL}/api/Article/breaking`,
    TRENDING: (limit = 5) => `${API_BASE_URL}/api/Article/trending?limit=${limit}`,
  },

  COCKTAIL: {
    CREATE: `${API_BASE_URL}/api/Cocktail`,
    GET_ALL: `${API_BASE_URL}/api/Cocktail`,
    GET_BY_ID: (id: string) => `${API_BASE_URL}/api/Cocktail/${id}`,
    UPDATE: (id: string) => `${API_BASE_URL}/api/Cocktail/${id}`,
    DELETE: (id: string) => `${API_BASE_URL}/api/Cocktail/${id}`,
    SEARCH: (query: string) =>
      `${API_BASE_URL}/api/Cocktail/search?query=${encodeURIComponent(query)}`,
  },

  GOOGLE_SIGN_IN: {
    AUTH: `${API_BASE_URL}/api/GoogleSignIn/google-auth`,
  },

  OTP: {
    FORGOT_PASSWORD: {
      GET: `${API_BASE_URL}/api/OTP/ForgotPassword`,
      POST: `${API_BASE_URL}/api/OTP/ForgotPassword`,
    },
    VERIFY_EMAIL: {
      GET: `${API_BASE_URL}/api/OTP/VerifyEmail`,
      POST: `${API_BASE_URL}/api/OTP/VerifyEmail`,
    },
  },

  USER_LOCATION: {
    GET: `${API_BASE_URL}/api/UserLocation/get-location`,
  },

  WEATHER: {
    CURRENT: `${API_BASE_URL}/api/Weather/current`,
    FORECAST: `${API_BASE_URL}/api/Weather/forecast`,
  },

  NOTIFICATIONS: {
    GET: `${API_BASE_URL}/api/Notification`,
    MARK_READ: `${API_BASE_URL}/api/Notification/mark-as-read`,
  },
  CONTACT: {
    POST: `${API_BASE_URL}/api/Contact`,
  },
};
// Wrapper around fetch that always includes credentials and retries once on 401
export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const request = () => fetch(input, { credentials: 'include', ...init });
  let res = await request();
  if (res.status === 401) {
    const refresh = await fetch(API_ROUTES.AUTH.REFRESH, {
      method: 'POST',
      credentials: 'include',
    });
    if (refresh.ok) {
      res = await request();
    }
  }
  return res;
}

// Convenience wrapper that returns parsed JSON with strong typing
export async function apiJson<T>(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<T> {
  const res = await apiFetch(input, init);
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return (await res.json()) as T;
}
