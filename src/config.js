// API configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Remove the /api prefix from the endpoint since it's already included in Django's URL routing
export const API_ENDPOINTS = {
  PAPERS: `${API_BASE_URL}/papers/`,
  // Add other API endpoints here
};
