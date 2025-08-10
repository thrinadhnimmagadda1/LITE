// Use environment variable or default to development URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

/**
 * Processes raw paper data into a consistent format for the frontend
 * @param {Array|Object} papersData - Raw papers data from the API
 * @returns {Array} Processed array of paper objects
 */
const processPapersData = (papersData) => {
  console.log('[processPapersData] Starting to process papers data:', { 
    inputType: Array.isArray(papersData) ? 'array' : typeof papersData,
    hasPapers: !!(papersData && papersData.papers),
    papersCount: Array.isArray(papersData) ? papersData.length : (papersData?.papers?.length || 0)
  });
  
  if (!papersData) {
    console.warn('[processPapersData] No papers data provided');
    return [];
  }
  
  // Handle different response formats
  let papers = [];
  if (Array.isArray(papersData)) {
    // Case 1: Direct array of papers
    papers = papersData;
  } else if (papersData.results && Array.isArray(papersData.results)) {
    // Case 2: Paginated response with results array
    papers = papersData.results;
  } else if (papersData.papers && Array.isArray(papersData.papers)) {
    // Case 3: Response with papers array
    papers = papersData.papers;
  } else if (typeof papersData === 'object' && papersData !== null) {
    // Case 4: Single paper object
    papers = [papersData];
  }
  
  if (!Array.isArray(papers)) {
    console.error('[processPapersData] Invalid papers data format:', papers);
    return [];
  }
  
  console.log(`[processPapersData] Processing ${papers.length} papers`);
  
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
      
      // Debug log the original paper data
      console.log('Processing paper - Original data:', {
        id: paper.id,
        hasMonth: !!paper.Month,
        hasYear: !!paper.Year,
        Month: paper.Month,
        Year: paper.Year,
        hasOriginal: !!paper._original,
        originalMonth: paper._original?.Month,
        originalYear: paper._original?.Year,
        published: paper.published
      });

      // Create the paper object with all fields
      const processedPaper = {
        id: id,
        title: title,
        authors: authors,
        published: published,
        abstract: abstract,
        url: url,
        categories: categories,
        cluster: cluster,
        // Include Month and Year if they exist in the original data
        ...(paper.Month && { Month: paper.Month }),
        ...(paper.Year && { Year: paper.Year }),
        ...(paper.x !== undefined && { x: paper.x }),
        ...(paper.y !== undefined && { y: paper.y }),
        ...(paper.cluster_label && { cluster_label: paper.cluster_label }),
        _original: paper
      };
      
      // If we have Month/Year in the original but not at the top level, add them
      if (!processedPaper.Month && paper._original?.Month) {
        console.log('Adding Month from _original:', paper._original.Month);
        processedPaper.Month = paper._original.Month;
      }
      if (!processedPaper.Year && paper._original?.Year) {
        console.log('Adding Year from _original:', paper._original.Year);
        processedPaper.Year = paper._original.Year;
      }
      
      console.log('Final processed paper date info:', {
        id: processedPaper.id,
        Month: processedPaper.Month,
        Year: processedPaper.Year,
        published: processedPaper.published
      });
      
      return processedPaper;
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
 * Fetches paginated papers data including clustering information from the backend
 * @param {Object} options - Pagination options
 * @param {number} [options.page=1] - Page number to fetch
 * @param {number} [options.pageSize=20] - Number of items per page
 * @returns {Promise<Object>} Processed papers data
 */
export const fetchPapers = async ({ page = 1, pageSize = 20 } = {}) => {
  console.log('[fetchPapers] Starting to fetch papers', { page, pageSize });
  
  // Validate inputs
  const validPage = Math.max(1, parseInt(page, 10) || 1);
  const validPageSize = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
  
  const queryParams = new URLSearchParams({
    page: validPage,
    page_size: validPageSize,
    _t: Date.now() // Add timestamp to prevent caching
  });
  
  const url = `${API_BASE_URL}/papers/?${queryParams}`;
  
  console.log(`[fetchPapers] Fetching papers from: ${url}`);
  
  try {
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
      }
      
      // Try to get more details from the response if possible
      let responseText;
      if (!responseText && responseClone) {
        try {
          responseText = await responseClone.text();
          console.error('[fetch] Additional error details from response:', responseText);
        } catch (e) {
          console.error('[fetch] Could not read response body:', e);
        }
      }
      
      // Create a new error with more context
      const enhancedError = new Error(`API request failed: ${response.status} ${response.statusText}`);
      enhancedError.originalError = new Error(response.statusText || 'Unknown error occurred');
      if (response) {
        enhancedError.response = {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          headers: response.headers ? Object.fromEntries(response.headers.entries()) : {},
          body: responseText
        };
      }
      
      throw enhancedError; // Re-throw to be caught by the outer try-catch
    } 
    // Process the papers data from the successful response
    const apiResponse = await response.json();
    console.log('[fetchPapers] Raw API response:', apiResponse);
    
    // Process the papers data
    const processedPapers = processPapersData(apiResponse);
    
    if (processedPapers.length === 0) {
      console.warn('[fetchPapers] No papers found after processing');
      // Return empty results with pagination info if available
      return {
        papers: [],
        pagination: {
          currentPage: 1,
          pageSize: 20,
          totalPages: 1,
          totalItems: 0,
          hasNext: false,
          hasPrevious: false
        },
        clustering: {}
      };
    }
    
    console.log(`[fetchPapers] Successfully processed ${processedPapers.length} papers`);
    
    // Extract pagination info if available
    const pagination = {
      currentPage: apiResponse.current_page || 1,
      pageSize: apiResponse.page_size || 20,
      totalPages: apiResponse.total_pages || 1,
      totalItems: apiResponse.total_count || processedPapers.length,
      hasNext: apiResponse.next_page !== null,
      hasPrevious: apiResponse.previous_page !== null
    };
    
    // Extract pagination information from the API response
    const paginationInfo = {
      current_page: validPage,
      page_size: validPageSize,
      total_pages: 1,
      total_items: processedPapers.length,
      has_next: false,
      has_previous: false
    };
    
    // Extract clustering information if available
    const clusteringInfo = {
      available: apiResponse.clustering?.available || false,
      stats: apiResponse.clustering?.stats || {},
      sourceFile: apiResponse.clustering?.source_file || null,
      lastModified: apiResponse.clustering?.last_modified ? 
        new Date(apiResponse.clustering.last_modified * 1000).toISOString() : null,
      numClusters: apiResponse.clustering?.num_clusters || 0
    };
    
    console.log('Successfully processed paginated papers and clustering data');
    
    // Return the paginated response with papers, pagination, and clustering info
    return {
      papers: processedPapers,
      pagination: {
        currentPage: paginationInfo.current_page,
        pageSize: paginationInfo.page_size,
        totalPages: paginationInfo.total_pages,
        totalItems: paginationInfo.total_items,
        hasNext: paginationInfo.has_next,
        hasPrevious: paginationInfo.has_previous
      },
      clustering: clusteringInfo
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
 * @param {Object|string} searchParams - Search parameters object or search term string
 * @param {string} searchParams.query - Main search query (required)
 * @param {string} [searchParams.keywords] - Optional keywords to refine search (comma-separated)
 * @returns {Promise<Object>} Response from the server with processing status
 */
export const updateSearchTerms = async (searchParams) => {
  try {
    console.log('Updating search terms with params:', searchParams);
    
    // Handle both string (backward compatibility) and object parameters
    let query = '';
    let keywords = [];
    
    if (typeof searchParams === 'string') {
      query = searchParams;
    } else if (searchParams && typeof searchParams === 'object') {
      query = searchParams.query || '';
      // Safely handle keywords - check if it exists and is a string before splitting
      if (searchParams.keywords) {
        if (typeof searchParams.keywords === 'string') {
          keywords = searchParams.keywords.split(',').map(k => k.trim()).filter(k => k);
        } else if (Array.isArray(searchParams.keywords)) {
          // If it's already an array, just use it directly
          keywords = searchParams.keywords.map(k => String(k).trim()).filter(k => k);
        }
      }
    } else {
      throw new Error('Invalid search parameters');
    }
    
    // Convert the search query to an array as expected by the backend
    const searchTerms = query.split(',').map(term => term.trim()).filter(term => term);
    
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
      body: JSON.stringify({ 
        search_terms: searchTerms,
        ...(keywords.length > 0 && { keywords: keywords })  // Only include keywords if provided
      }),
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
