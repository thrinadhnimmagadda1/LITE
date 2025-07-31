const API_BASE_URL = 'http://localhost:8000/api'; // Updated port to match Django backend

/**
 * Processes raw paper data into a consistent format for the frontend
 * @param {Array|Object} papersData - Raw papers data from the API
 * @returns {Array} Processed array of paper objects
 */
const processPapersData = (papersData) => {
  if (!papersData) return [];
  
  // Handle case where papersData is already an array
  const papers = Array.isArray(papersData) ? papersData : 
                (papersData.papers || []);
  
  return papers.map((paper, index) => {
    try {
      // Generate a unique ID if not provided
      const id = paper.id || 
                paper.URL || 
                paper.url || 
                `paper-${Date.now()}-${index}`;
      
      // Format the date if available
      const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return 'N/A';
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        } catch (e) {
          console.warn('Failed to format date:', dateStr, e);
          return 'N/A';
        }
      };

      // Format authors if available
      const formatAuthors = (authors) => {
        if (!authors) return 'Unknown Author';
        if (Array.isArray(authors)) return authors.join(', ');
        if (typeof authors === 'string') {
          // Handle different author string formats
          if (authors.includes(';')) return authors.split(';').map(a => a.trim()).join(', ');
          if (authors.includes(' and ')) return authors.replace(/ and /g, ', ');
          return authors;
        }
        return 'Unknown Author';
      };
      
      // Extract abstract from various possible fields
      const extractAbstract = (paper) => {
        const possibleAbstractFields = [
          'abstract', 'Abstract', 'summary', 'Summary', 'description', 'Description',
          'abstractText', 'abstract_text', 'paperAbstract', 'paper_abstract'
        ];
        
        for (const field of possibleAbstractFields) {
          if (paper[field] && typeof paper[field] === 'string' && paper[field].trim()) {
            return paper[field].trim();
          }
        }
        
        if (paper._original) {
          for (const field of possibleAbstractFields) {
            if (paper._original[field] && typeof paper._original[field] === 'string' && paper._original[field].trim()) {
              return paper._original[field].trim();
            }
          }
        }
        
        return 'No abstract available';
      };

      // Extract all relevant fields with fallbacks
      const title = (paper.Title || paper.title || 'Untitled').trim();
      const authors = formatAuthors(paper.Authors || paper.authors);
      const published = formatDate(paper.published || paper.updated || paper['Published Date'] || paper.submitted_date);
      const abstract = extractAbstract(paper);
      const url = paper.URL || paper.url || paper.pdf_url || (paper.arxiv_id ? `https://arxiv.org/abs/${paper.arxiv_id}` : '#');
      const categories = paper.Categories || paper.categories || '';
      const cluster = paper.Cluster || paper.cluster || 'Uncategorized';
      
      return {
        id: id,
        title: title,
        authors: authors,
        published: published,
        abstract: abstract,
        url: url,
        categories: categories,
        cluster: cluster,
        ...(paper.x !== undefined && { x: paper.x }),
        ...(paper.y !== undefined && { y: paper.y }),
        ...(paper.cluster_label && { cluster_label: paper.cluster_label }),
        _original: paper
      };
    } catch (error) {
      console.error('Error processing paper:', { error, paper });
      return {
        id: `error-${Date.now()}-${index}`,
        title: 'Error loading paper',
        authors: 'Unknown',
        published: 'N/A',
        abstract: 'Failed to load paper data',
        url: '#',
        categories: '',
        cluster: 'Error',
        _original: paper
      };
    }
  });
};

/**
 * Fetches papers data including clustering information from the backend
 * @returns {Promise<Object>} Object containing papers and clustering data
 */
