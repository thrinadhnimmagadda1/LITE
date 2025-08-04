import json
import subprocess
import os
from pathlib import Path
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class SearchTermsAPIView(APIView):
    # Disable CSRF for this view for testing purposes
    @csrf_exempt
    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.action = None
        
    @classmethod
    def as_view(cls, **initkwargs):
        # Store the action from the URL pattern
        action = initkwargs.pop('action', None)
        
        def view(request, *args, **kwargs):
            self = cls(**initkwargs)
            self.action = action
            self.request = request
            self.args = args
            self.kwargs = kwargs
            return self.dispatch(request, *args, **kwargs)
            
        view.view_class = cls
        view.view_initkwargs = initkwargs
        
        # Copy attributes from the dispatch method to the view
        view.__doc__ = cls.__doc__
        view.__module__ = cls.__module__
        view.__name__ = cls.__name__
        view.__qualname__ = cls.__qualname__
        
        return view
        
    def get_config_path(self):
        """Helper method to get the config file path"""
        return Path(settings.BASE_DIR).parent / 'backend' / 'config.json'
        
    def get_script_path(self):
        """Helper method to get the script path"""
        return Path(settings.BASE_DIR).parent / 'backend' / 'scripts' / 'arxiv_kmeans_sbert_umap.py'
        
    def get(self, request):
        """Get the current search terms from config.json"""
        config_path = self.get_config_path()
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
            return Response({
                'must_include': config.get('must_include', []),
                'optional_keywords': config.get('optional_keywords', [])
            })
        except Exception as e:
            return Response(
                {'error': f'Failed to read config file: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    def clear_must_include(self):
        """Clear the must_include array in config.json"""
        config_path = self.get_config_path()
        try:
            # Read the current config
            with open(config_path, 'r') as f:
                config = json.load(f)
            
            # Print the current config for debugging
            print(f"Current config before clear: {config}")
            
            # Clear the must_include array
            config['must_include'] = []
            
            # Print the updated config for debugging
            print(f"Config after clear: {config}")
            
            # Save the updated config
            with open(config_path, 'w') as f:
                json.dump(config, f, indent=4)
            
            # Verify the file was written correctly
            with open(config_path, 'r') as f:
                saved_config = json.load(f)
                print(f"Config after save: {saved_config}")
                if saved_config.get('must_include') != []:
                    return False, "Failed to clear must_include array"
                
            return True, None
            
        except Exception as e:
            import traceback
            print(f"Error in clear_must_include: {str(e)}\n{traceback.format_exc()}")
            return False, str(e)

    def get(self, request):
        """
        Handle GET requests:
        - If no action, return current search terms
        - If action=clear, clear the must_include array
        """
        action = getattr(self, 'action', None)
        
        if action == 'clear':
            success, error = self.clear_must_include()
            if success:
                return Response({'message': 'Search terms cleared successfully'})
            else:
                return Response(
                    {'error': f'Failed to clear search terms: {error}'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        # Default behavior: return current search terms
        config_path = self.get_config_path()
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
            return Response({
                'must_include': config.get('must_include', []),
                'optional_keywords': config.get('optional_keywords', [])
            })
        except Exception as e:
            return Response(
                {'error': f'Failed to read config file: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    def post(self, request):
        """
        Handle POST requests to update search terms in config.json and trigger arxiv_extractor_abstract_summary.py
        Expected request data: {
            "search_terms": ["term1", "term2", ...],
            "keywords": ["keyword1", "keyword2", ...]  # optional
        }
        """
                
        # Get search terms (required) and keywords (optional)
        search_terms = request.data.get('search_terms', [])
        keywords = request.data.get('keywords', [])
        
        if not search_terms and not keywords:
            return Response(
                {'error': 'No search terms or keywords provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        config_path = self.get_config_path()
        script_path = self.get_script_path()
        
        try:
            # Read current config
            with open(config_path, 'r') as f:
                config = json.load(f)
            
            # Update must_include terms if provided
            if search_terms:
                config['must_include'] = search_terms
                
            # Update optional keywords if provided
            if keywords:
                config['optional_keywords'] = keywords if isinstance(keywords, list) else [keywords]
            
            # Save updated config
            with open(config_path, 'w') as f:
                json.dump(config, f, indent=4)
            
            # Run the arxiv extractor script
            try:
                # First run the abstract summary script
                result = subprocess.run(
                    ['python', str(script_path)],
                    capture_output=True,
                    text=True,
                    cwd=str(script_path.parent)
                )
                
                if result.returncode != 0:
                    return Response(
                        {
                            'message': 'Config updated but script execution failed',
                            'error': result.stderr
                        },
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                
                # Then run the kmeans sbert umap script
                kmeans_script_path = script_path.parent / 'arxiv_kmeans_sbert_umap.py'
                kmeans_result = subprocess.run(
                    ['python', str(kmeans_script_path)],
                    capture_output=True,
                    text=True,
                    cwd=str(script_path.parent)
                )
                
                if kmeans_result.returncode != 0:
                    # Log the error but don't fail the request - clustering is optional
                    print(f"Warning: Clustering script failed with error: {kmeans_result.stderr}")
                    return Response(
                        {
                            'message': 'Search terms updated and papers fetched successfully',
                            'warning': 'Clustering was not performed due to insufficient data or other issues',
                            'details': kmeans_result.stderr[:500]  # Include first 500 chars of error
                        },
                        status=status.HTTP_200_OK
                    )
                
                return Response({
                    'message': 'Search terms updated and processing completed successfully',
                    'abstract_output': result.stdout,
                    'clustering_output': kmeans_result.stdout
                })
                
            except Exception as e:
                return Response(
                    {
                        'message': 'Config updated but script execution failed',
                        'error': str(e)
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            return Response(
                {'error': f'Failed to update config: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PapersAPIView(APIView):
    def get_clustering_results(self):
        """Helper method to get clustering results from CSV"""
        output_dir = Path(settings.BASE_DIR).parent / 'backend' / 'out'
        clustering_files = list(output_dir.glob('arxiv_with_authors_kmeans_*.csv'))
        
        if not clustering_files:
            return None, 'No clustering results found (no clustering CSV files)'
            
        # Try to find the specific file first, otherwise use the most recent
        specific_file = output_dir / 'arxiv_with_authors_kmeans_k2_20250726_162502.csv'
        if specific_file in clustering_files:
            latest_file = specific_file
        else:
            # Fall back to the most recent file if the specific one isn't found
            latest_file = max(clustering_files, key=os.path.getmtime)
        
        try:
            import pandas as pd
            # Read the clustering results CSV
            df = pd.read_csv(latest_file)
            
            # Extract the number of clusters from the filename
            import re
            match = re.search(r'kmeans_k(\d+)_', latest_file.name)
            num_clusters = int(match.group(1)) if match else 0
            
            # Convert to list of dicts and clean the data
            clustering_data = []
            for _, row in df.iterrows():
                try:
                    clustering_data.append({
                        'title': row.get('Title', '').strip(),
                        'abstract': row.get('Abstract', '').strip(),
                        'authors': row.get('Authors', '').strip(),
                        'cluster': int(row.get('Cluster', -1)),
                        'url': f"https://arxiv.org/abs/{row.get('id', '')}" if 'id' in row else ''
                    })
                except Exception as e:
                    print(f"Error processing clustering row: {e}")
                    continue
            
            # Get cluster statistics
            cluster_stats = {}
            if clustering_data:
                cluster_counts = {}
                for item in clustering_data:
                    cluster_id = item['cluster']
                    cluster_counts[cluster_id] = cluster_counts.get(cluster_id, 0) + 1
                
                cluster_stats = {
                    'total_papers': len(clustering_data),
                    'num_clusters': num_clusters,
                    'papers_per_cluster': cluster_counts,
                    'source_file': latest_file.name
                }
            
            return {
                'data': clustering_data,
                'stats': cluster_stats,
                'source_file': latest_file.name,
                'last_modified': os.path.getmtime(latest_file)
            }, None
            
        except Exception as e:
            import traceback
            print(f"Error in get_clustering_results: {str(e)}\n{traceback.format_exc()}")
            return None, f'Error reading clustering results: {str(e)}'
    
    def get_papers_data(self):
        """Helper method to get papers data from CSV files"""
        # Define all possible output directories to check
        possible_dirs = [
            Path(settings.BASE_DIR).parent / 'backend' / 'scripts' / 'out',  # Current location
            Path(settings.BASE_DIR).parent / 'backend' / 'out',              # Old location
            Path(settings.BASE_DIR).parent / 'out',                          # Alternative location
            Path(settings.BASE_DIR) / 'out',                                 # Django project root out
            Path(settings.BASE_DIR).parent / 'backend' / 'scripts' / 'output' # Another possible location
        ]
        
        papers = []
        output_dir = None
        
        # Debug: Print all directories being checked
        print("Checking for CSV files in the following directories:")
        for i, dir_path in enumerate(possible_dirs, 1):
            exists = dir_path.exists()
            has_csv = any(dir_path.glob('*.csv')) if exists else False
            print(f"{i}. {dir_path} - Exists: {exists}, Has CSV: {has_csv}")
            
            if exists and not output_dir:  # Only set output_dir once
                if has_csv:
                    output_dir = dir_path
                    print(f"Found CSV files in: {output_dir}")
        
        if not output_dir:
            # If no directory with CSVs found, try to create the default directory
            default_dir = Path(settings.BASE_DIR).parent / 'backend' / 'scripts' / 'out'
            try:
                default_dir.mkdir(parents=True, exist_ok=True)
                output_dir = default_dir
                print(f"Created and using default directory: {output_dir}")
            except Exception as e:
                error_msg = f'No valid output directory found with CSV files and could not create default directory: {str(e)}'
                print(error_msg)
                return [], error_msg
        
        print(f"Using output directory: {output_dir}")
        
        # Look for the most recent summary or clustering CSV file
        try:
            # First try to find summary files
            summary_files = list(output_dir.glob('*summary*.csv'))
            print(f"Found {len(summary_files)} summary files")
            
            # If no summary files, look for clustering files
            if not summary_files:
                print("No summary files found, looking for clustering files")
                summary_files = list(output_dir.glob('*kmeans*.csv'))
                print(f"Found {len(summary_files)} clustering files")
                
                # If still no files, look for any CSV files
                if not summary_files:
                    print("No clustering files found, looking for any CSV files")
                    summary_files = list(output_dir.glob('*.csv'))
                    print(f"Found {len(summary_files)} CSV files")
                    
                    if not summary_files:
                        # List all files in the directory for debugging
                        all_files = list(output_dir.glob('*'))
                        print(f"All files in {output_dir}:")
                        for f in all_files:
                            print(f"- {f.name} (size: {f.stat().st_size} bytes, modified: {f.stat().st_mtime})")
                        
                        error_msg = f'No CSV files found in {output_dir}.'
                        print(error_msg)
                        return [], error_msg
            
            # Sort files by modification time (newest first)
            summary_files = sorted(summary_files, key=os.path.getmtime, reverse=True)
            print(f"Using file: {summary_files[0]}")
            
            try:
                import pandas as pd
                print(f"Reading CSV file: {summary_files[0]}")
                df = pd.read_csv(summary_files[0])
                
                if df.empty:
                    error_msg = f'CSV file {summary_files[0]} is empty.'
                    print(error_msg)
                    return [], error_msg
                
                # Convert DataFrame to list of dicts with appropriate field mapping
                papers = []
                print(f"Processing {len(df)} papers from {summary_files[0].name}")
                
                # Get all column names for debugging
                all_columns = df.columns.tolist()
                print(f"Available columns in CSV: {all_columns}")
                
                for idx, row in df.iterrows():
                    try:
                        # Extract data with fallbacks for different column naming conventions
                        paper_id = str(row.get('id', row.get('ID', row.get('paper_id', str(idx)))))
                        title = row.get('Title', row.get('title', 'Untitled'))
                        if pd.isna(title):
                            title = 'Untitled'
                        
                        # Try to extract abstract from various possible column names
                        abstract = ''
                        possible_abstract_columns = ['Abstract', 'abstract', 'Summary', 'summary', 'paper_abstract', 'Abstract_processed']
                        
                        for col in possible_abstract_columns:
                            if col in row and pd.notna(row[col]) and str(row[col]).strip():
                                abstract = str(row[col]).strip()
                                if len(abstract) > 0:
                                    break
                        
                        paper = {
                            'id': paper_id,
                            'title': title,
                            'authors': row.get('Authors', row.get('authors', 'Unknown Author')),
                            'abstract': abstract,
                            'published': row.get('Published', row.get('published', row.get('Date', ''))),
                            'cluster': int(row.get('Cluster', row.get('cluster', -1))),
                            'cluster_label': f"Cluster {row.get('Cluster', row.get('cluster', '?'))}",
                            'url': f"https://arxiv.org/abs/{paper_id}" if 'id' in row or 'ID' in row else '#',
                            'categories': row.get('Categories', row.get('categories', '')),
                            '_original': {col: str(row[col]) for col in df.columns if pd.notna(row[col]) and str(row[col]).strip()}
                        }
                        
                        # Clean string fields
                        for key in ['title', 'authors', 'abstract', 'published', 'categories']:
                            if key in paper and paper[key] is not None:
                                paper[key] = str(paper[key]).strip()
                        
                        papers.append(paper)
                        
                    except Exception as e:
                        print(f"Error processing row {idx}: {str(e)}")
                        import traceback
                        traceback.print_exc()
                        continue
                
                print(f"Successfully processed {len(papers)} papers")
                if papers:
                    print(f"First paper: {papers[0]['title']}")
                    print(f"Abstract preview: {papers[0]['abstract'][:100]}..." if papers[0]['abstract'] else "No abstract available")
                
                return papers, None
                
            except Exception as e:
                error_msg = f'Error reading or processing CSV file {summary_files[0]}: {str(e)}'
                print(error_msg)
                import traceback
                traceback.print_exc()
                return [], error_msg
                
        except Exception as e:
            error_msg = f'Error in get_papers_data: {str(e)}'
            print(error_msg)
            import traceback
            traceback.print_exc()
            return [], error_msg
            
        # If we get here, we couldn't find or process any files
        return [], 'No valid paper data found in any CSV files'
                
        return papers, None
    
    def clean_data(self, data):
        """
        Recursively clean data to handle NaN, Inf, and other non-serializable values.
        Converts them to None or appropriate string representations.
        """
        if isinstance(data, dict):
            return {k: self.clean_data(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [self.clean_data(item) for item in data]
        elif isinstance(data, (int, float)) and (data != data):  # Check for NaN
            return None
        elif isinstance(data, float) and (data == float('inf') or data == float('-inf')):
            return str(data)  # Convert inf/-inf to string
        elif isinstance(data, (str, int, bool)) or data is None:
            return data
        else:
            # For any other type, convert to string
            return str(data)

    def get(self, request):
        """
        Get paginated papers and clustering results
        Query Parameters:
            page: Page number (default: 1)
            page_size: Number of items per page (default: 20, max: 100)
        """
        try:
            # Get pagination parameters
            page = int(request.query_params.get('page', 1))
            page_size = min(int(request.query_params.get('page_size', 20)), 100)  # Cap at 100 items per page
            
            # Get all papers data
            papers, error = self.get_papers_data()
            if error and not papers:
                return Response(
                    {'error': error}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get clustering results (for all papers)
            clustering_results, clustering_error = self.get_clustering_results()
            
            # Apply clustering data to all papers if available
            if clustering_results and not clustering_error:
                # Create a mapping of paper titles to clustering data for merging
                clustering_map = {
                    item['title'].lower().strip(): item 
                    for item in clustering_results.get('data', [])
                    if 'title' in item
                }
                
                # Add clustering data to papers
                for paper in papers:
                    title = paper.get('title', '').lower().strip()
                    if title in clustering_map:
                        paper.update({
                            'cluster': clustering_map[title].get('cluster', -1),
                            'cluster_label': f"Cluster {clustering_map[title].get('cluster', '?')}",
                            'cluster_data': {
                                'cluster_id': clustering_map[title].get('cluster'),
                                'authors': clustering_map[title].get('authors', ''),
                                'url': clustering_map[title].get('url', '')
                            }
                        })
            
            # Calculate pagination
            total_papers = len(papers)
            total_pages = (total_papers + page_size - 1) // page_size
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            
            # Get paginated papers
            paginated_papers = papers[start_idx:end_idx]
            
            # Prepare response data
            response_data = {
                'pagination': {
                    'current_page': page,
                    'page_size': page_size,
                    'total_pages': total_pages,
                    'total_items': total_papers,
                    'has_next': page < total_pages,
                    'has_previous': page > 1
                },
                'papers': paginated_papers,
                'clustering': {
                    'available': clustering_results is not None,
                    'error': clustering_error,
                    'stats': {}
                }
            }
            
            # Add clustering stats if available
            if clustering_results and not clustering_error:
                response_data['clustering'].update({
                    'stats': clustering_results.get('stats', {}),
                    'source_file': clustering_results.get('source_file'),
                    'last_modified': clustering_results.get('last_modified'),
                    'num_clusters': clustering_results.get('stats', {}).get('num_clusters', 0)
                })
            
            # Clean the data to handle NaN/Inf values
            cleaned_data = self.clean_data(response_data)
            
            # Return the paginated response
            return Response(cleaned_data)
            
        except ValueError as e:
            return Response(
                {'error': 'Invalid pagination parameters'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            import traceback
            traceback.print_exc()  # Print full traceback to console
            return Response(
                {'error': f'Failed to retrieve papers: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
