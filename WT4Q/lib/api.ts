
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7122';

export const API_ROUTES = {
  ADMIN_AUTH: {
    LOGIN: `${API_BASE_URL}/api/Admin/Adminlogin`,
    REGISTER: `${API_BASE_URL}/api/Admin/Adminregister`,
    LOGOUT: `${API_BASE_URL}/api/Admin/Adminlogout`,
    ME: `${API_BASE_URL}/api/Admin/me`,
  },

  AUTH: {
    LOGIN: `${API_BASE_URL}/api/UserAuth/login`,
    REGISTER: `${API_BASE_URL}/api/UserRegistration`,
    LOGOUT: `${API_BASE_URL}/api/UserAuth/logout`,
  },

  USERS: {
    GET_ALL: `${API_BASE_URL}/User`,
    GET_BY_EMAIL: (email: string) => `${API_BASE_URL}/User/${email}`,
    ME: `${API_BASE_URL}/User/me`,
    UPDATE: `${API_BASE_URL}/User`,
    DELETE: `${API_BASE_URL}/User`,
    ACTIVITY: `${API_BASE_URL}/User/activity`,
    CHANGE_PASSWORD: `${API_BASE_URL}/User/password`,
  },

  ARTICLE: {
    CREATE: `${API_BASE_URL}/api/Article`,
    GET_ALL: `${API_BASE_URL}/api/Article`,
    GET_BY_ID: (id: string) => `${API_BASE_URL}/api/Article/${id}`,
    GET_RECOMMENDATIONS: (id: string, count = 5) =>
      `${API_BASE_URL}/api/Article/${id}/recommendations?count=${count}`,
    SEARCH: (query: string) =>
      `${API_BASE_URL}/api/ArticleSearch?query=${encodeURIComponent(query)}`,
    SEARCH_ADVANCED: `${API_BASE_URL}/api/ArticleSearch/advanced`,
    FILTER: `${API_BASE_URL}/api/ArticleFilter`,
    UPDATE: `${API_BASE_URL}/api/Article`,
    DELETE: `${API_BASE_URL}/api/Article`,
    LIKE: (id: string) => `${API_BASE_URL}/api/Article/${id}/Like`,
    COMMENT: `${API_BASE_URL}/api/Article/Comment`,
    MODIFY_COMMENT: `${API_BASE_URL}/api/Article/ModifyComment`,
    REPORT_COMMENT: `${API_BASE_URL}/api/Article/ReportComment`,
    SEARCH_BY_AUTHOR: (id: string) => `${API_BASE_URL}/api/ArticleSearch/by-author/${id}`,
    BREAKING: `${API_BASE_URL}/api/Article/breaking`,
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
