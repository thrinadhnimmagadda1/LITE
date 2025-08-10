import json
import os
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from django.conf import settings
from django.core.cache import cache
from django.db.models import Count, Q
from django.views.decorators.cache import cache_page
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views.decorators.vary import vary_on_cookie
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from .models import Paper, PaperImportLog


class ClearSearchTermsView(APIView):
    """View for clearing search terms."""
    @method_decorator(csrf_exempt)
    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)
    
    def get(self, request):
        # Delegate to SearchTermsAPIView.clear
        return SearchTermsAPIView().clear(request)


class StandardResultsSetPagination(PageNumberPagination):
    """Custom pagination class with configurable page size."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    
    def get_paginated_response(self, data):
        return Response({
            'links': {
                'next': self.get_next_link(),
                'previous': self.get_previous_link()
            },
            'count': self.page.paginator.count,
            'total_pages': self.page.paginator.num_pages,
            'current_page': self.page.number,
            'results': data
        })


class PapersAPIView(APIView):
    """API endpoint for retrieving and searching papers."""
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        """Return the base queryset with common filtering."""
        queryset = Paper.objects.all()
        
        # Apply search filters if provided
        search_query = self.request.query_params.get('search', '').strip()
        if search_query:
            queryset = queryset.filter(
                Q(title__icontains=search_query) |
                Q(abstract__icontains=search_query) |
                Q(authors__icontains=search_query)
            )
        
        # Filter by cluster if specified
        cluster = self.request.query_params.get('cluster')
        if cluster is not None:
            try:
                cluster_id = int(cluster)
                queryset = queryset.filter(cluster=cluster_id)
            except (ValueError, TypeError):
                pass
        
        # Filter by year if specified
        year = self.request.query_params.get('year')
        if year is not None:
            try:
                year_int = int(year)
                queryset = queryset.filter(year=year_int)
            except (ValueError, TypeError):
                pass
        
        # Filter by month if specified
        month = self.request.query_params.get('month')
        if month is not None:
            queryset = queryset.filter(month__iexact=month)
        
        return queryset.order_by('-published_date', '-id')
    
    def get_cluster_stats(self):
        """Get statistics about paper clusters."""
        cache_key = 'cluster_stats'
        stats = cache.get(cache_key)
        
        if stats is None:
            stats = Paper.get_cluster_stats()
            cache.set(cache_key, stats, 3600)  # Cache for 1 hour
            
        return stats
    
    def get_publication_timeline(self, queryset):
        """Generate publication timeline data."""
        timeline = list(
            queryset.exclude(year__isnull=True, month__isnull=True)
                   .values('year', 'month')
                   .annotate(count=Count('id'))
                   .order_by('year', 'month')
        )
        return timeline
    
    def get_category_distribution(self, queryset):
        """Generate category distribution data."""
        # This is a simplified example - adjust based on your category structure
        categories = {}
        for paper in queryset.only('categories').iterator(chunk_size=1000):
            if paper.categories:
                for cat in paper.categories.split(';'):
                    cat = cat.strip()
                    if cat:
                        categories[cat] = categories.get(cat, 0) + 1
        
        return [{'category': k, 'count': v} 
               for k, v in sorted(categories.items(), key=lambda x: -x[1])[:10]]
    
    def get_serialized_paper(self, paper):
        """Convert a Paper model instance to a serializable dict."""
        return {
            'id': paper.arxiv_id,
            'title': paper.title,
            'authors': paper.authors,
            'abstract': paper.abstract,
            'published': paper.published_date.isoformat() if paper.published_date else None,
            'cluster': paper.cluster,
            'cluster_label': f'Cluster {paper.cluster}' if paper.cluster is not None else 'Unclustered',
            'url': paper.url,
            'categories': paper.categories,
            'Month': paper.month,
            'Year': paper.year,
            '_original': {
                'Month': paper.month,
                'Year': paper.year,
                'published': paper.published_date.isoformat() if paper.published_date else None,
                'categories': paper.categories,
                'authors': paper.authors,
                'title': paper.title,
                'abstract': paper.abstract,
                'url': paper.url,
                'cluster': paper.cluster
            }
        }
    
    @method_decorator(cache_page(60 * 5))  # Cache for 5 minutes
    @method_decorator(vary_on_cookie)
    def get(self, request):
        """
        Get paginated papers with optional filtering.
        
        Query Parameters:
            page: Page number (default: 1)
            page_size: Number of items per page (default: 20, max: 100)
            search: Optional search query
            cluster: Optional cluster ID to filter by
            year: Optional year to filter by
            month: Optional month to filter by
        """
        try:
            # Get base queryset with filters applied
            queryset = self.get_queryset()
            
            # Get paginated results
            paginator = self.pagination_class()
            page = paginator.paginate_queryset(queryset, request)
            
            if page is not None:
                # Serialize the page of papers
                papers = [self.get_serialized_paper(paper) for paper in page]
                
                # Get cluster stats (cached)
                cluster_stats = self.get_cluster_stats()
                
                # Get additional statistics
                timeline_data = self.get_publication_timeline(queryset)
                category_data = self.get_category_distribution(queryset)
                
                # Build response data
                response_data = {
                    'papers': papers,
                    'clustering': {
                        'available': True,
                        'stats': {
                            'total_papers': queryset.count(),
                            'num_clusters': len(set(queryset.exclude(cluster__isnull=True)
                                                 .values_list('cluster', flat=True))),
                            'papers_per_cluster': cluster_stats
                        },
                        'source_file': 'database',
                        'last_modified': Paper.objects.latest('updated_at').updated_at.timestamp()
                    },
                    'timeline': timeline_data,
                    'categories': category_data
                }
                
                # Add pagination info
                response = paginator.get_paginated_response(response_data)
                return response
            
            # If pagination is not used (shouldn't happen with our settings)
            papers = [self.get_serialized_paper(paper) for paper in queryset]
            return Response({
                'pagination': {
                    'current_page': 1,
                    'page_size': len(papers),
                    'total_pages': 1,
                    'total_items': len(papers),
                    'has_next': False,
                    'has_previous': False
                },
                'results': {
                    'papers': papers,
                    'clustering': {
                        'available': True,
                        'stats': {},
                        'source_file': 'database',
                        'last_modified': Paper.objects.latest('updated_at').updated_at.timestamp()
                    },
                    'timeline': self.get_publication_timeline(queryset),
                    'categories': self.get_category_distribution(queryset)
                }
            })
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Failed to retrieve papers: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class StandardResultsSetPagination(PageNumberPagination):
    """Custom pagination class with configurable page size."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'pagination': {
                'current_page': self.page.number,
                'page_size': self.page.paginator.per_page,
                'total_pages': self.page.paginator.num_pages,
                'total_items': self.page.paginator.count,
                'has_next': self.page.has_next(),
                'has_previous': self.page.has_previous(),
            },
            'results': data
        })


