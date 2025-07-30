import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const getSbertData = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/papers/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching SBERT data:', error);
    throw error;
  }
};
