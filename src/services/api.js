const API_BASE_URL = '/api';

export const fetchPapers = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/papers`);
    if (!response.ok) {
      throw new Error('Failed to fetch papers');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching papers:', error);
    throw error;
  }
};

export const fetchPaperById = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/papers/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch paper');
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching paper ${id}:`, error);
    throw error;
  }
};
