import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

export const getSbertData = async () => {
  try {
    const response = await axios.get(`${API_URL}/sbert-data`);
    return response.data;
  } catch (error) {
    console.error('Error fetching SBERT data:', error);
    throw error;
  }
};
