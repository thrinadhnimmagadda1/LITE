const API_BASE_URL = '/api';

export const fetchPapers = async () => {
  try {
    console.log('Fetching papers from:', `${API_BASE_URL}/papers`);
    const response = await fetch(`${API_BASE_URL}/papers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries([...response.headers.entries()]));
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Error response:', errorData);
      throw new Error(`Failed to fetch papers: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Fetched papers:', data.length);
    return data;
  } catch (error) {
    console.error('Error in fetchPapers:', {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

export const fetchPaperById = async (id) => {
  try {
    console.log(`Fetching paper ${id} from:`, `${API_BASE_URL}/papers/${id}`);
    const response = await fetch(`${API_BASE_URL}/papers/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Error response:', errorData);
      throw new Error(`Failed to fetch paper: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Fetched paper:', data.id);
    return data;
  } catch (error) {
    console.error(`Error in fetchPaperById(${id}):`, {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};
