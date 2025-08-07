// API configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  PAPERS: `${API_BASE_URL}/api/papers/`,
  // Add other API endpoints here
};