class SearchTermsAPIView(APIView):
    """API endpoint for managing search terms."""
    @method_decorator(csrf_exempt, name='dispatch')
    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)
    
    def get_config_path(self):
        """Get the path to the config file."""
        return Path(settings.BASE_DIR).parent / 'backend' / 'config.json'
    
    @method_decorator(cache_page(60 * 15))  # Cache for 15 minutes
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
        except FileNotFoundError:
            # Return default values if config file doesn't exist
            return Response({
                'must_include': [],
                'optional_keywords': []
            })
        except Exception as e:
            return Response(
                {'error': f'Failed to read config file: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def clear(self, request):
        """
        Clear the current search terms and reset the config.
        This endpoint is called before setting new search terms to ensure a clean state.
        """
        config_path = self.get_config_path()
        try:
            # Create or reset the config file with empty values
            with open(config_path, 'w') as f:
                json.dump({
                    'must_include': [],
                    'optional_keywords': []
                }, f, indent=4)
            
            return Response({
                'message': 'Search terms cleared successfully',
                'must_include': [],
                'optional_keywords': []
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to clear search terms: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request):
        """
        Update search terms in config.json and trigger data processing.
        Expected request data: {
            "search_terms": ["term1", "term2", ...],
            "keywords": ["keyword1", "keyword2", ...]  # optional
        }
        """
        config_path = self.get_config_path()
        search_terms = request.data.get('search_terms', [])
        keywords = request.data.get('keywords', [])
        
        try:
            # Read current config or create a new one if it doesn't exist
            if config_path.exists():
                with open(config_path, 'r') as f:
                    config = json.load(f)
            else:
                config = {}
            
            # Update must_include terms if provided
            if search_terms:
                config['must_include'] = search_terms
                
            # Update optional keywords if provided
            if keywords:
                config['optional_keywords'] = keywords if isinstance(keywords, list) else [keywords]
            
            # Save updated config
            with open(config_path, 'w') as f:
                json.dump(config, f, indent=4)
            
            # Define the path to the script
            script_path = Path(settings.BASE_DIR).parent / 'backend' / 'scripts' / 'arxiv_kmeans_sbert_umap.py'
            
            # Run the arxiv extractor script
            try:
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
                
                return Response({
                    'message': 'Search terms updated and processing completed successfully',
                    'output': result.stdout
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
                        
                        # Extract Month and Year from the row if available
                        month = row.get('Month', row.get('month', None))
                        year = row.get('Year', row.get('year', None))
                        
                        # If Month/Year not directly available, try to extract from published date
                        published_date = row.get('Published', row.get('published', row.get('Date', '')))
                        if pd.notna(published_date) and (month is None or year is None):
                            try:
                                from datetime import datetime
                                date_obj = datetime.strptime(str(published_date), '%Y-%m-%d')
                                if month is None:
                                    month = date_obj.strftime('%B')  # Full month name
                                if year is None:
                                    year = date_obj.year
                            except (ValueError, AttributeError):
                                pass
                        
                        paper = {
                            'id': paper_id,
                            'title': title,
                            'authors': row.get('Authors', row.get('authors', 'Unknown Author')),
                            'abstract': abstract,
                            'published': published_date,
                            'cluster': int(row.get('Cluster', row.get('cluster', -1))),
                            'cluster_label': f"Cluster {row.get('Cluster', row.get('cluster', '?'))}",
                            'url': f"https://arxiv.org/abs/{paper_id}" if 'id' in row or 'ID' in row else '#',
                            'categories': row.get('Categories', row.get('categories', '')),
                            'Month': month,
                            'Year': year,
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
