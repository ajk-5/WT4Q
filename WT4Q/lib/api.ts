
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:7122';

export const API_ROUTES = {
  ADMIN_AUTH: {
    LOGIN: `${API_BASE_URL}/api/Admin/Adminlogin`,
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
    LIKE: `${API_BASE_URL}/api/Article/Like`,
    COMMENT: `${API_BASE_URL}/api/Article/Comment`,
    MODIFY_COMMENT: `${API_BASE_URL}/api/Article/ModifyComment`,
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
};