export const fetchPapers = async () => {
  try {
    console.log('Starting to fetch papers and clustering data...');
    const url = `${API_BASE_URL}/papers/`;  // Ensure trailing slash for Django
    console.log('API URL:', url);
    
    // Log environment variables for debugging
    console.log('Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      REACT_APP_API_URL: process.env.REACT_APP_API_URL,
      PUBLIC_URL: process.env.PUBLIC_URL
    });
    
    // Configure request
    const requestHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    
    console.log('Sending request to:', url);
    console.log('Request method: GET');
    console.log('Request headers:', requestHeaders);
    
    const startTime = Date.now();
    let response;
    
    try {
      // Make the API request
      response = await fetch(url, {
        method: 'GET',
        headers: requestHeaders,
        credentials: 'include',
        mode: 'cors',
      });
    } catch (networkError) {
      console.error('Network error during fetch:', networkError);
      throw new Error(`Network error: ${networkError.message}`);
    }
    
    const requestDuration = Date.now() - startTime;
    console.log(`Request completed in ${requestDuration}ms`);
    console.log('Response status:', response.status, response.statusText);
    
    // Log response headers for debugging
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    console.log('Response headers:', responseHeaders);
    
    // Clone the response for error handling
    const responseClone = response.clone();
    
    // Handle non-OK responses
    if (!response.ok) {
      let errorDetails;
      try {
        // Try to parse the error response as JSON from the clone
        const errorResponse = await responseClone.text();
        console.log('Error response text:', errorResponse);
        try {
          errorDetails = JSON.parse(errorResponse);
        } catch (e) {
          errorDetails = errorResponse;
        }
      } catch (e) {
        console.error('Error parsing error response:', e);
        errorDetails = 'Failed to parse error response';
      }
      
      const error = new Error(`HTTP error! status: ${response.status}`);
      error.status = response.status;
      error.statusText = response.statusText;
      error.details = errorDetails;
      
      console.error('API Error:', {
        url,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        details: errorDetails,
        error: error.message
      });
      
      throw error;
    }
    
    // Parse the successful response
    let responseData;
    const responseText = await response.text();
    console.log('Raw response text:', responseText);
    
    try {
      responseData = JSON.parse(responseText);
      console.log('Parsed response data:', responseData);
      console.log('API Response data type:', typeof responseData);
      console.log('API Response data keys:', Object.keys(responseData));
      
      // Log the first paper (if available) for debugging
      if (responseData.papers && responseData.papers.length > 0) {
        console.log('First paper in response:', responseData.papers[0]);
      }
    } catch (e) {
      console.error('Failed to parse JSON response. Raw response:', responseText);
      throw new Error(`Invalid JSON response from server: ${e.message}`);
    }
    
    // Validate response structure
    if (!responseData) {
      throw new Error('Empty response from server');
    }
    
    // Extract papers from the response
    let papers = [];
    if (responseData.papers && Array.isArray(responseData.papers)) {
      papers = responseData.papers;
      console.log(`Found ${papers.length} papers in response.papers`);
    } else if (Array.isArray(responseData)) {
      // Fallback for legacy format
      papers = responseData;
      console.log(`Found ${papers.length} papers in root array (legacy format)`);
    } else {
      console.error('Unexpected response format:', responseData);
      throw new Error('Invalid response format: expected papers array not found');
    }
    
    if (papers.length === 0) {
      console.warn('No papers found in the response');
    }
    
    // Extract clustering information if available
    const clusteringInfo = {
      available: responseData.clustering?.available || false,
      stats: responseData.clustering?.stats || {},
      sourceFile: responseData.clustering?.source_file || null,
      lastModified: responseData.clustering?.last_modified ? 
        new Date(responseData.clustering.last_modified * 1000).toISOString() : null,
      numClusters: responseData.clustering?.num_clusters || 0
    };
    
    console.log('Clustering information:', clusteringInfo);

    // Include clustering data in the response
    const responseWithClustering = {
      papers: papers,
      clustering: {
        available: clusteringInfo.available,
        data: responseData.clustering?.data || [],
        stats: clusteringInfo.stats,
        sourceFile: clusteringInfo.sourceFile,
        lastModified: clusteringInfo.lastModified,
        numClusters: clusteringInfo.numClusters
      }
    };

    // Log the first few papers for debugging
    console.log('Raw papers data from API (first 3):', papers.slice(0, 3));
    
    // Process papers using the shared processing function
    const formattedPapers = processPapersData(papers);
    
    // Log a sample of the transformed data for debugging
    formattedPapers.slice(0, 3).forEach((paper, index) => {
      console.log(`Sample paper ${index + 1}:`, {
        id: paper.id,
        title: paper.title,
        authors: paper.authors,
        published: paper.published,
        hasAbstract: !!(paper.abstract && paper.abstract !== 'No abstract available'),
        url: paper.url
      });
    });
    
    console.log('Successfully formatted papers with clustering data:', {
      papers: formattedPapers,
      clustering: responseWithClustering.clustering
    });
    
    // Return both papers and clustering data
    return {
      papers: formattedPapers,
      clustering: responseWithClustering.clustering
    };
  } catch (error) {
    console.error('Error in fetchPapers:', {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Polls the server until processing is complete
 * @param {string} taskId - The task ID to poll
 * @param {number} [initialInterval=2000] - Initial polling interval in milliseconds
 * @param {number} [maxAttempts=60] - Maximum number of polling attempts (default: 5 minutes with 5s interval)
 * @param {number} [maxBackoff=30000] - Maximum polling interval in milliseconds
 * @returns {Promise<Object>} The final result when processing is complete
 */
const pollForResults = async (taskId, initialInterval = 2000, maxAttempts = 60, maxBackoff = 30000) => {
  let attempts = 0;
  let currentInterval = initialInterval;
  const startTime = Date.now();
  
  // Show initial loading message
  console.log(`Starting to poll for results (max ${maxAttempts} attempts, ~${Math.round((maxAttempts * initialInterval) / 1000)}s max)`);
  
  while (attempts < maxAttempts) {
    const attemptStartTime = Date.now();
    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
    
    try {
      console.log(`[${elapsedSeconds}s] Checking for results (attempt ${attempts + 1}/${maxAttempts})...`);
      
      // Add a small delay before the first attempt
      if (attempts > 0) {
        await new Promise(resolve => setTimeout(resolve, currentInterval));
      }
      
      // Using minimal headers to avoid CORS preflight
      const response = await fetch(`${API_BASE_URL}/papers/?_t=${Date.now()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check if we have valid data (not just an empty array)
      if (data && ((Array.isArray(data) && data.length > 0) || (data.papers && data.papers.length > 0))) {
        const papers = Array.isArray(data) ? data : data.papers;
        console.log(`[${elapsedSeconds}s] Found ${papers.length} papers`);
        return { success: true, data: Array.isArray(data) ? data : data.papers };
      }
      
      // Exponential backoff with jitter
      const jitter = Math.random() * 1000; // Add up to 1s of jitter
      currentInterval = Math.min(maxBackoff, currentInterval * 1.5 + jitter);
      
      console.log(`[${elapsedSeconds}s] No data yet. Next check in ${Math.round(currentInterval/1000)}s`);
      
    } catch (error) {
      console.error(`[${elapsedSeconds}s] Error polling for results:`, error.message);
      
      // For network errors, use a longer backoff
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        currentInterval = Math.min(maxBackoff, currentInterval * 2);
      }
      
      // Don't count network errors as attempts
      if (!error.message.includes('Failed to fetch') && !error.message.includes('NetworkError')) {
        attempts++;
      }
      
      // If we get a 404, the endpoint might not be ready yet
      if (error.message.includes('404')) {
        currentInterval = Math.min(maxBackoff, currentInterval * 1.5);
      }
      
      // Add some jitter to prevent thundering herd
      const jitter = Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, currentInterval + jitter));
      
      continue;
    }
    
    attempts++;
  }
  
  const error = new Error(`Timed out after ${Math.round((Date.now() - startTime) / 1000)} seconds waiting for results`);
  error.name = 'PollingTimeoutError';
  error.attempts = attempts;
  error.duration = Date.now() - startTime;
  throw error;
};

/**
 * Updates search terms and triggers paper processing
 * @param {string} searchTerm - Comma-separated list of search terms
 * @returns {Promise<Object>} Response from the server with processing status
 */
export const updateSearchTerms = async (searchTerm) => {
  try {
    console.log('Updating search terms with:', searchTerm);
    
    // Convert the search term to an array as expected by the backend
    const searchTerms = searchTerm.split(',').map(term => term.trim()).filter(term => term);
    
    if (searchTerms.length === 0) {
      throw new Error('Please provide at least one valid search term');
    }
    
    // Clear any existing data first to show loading state
    const clearResponse = await fetch(`${API_BASE_URL}/search-terms/clear/`, {
      method: 'GET',  // The clear endpoint expects a GET request
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!clearResponse.ok) {
      console.warn('Failed to clear previous search terms, continuing anyway...');
      // Don't throw error, as we can still proceed with the new search
    }
    
    // Start the search process
    const searchResponse = await fetch(`${API_BASE_URL}/search-terms/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ search_terms: searchTerms }),  // Match backend's expected field name
    });
    
    if (!searchResponse.ok) {
      let errorMessage = 'Failed to update search terms';
      try {
        const errorData = await searchResponse.json();
        errorMessage = errorData.error || errorData.detail || errorMessage;
      } catch (e) {
        // If we can't parse the error response, use the status text
        errorMessage = searchResponse.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    
    // Start polling for results
    console.log('Search started, waiting for results...');
    const result = await pollForResults('search-task');
    
    if (result && result.success) {
      // Process the new data
      const processedData = await processPapersData(result.data || result);
      return {
        success: true,
        message: 'Search completed successfully',
        data: processedData
      };
    } else {
      throw new Error(result?.error || 'Unknown error occurred during search');
    }
  } catch (error) {
    console.error('Error in updateSearchTerms:', {
      message: error.message,
      stack: error.stack,
    });
    
    // Re-throw the error with a more user-friendly message if possible
    if (error.message.includes('Network Error')) {
      throw new Error('Unable to connect to the server. Please check your internet connection and try again.');
    }
    
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
