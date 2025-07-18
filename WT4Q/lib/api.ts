
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:7122';

export const API_ROUTES = {
  ADMIN_AUTH: {
    LOGIN: `${API_BASE_URL}/api/Admin/Adminlogin`,
  },

  AUTH: {
    LOGIN: `${API_BASE_URL}/api/UserAuth/login`,
    REGISTER: `${API_BASE_URL}/api/UserRegistration`,
  },

  USERS: {
    GET_ALL: `${API_BASE_URL}/User`,
    GET_BY_EMAIL: (email: string) => `${API_BASE_URL}/User/${email}`,
  },

  ARTICLE: {
    CREATE: `${API_BASE_URL}/api/Article`,
    GET_ALL: `${API_BASE_URL}/api/Article`,
    SEARCH: (query: string) =>
      `${API_BASE_URL}/api/ArticleSearch?query=${encodeURIComponent(query)}`,
    SEARCH_ADVANCED: `${API_BASE_URL}/api/ArticleSearch/advanced`,
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
