import axios from 'axios';
import { API_ENDPOINTS } from '../config';

export const getSbertData = async () => {
  try {
    const response = await axios.get(API_ENDPOINTS.PAPERS);
    return response.data;
  } catch (error) {
    console.error('Error fetching SBERT data:', error);
    throw error;
  }
};
