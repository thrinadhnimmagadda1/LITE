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
        Expected request data: {"search_terms": ["term1", "term2", ...]}
        """
                
        # Default action is to update search terms
        search_terms = request.data.get('search_terms', [])
        if not search_terms:
            return Response(
                {'error': 'No search terms provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        config_path = self.get_config_path()
        script_path = self.get_script_path()
        
        try:
            # Read current config
            with open(config_path, 'r') as f:
                config = json.load(f)
            
            # Update must_include terms
            config['must_include'] = search_terms
            
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
        # Try multiple possible output directories
        possible_dirs = [
            Path(settings.BASE_DIR).parent / 'backend' / 'scripts' / 'out',  # New location
            Path(settings.BASE_DIR).parent / 'backend' / 'out',               # Old location
            Path(settings.BASE_DIR).parent / 'out'                            # Alternative location
        ]
        
        papers = []
        output_dir = None
        
        # Find the first directory that exists and contains CSV files
        for dir_path in possible_dirs:
            if dir_path.exists() and any(dir_path.glob('*.csv')):
                output_dir = dir_path
                print(f"Found output directory: {output_dir}")
                break
        
        if not output_dir:
            return [], 'No output directory found with CSV files'
        
        print(f"Looking for CSV files in: {output_dir}")
        
        # Look for the most recent summary CSV file
        try:
            summary_files = sorted(
                output_dir.glob('*summary*.csv'),
                key=os.path.getmtime,
                reverse=True
            )
            print(f"Found {len(summary_files)} summary files")
        except Exception as e:
            print(f"Error finding summary files: {str(e)}")
            summary_files = []
        
        # If no summary files, try to use clustering file directly
        if not summary_files:
            print("No summary files found, looking for clustering files")
            # Look for clustering files with more flexible patterns
            clustering_patterns = ['*kmeans*.csv', '*arxiv*.csv', '*.csv']
            clustering_files = []
            
            for pattern in clustering_patterns:
                try:
                    files = sorted(
                        output_dir.glob(pattern),
                        key=os.path.getmtime,
                        reverse=True
                    )
                    if files:
                        clustering_files = files
                        print(f"Found {len(files)} files with pattern {pattern}")
                        break
                except Exception as e:
                    print(f"Error with pattern {pattern}: {str(e)}")
            
            if not clustering_files:
                error_msg = f'No paper data found in {output_dir}. Tried patterns: {clustering_patterns}'
                print(error_msg)
                return [], error_msg
                
            # Use the most recent clustering file
            try:
                import pandas as pd
                df = pd.read_csv(clustering_files[0])
                
                # Convert DataFrame to list of dicts with appropriate field mapping
                papers = []
                for _, row in df.iterrows():
                    # Get all column names for debugging
                    all_columns = df.columns.tolist()
                    print(f"Available columns in CSV: {all_columns}")
                    
                    # Try to extract abstract from various possible column names
                    abstract = ''
                    possible_abstract_columns = ['Abstract', 'abstract', 'Summary', 'summary', 'paper_abstract']
                    
                    for col in possible_abstract_columns:
                        if col in row and pd.notna(row[col]) and str(row[col]).strip():
                            abstract = str(row[col]).strip()
                            print(f"Found abstract in column: {col}")
                            break
                    
                    paper = {
                        'id': str(row.get('id', row.get('ID', ''))),
                        'title': row.get('Title', row.get('title', 'Untitled')).strip(),
                        'authors': row.get('Authors', row.get('authors', 'Unknown Author')).strip(),
                        'abstract': abstract,
                        'published': row.get('Published', row.get('published', row.get('Date', ''))),
                        'cluster': int(row.get('Cluster', row.get('cluster', -1))),
                        'cluster_label': f"Cluster {row.get('Cluster', row.get('cluster', '?'))}",
                        'url': f"https://arxiv.org/abs/{row.get('id', row.get('ID', ''))}" if 'id' in row or 'ID' in row else '#',
                        'categories': row.get('Categories', row.get('categories', '')).strip(),
                        '_original': {col: row[col] for col in df.columns if pd.notna(row[col]) and str(row[col]).strip()}
                    }
                    
                    # Log paper details for debugging
                    print(f"Processed paper: {paper['title']}")
                    print(f"Abstract length: {len(abstract)} characters")
                    
                    papers.append(paper)
                
                print(f"Total papers processed: {len(papers)}")
                print(f"First paper abstract: {papers[0]['abstract'][:100]}..." if papers[0]['abstract'] else "No abstract in first paper")
                
                return papers, None
                
            except Exception as e:
                return [], f'Error reading clustering data: {str(e)}'
        
        # Read the most recent summary file if available
        try:
            import pandas as pd
            df = pd.read_csv(summary_files[0])
            
            # Get all column names for debugging
            print(f"Columns in summary file: {df.columns.tolist()}")
            
            # Convert DataFrame to list of dicts with explicit field mapping
            papers = []
            for _, row in df.iterrows():
                # Try to extract abstract from various possible column names
                abstract = ''
                possible_abstract_columns = ['Abstract', 'abstract', 'Summary', 'summary', 'Abstract Summaries', 'abstract_summaries']
                
                for col in possible_abstract_columns:
                    if col in row and pd.notna(row[col]) and str(row[col]).strip():
                        abstract = str(row[col]).strip()
                        print(f"Found abstract in column: {col}")
                        break
                
                # Create paper object with all fields
                paper = {
                    'id': str(row.get('id', row.get('ID', ''))),
                    'title': row.get('Title', row.get('title', 'Untitled')).strip(),
                    'authors': row.get('Authors', row.get('authors', 'Unknown Author')).strip(),
                    'abstract': abstract,
                    'published': row.get('Published', row.get('published', row.get('Date', row.get('submitted_date', '')))),
                    'url': row.get('URL', row.get('url', row.get('link', '#'))),
                    'categories': row.get('Categories', row.get('categories', '')).strip(),
                    'summary': abstract,  # For backward compatibility
                    'submitted_date': row.get('submitted_date', row.get('Submitted Date', '')),
                    '_original': {col: row[col] for col in df.columns if pd.notna(row[col]) and str(row[col]).strip()}
                }
                
                # Log paper details for debugging
                print(f"Processed summary paper: {paper['title']}")
                print(f"Abstract length: {len(abstract)} characters")
                
                papers.append(paper)
            
            print(f"Total summary papers processed: {len(papers)}")
            print(f"First summary paper abstract: {papers[0]['abstract'][:100]}..." if papers and papers[0].get('abstract') else "No abstract in first summary paper")
                
        except Exception as e:
            return [], f'Error reading paper data: {str(e)}'
                
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
        Get all papers and clustering results
        """
        try:
            # Get papers data
            papers, error = self.get_papers_data()
            if error and not papers:
                return Response(
                    {'error': error}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get clustering results
            clustering_results, clustering_error = self.get_clustering_results()
            
            # Prepare response data
            response_data = {
                'papers': papers,
                'clustering': {
                    'available': clustering_results is not None,
                    'error': clustering_error,
                    'stats': {}
                }
            }
            
            # If we have clustering results, include them in the response
            if clustering_results and not clustering_error:
                response_data['clustering'].update({
                    'stats': clustering_results.get('stats', {}),
                    'source_file': clustering_results.get('source_file'),
                    'last_modified': clustering_results.get('last_modified'),
                    'num_clusters': clustering_results.get('stats', {}).get('num_clusters', 0)
                })
                
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
            
            # Clean the data to handle NaN/Inf values
            cleaned_data = self.clean_data(response_data)
            
            # Return the combined data
            return Response(cleaned_data)
            
        except Exception as e:
            import traceback
            traceback.print_exc()  # Print full traceback to console
            return Response(
                {'error': f'Failed to retrieve papers: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
