const API_BASE_URL = 'http://localhost:8000/api'; // Updated port to match Django backend

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
    
    // Transform papers to match the expected frontend format
    const formattedPapers = papers.map((paper, index) => {
      console.log(`Processing paper ${index}:`, paper); // Debug log
      try {
        // Generate a unique ID if not provided
        const id = paper.id || 
                  paper.URL || 
                  paper.url || 
                  `paper-${Date.now()}-${index}`;
        
        // Get cluster information
        const clusterId = paper.cluster !== undefined ? paper.cluster : -1;
        const clusterLabel = paper.cluster_label || `Cluster ${clusterId}`;
        
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
          // Try different possible field names for abstract
          const possibleAbstractFields = [
            'abstract', 'Abstract', 'summary', 'Summary', 'description', 'Description',
            'abstractText', 'abstract_text', 'paperAbstract', 'paper_abstract'
          ];
          
          for (const field of possibleAbstractFields) {
            if (paper[field] && typeof paper[field] === 'string' && paper[field].trim()) {
              console.log(`Found abstract in field: ${field}`);
              return paper[field].trim();
            }
          }
          
          // If no abstract found in standard fields, check _original if it exists
          if (paper._original) {
            for (const field of possibleAbstractFields) {
              if (paper._original[field] && typeof paper._original[field] === 'string' && paper._original[field].trim()) {
                console.log(`Found abstract in _original.${field}`);
                return paper._original[field].trim();
              }
            }
          }
          
          console.log('No abstract found in paper:', { 
            id: paper.id, 
            title: paper.title,
            availableFields: Object.keys(paper) 
          });
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
        
        const formattedPaper = {
          id: id,
          title: title,
          authors: authors,
          published: published,
          abstract: abstract,
          url: url,
          categories: categories,
          cluster: cluster,
          // Include any additional fields that might be useful
          ...(paper.x !== undefined && { x: paper.x }),
          ...(paper.y !== undefined && { y: paper.y }),
          ...(paper.cluster_label && { cluster_label: paper.cluster_label }),
          // Include the original paper data for debugging
          _original: paper
        };
        
        // Log if we couldn't find an abstract
        if (abstract === 'No abstract available') {
          console.warn('No abstract found for paper:', {
            id: id,
            title: title,
            availableFields: Object.keys(paper),
            paperData: paper // Include full paper data for debugging
          });
        }
        
        // Log a sample of the transformed data for debugging
        if (index < 3) {
          console.log(`Sample paper ${index + 1}:`, {
            id: formattedPaper.id,
            title: formattedPaper.title,
            authors: formattedPaper.authors,
            published: formattedPaper.published,
            hasAbstract: !!(formattedPaper.abstract && formattedPaper.abstract !== 'No abstract available'),
            url: formattedPaper.url
          });
        }
        
        return formattedPaper;
      } catch (error) {
        console.error('Error formatting paper:', {
          error: error.message,
          paper: paper
        });
        // Return a minimal valid paper object even if there's an error
        return {
          id: `error-${Date.now()}-${index}`,
          title: 'Error loading paper',
          authors: 'Unknown',
          published: 'N/A',
          abstract: 'There was an error loading this paper. Please try again later.',
          url: '#',
          categories: '',
          cluster: 'Error',
          _original: paper || {},
          _error: error.message
        };
      }
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
    
    console.log('Formatted search terms:', searchTerms);
    
    const url = `${API_BASE_URL}/search-terms/`;
    console.log('Sending request to:', url);
    
    const requestBody = { search_terms: searchTerms };
    console.log('Request body:', requestBody);
    
    const startTime = Date.now();
    let response;
    
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        mode: 'cors',
        body: JSON.stringify(requestBody),
      });
      
      console.log(`Request completed in ${Date.now() - startTime}ms`);
      console.log('Response status:', response.status, response.statusText);
      
      // Log response headers for debugging
      const responseHeaders = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      console.log('Response headers:', responseHeaders);
      
      // Get response text first to handle potential JSON parse errors
      const responseText = await response.text();
      console.log('Raw response text:', responseText);
      
      let responseData;
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError, 'Response text:', responseText);
        throw new Error(`Invalid JSON response from server: ${parseError.message}`);
      }
      
      console.log('Parsed response data:', responseData);
      
      if (!response.ok) {
        console.error('Error response from server:', {
          status: response.status,
          statusText: response.statusText,
          data: responseData,
        });
        
        const errorMessage = responseData.error || 
                            responseData.detail || 
                            response.statusText || 
                            `Request failed with status ${response.status}`;
        
        throw new Error(errorMessage);
      }
      
      // If we have a CSV file in the response, fetch the updated papers
      if (responseData.csv_file || responseData.papers_processed) {
        console.log('Backend processing complete:', responseData);
        return responseData;
      }
      
      // If no CSV file but we have a warning (e.g., no papers found)
      if (responseData.warning) {
        console.warn('Warning from server:', responseData.warning);
        return responseData;
      }
      
      // If we get here, the response format is unexpected
      console.warn('Unexpected response format from server:', responseData);
      return responseData;
      
    } catch (networkError) {
      console.error('Network error during updateSearchTerms:', {
        message: networkError.message,
        stack: networkError.stack,
        url,
        method: 'POST',
      });
      
      // Provide more detailed error message for network issues
      if (networkError.name === 'TypeError' && networkError.message.includes('Failed to fetch')) {
        throw new Error('Failed to connect to the server. Please check your internet connection and try again.');
      }
      
      throw networkError;
    }
    
  } catch (error) {
    console.error('Error in updateSearchTerms:', {
      message: error.message,
      stack: error.stack,
      searchTerm,
    });
    
    // Rethrow with a more user-friendly message if needed
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Failed to connect to the server. Please try again later.');
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
