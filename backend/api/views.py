import json
import os
import re
import subprocess
import sys
from io import BytesIO
from datetime import datetime, timedelta
from pathlib import Path
from django.conf import settings
from django.core.cache import cache
from django.db.models import Count, Q
from django.utils import timezone
from django.views.decorators.cache import cache_page
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views.decorators.vary import vary_on_cookie
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from .models import Paper, PaperChunk, PaperDocument, PaperImportLog, PaperTopic, SearchJob


def get_embedding_model():
    from sentence_transformers import SentenceTransformer
    model_name = os.environ.get("LITE_RAG_EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    return SentenceTransformer(model_name)


def normalize_arxiv_pdf_url(paper):
    if paper.url and paper.url.startswith("http") and "arxiv.org" in paper.url:
        return paper.url.replace("/abs/", "/pdf/").removesuffix(".pdf") + ".pdf"
    if paper.arxiv_id and not paper.arxiv_id.startswith("imported-"):
        return f"https://arxiv.org/pdf/{paper.arxiv_id}.pdf"
    return ""


def extract_pdf_text(pdf_bytes):
    from pypdf import PdfReader
    reader = PdfReader(BytesIO(pdf_bytes))
    pages = []
    for page in reader.pages:
        pages.append(page.extract_text() or "")
    return "\n\n".join(pages).strip()


def chunk_text(text, max_words=220, overlap=45):
    words = re.sub(r"\s+", " ", text).strip().split()
    if not words:
        return []
    chunks = []
    step = max(1, max_words - overlap)
    for start in range(0, len(words), step):
        chunk = " ".join(words[start:start + max_words]).strip()
        if len(chunk) > 120:
            chunks.append(chunk)
    return chunks


def cosine_similarity(vec_a, vec_b):
    import math
    if not vec_a or not vec_b:
        return 0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if not norm_a or not norm_b:
        return 0
    return dot / (norm_a * norm_b)


def build_grounded_answer(question, chunks, paper):
    context = "\n\n".join(f"[Chunk {i + 1}] {chunk.text}" for i, chunk in enumerate(chunks))
    prompt = (
        "You are a research-paper assistant. Answer only from the provided paper context. "
        "If the context does not contain the answer, say that the selected paper text does not provide enough information.\n\n"
        f"Paper title: {paper.title}\n\n"
        f"Context:\n{context}\n\n"
        f"Question: {question}\n\n"
        "Answer:"
    )
    ollama_url = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/generate")
    ollama_model = os.environ.get("OLLAMA_MODEL", "llama3.2:3b")
    try:
        import requests
        response = requests.post(
            ollama_url,
            json={"model": ollama_model, "prompt": prompt, "stream": False},
            timeout=60,
        )
        response.raise_for_status()
        answer = response.json().get("response", "").strip()
        if answer:
            return answer, "ollama"
    except Exception:
        pass

    fallback = chunks[0].text[:900] if chunks else paper.abstract[:900]
    return (
        "Local Llama is not available yet, so here is the most relevant selected-paper context I found:\n\n"
        f"{fallback}"
    ), "retrieval_fallback"


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
    max_page_size = 1000
    
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
    
    def get_total_available_papers(self):
        """Get the total number of papers available from ArXiv extraction logs."""
        try:
            import os
            import glob
            from pathlib import Path
            
            # Look for log files in the scripts/logs directory
            logs_dir = Path(settings.BASE_DIR) / 'scripts' / 'logs'
            print(f"Looking for logs in: {logs_dir}")
            print(f"Logs dir exists: {logs_dir.exists()}")
            
            if not logs_dir.exists():
                print(f"Logs directory does not exist: {logs_dir}")
                return None
            
            # Find the most recent log file
            log_files = glob.glob(str(logs_dir / 'arxiv_extractor_*.log'))
            print(f"Found log files: {log_files}")
            
            if not log_files:
                print("No log files found")
                return None
            
            # Sort by modification time and get the most recent
            latest_log = max(log_files, key=os.path.getmtime)
            print(f"Latest log file: {latest_log}")
            
            total_available = 0
            with open(latest_log, 'r') as f:
                for line in f:
                    if 'Got first page:' in line and 'total results' in line:
                        print(f"Found line: {line.strip()}")
                        # Extract the total number from lines like:
                        # "Got first page: 100 of 12847 total results"
                        try:
                            parts = line.split('of')
                            if len(parts) == 2:
                                total_part = parts[1].strip().split()[0]
                                total_available += int(total_part)
                                print(f"Added {total_part} to total, now: {total_available}")
                        except (ValueError, IndexError) as e:
                            print(f"Error parsing line: {e}")
                            continue
            
            print(f"Final total available: {total_available}")
            return total_available if total_available > 0 else None
            
        except Exception as e:
            print(f"Error reading total available papers from logs: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def get_all_papers_for_clustering(self):
        """Get all papers without pagination for clustering visualization."""
        try:
            # Get all papers without pagination
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
            
            # Return all papers (not paginated)
            papers = [self.get_serialized_paper(paper) for paper in queryset]
            return papers
            
        except Exception as e:
            print(f"Error getting all papers for clustering: {e}")
            return []
    
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
            # Check if this is a request for all papers (clustering)
            is_clustering_request = 'all-for-clustering' in request.path
            
            if is_clustering_request:
                # Return all papers without pagination for clustering
                all_papers = self.get_all_papers_for_clustering()
                return Response({
                    'papers': all_papers,
                    'total_count': len(all_papers),
                    'is_clustering_data': True
                })
            
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
                
                # Get total available papers from ArXiv extraction logs
                total_available = self.get_total_available_papers()
                
                # Build response data
                response_data = {
                    'papers': papers,
                    'clustering': {
                        'available': True,
                        'stats': {
                            'total_papers': queryset.count(),
                            'total_available_from_arxiv': total_available,
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
            
            # Get total available papers from ArXiv extraction logs
            total_available = self.get_total_available_papers()
            
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
                        'stats': {
                            'total_available_from_arxiv': total_available
                        },
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
    max_page_size = 1000

    def get_paginated_response(self, data):
        # Get total available papers from ArXiv extraction logs if available
        total_available = None
        if hasattr(data, 'get') and data.get('clustering', {}).get('stats', {}).get('total_available_from_arxiv'):
            total_available = data['clustering']['stats']['total_available_from_arxiv']
        
        return Response({
            'pagination': {
                'current_page': self.page.number,
                'page_size': self.page.paginator.per_page,
                'total_pages': self.page.paginator.num_pages,
                'total_items': self.page.paginator.count,
                'total_available_from_arxiv': total_available,
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
            scripts_dir = script_path.parent
            cache_dir = Path(settings.BASE_DIR) / '.cache'
            mpl_cache_dir = cache_dir / 'matplotlib'
            hf_cache_dir = cache_dir / 'huggingface'

            # Ensure local cache directories exist (avoid home dir permissions)
            os.makedirs(mpl_cache_dir, exist_ok=True)
            os.makedirs(hf_cache_dir, exist_ok=True)
            
            # Optionally skip heavy processing on low-memory environments
            if os.environ.get("LITE_DISABLE_PROCESSING", "0") == "1":
                return Response({
                    'message': 'Search terms updated (processing disabled by LITE_DISABLE_PROCESSING).'
                })

            # Run the arxiv extractor script asynchronously so the request
            # returns immediately and the frontend can poll for results.
            try:
                env = os.environ.copy()
                env.setdefault('MPLCONFIGDIR', str(mpl_cache_dir))
                env.setdefault('HF_HOME', str(hf_cache_dir))
                env.setdefault('TRANSFORMERS_CACHE', str(hf_cache_dir))
                env.setdefault('HF_HUB_CACHE', str(hf_cache_dir))
                env.setdefault('HF_HUB_DISABLE_XET', '1')
                env.setdefault('ARXIV_EXTRACTOR_BASE_DIR', str(scripts_dir))
                env.setdefault('KMP_USE_SHM', '0')
                env.setdefault('OMP_NUM_THREADS', '1')
                env.setdefault('NUMBA_NUM_THREADS', '1')
                env.setdefault('NUMBA_THREADING_LAYER', 'workqueue')
                env.setdefault('PYTHONUNBUFFERED', '1')

                # Default to low-memory mode on Render unless explicitly overridden
                if env.get('RENDER') or env.get('RENDER_SERVICE_ID'):
                    env.setdefault('LITE_DISABLE_EMBEDDINGS', '1')
                    env.setdefault('LITE_MAX_PAPERS', '50')
                    env.setdefault('LITE_DISABLE_PROCESSING', '1')

                # Launch the script in the background (non-blocking)
                subprocess.Popen(
                    [sys.executable, str(script_path)],
                    cwd=str(scripts_dir),
                    env=env,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )

                return Response({
                    'message': 'Search started. Processing papers in background — poll /api/papers/ for results.',
                    'status': 'processing'
                })

            except Exception as e:
                return Response(
                    {
                        'message': 'Config updated but failed to start background script',
                        'error': str(e)
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            return Response(
                {'error': f'Failed to update config: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PaperRAGPrepareAPIView(APIView):
    """Prepare one paper for full-document RAG using lazy PDF processing."""

    @method_decorator(csrf_exempt)
    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)

    def post(self, request, paper_id):
        try:
            paper = Paper.objects.get(arxiv_id=paper_id)
        except Paper.DoesNotExist:
            return Response({'error': 'Paper not found'}, status=status.HTTP_404_NOT_FOUND)

        document, _ = PaperDocument.objects.get_or_create(
            paper=paper,
            defaults={'source_url': normalize_arxiv_pdf_url(paper)}
        )
        if document.status in ('ready', 'abstract_only') and document.chunks.exists():
            return Response({
                'status': document.status,
                'paper_id': paper.arxiv_id,
                'chunks': document.chunks.count(),
                'source_url': document.source_url,
                'cached': True,
            })

        source_url = normalize_arxiv_pdf_url(paper)
        document.source_url = source_url
        full_text = ""
        source = "abstract"

        if source_url:
            try:
                import requests
                response = requests.get(source_url, timeout=30)
                response.raise_for_status()
                full_text = extract_pdf_text(response.content)
                source = "pdf"
            except Exception as exc:
                document.error_message = f"PDF extraction failed, using abstract fallback: {exc}"

        if not full_text:
            full_text = f"{paper.title}\n\n{paper.abstract}".strip()
            document.status = "abstract_only"
        else:
            document.status = "ready"

        chunks = chunk_text(full_text)
        if not chunks:
            return Response({'error': 'No usable paper text found'}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        model = get_embedding_model()
        embeddings = model.encode(chunks, show_progress_bar=False, convert_to_numpy=True, normalize_embeddings=True)

        document.full_text = full_text
        document.extracted_at = timezone.now()
        document.metadata = {
            'source': source,
            'chunk_count': len(chunks),
            'embedding_model': os.environ.get("LITE_RAG_EMBEDDING_MODEL", "all-MiniLM-L6-v2"),
        }
        document.save()
        document.chunks.all().delete()

        PaperChunk.objects.bulk_create([
            PaperChunk(
                paper=paper,
                document=document,
                chunk_index=index,
                text=text,
                embedding=embeddings[index].tolist(),
                token_estimate=max(1, len(text.split())),
            )
            for index, text in enumerate(chunks)
        ])

        return Response({
            'status': document.status,
            'paper_id': paper.arxiv_id,
            'chunks': len(chunks),
            'source_url': source_url,
            'cached': False,
        })


class PaperRAGAskAPIView(APIView):
    """Answer questions using chunks from only the selected paper."""

    @method_decorator(csrf_exempt)
    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)

    def post(self, request, paper_id):
        question = str(request.data.get('question', '')).strip()
        if not question:
            return Response({'error': 'Question is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            paper = Paper.objects.get(arxiv_id=paper_id)
        except Paper.DoesNotExist:
            return Response({'error': 'Paper not found'}, status=status.HTTP_404_NOT_FOUND)

        document = getattr(paper, 'document', None)
        if not document or not document.chunks.exists():
            prepare_response = PaperRAGPrepareAPIView().post(request, paper_id)
            if prepare_response.status_code >= 400:
                return prepare_response
            document = PaperDocument.objects.get(paper=paper)

        chunks = list(document.chunks.all())
        model = get_embedding_model()
        question_embedding = model.encode([question], show_progress_bar=False, convert_to_numpy=True, normalize_embeddings=True)[0].tolist()
        ranked_chunks = sorted(
            chunks,
            key=lambda chunk: cosine_similarity(question_embedding, chunk.embedding),
            reverse=True,
        )[:4]
        answer, model_source = build_grounded_answer(question, ranked_chunks, paper)

        return Response({
            'paper_id': paper.arxiv_id,
            'question': question,
            'answer': answer,
            'model_source': model_source,
            'document_status': document.status,
            'chunks_used': [
                {
                    'chunk_index': chunk.chunk_index,
                    'preview': chunk.text[:240],
                }
                for chunk in ranked_chunks
            ],
        })


class PapersAPIView(APIView):
    def get_database_papers_data(self):
        latest_job = SearchJob.objects.filter(status='completed').order_by('-created_at').first()
        if not latest_job:
            return []

        assignments = (
            PaperTopic.objects
            .filter(search_job=latest_job)
            .select_related('paper', 'topic')
            .order_by('-paper__published_date', 'paper__title')
        )
        papers = []
        for assignment in assignments:
            paper = assignment.paper
            topic = assignment.topic
            papers.append({
                'id': paper.arxiv_id,
                'title': paper.title,
                'authors': paper.authors,
                'abstract': paper.abstract,
                'published': paper.published_date.isoformat() if paper.published_date else '',
                'cluster': topic.cluster_id,
                'cluster_label': topic.label,
                'topic_label': topic.label,
                'topic_keywords': topic.keywords,
                'topic_confidence': assignment.confidence,
                'url': paper.url,
                'categories': paper.categories,
                'Month': paper.month,
                'Year': paper.year,
                '_original': {
                    'source': 'database',
                    'search_job_id': latest_job.id,
                    'topic_id': topic.id,
                    'topic_keywords': topic.keywords,
                    'topic_confidence': assignment.confidence,
                }
            })
        return papers

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
        database_papers = self.get_database_papers_data()
        if database_papers:
            return database_papers, None

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
                summary_files = list(output_dir.glob('*topics*.csv')) + list(output_dir.glob('*kmeans*.csv'))
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
                        
                        cluster_value = row.get('Cluster', row.get('cluster', -1))
                        topic_label = row.get('Topic Label', row.get('topic_label', None))
                        topic_keywords = row.get('Topic Keywords', row.get('topic_keywords', ''))
                        topic_confidence = row.get('Topic Confidence', row.get('topic_confidence', None))

                        paper = {
                            'id': paper_id,
                            'title': title,
                            'authors': row.get('Authors', row.get('authors', 'Unknown Author')),
                            'abstract': abstract,
                            'published': published_date,
                            'cluster': int(float(cluster_value)),
                            'cluster_label': str(topic_label).strip() if topic_label and pd.notna(topic_label) else f"Cluster {cluster_value}",
                            'topic_label': str(topic_label).strip() if topic_label and pd.notna(topic_label) else f"Cluster {cluster_value}",
                            'topic_keywords': str(topic_keywords).strip() if topic_keywords and pd.notna(topic_keywords) else '',
                            'topic_confidence': float(topic_confidence) if topic_confidence and pd.notna(topic_confidence) else None,
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
    
    def get_total_available_papers(self):
        """Get the total number of papers available from ArXiv extraction logs."""
        try:
            import os
            import glob
            from pathlib import Path
            
            # Look for log files in the scripts/logs directory
            logs_dir = Path(settings.BASE_DIR) / 'scripts' / 'logs'
            print(f"Looking for logs in: {logs_dir}")
            print(f"Logs dir exists: {logs_dir.exists()}")
            
            if not logs_dir.exists():
                print(f"Logs directory does not exist: {logs_dir}")
                return None
            
            # Find the most recent log file
            log_files = glob.glob(str(logs_dir / 'arxiv_extractor_*.log'))
            print(f"Found log files: {log_files}")
            
            if not log_files:
                print("No log files found")
                return None
            
            # Sort by modification time and get the most recent
            latest_log = max(log_files, key=os.path.getmtime)
            print(f"Latest log file: {latest_log}")
            
            total_available = 0
            with open(latest_log, 'r') as f:
                for line in f:
                    if 'Got first page:' in line and 'total results' in line:
                        print(f"Found line: {line.strip()}")
                        # Extract the total number from lines like:
                        # "Got first page: 100 of 381 total results"
                        try:
                            parts = line.split('of')
                            if len(parts) == 2:
                                total_part = parts[1].strip().split()[0]
                                total_available = int(total_part)  # Use the latest total found
                                print(f"Found total: {total_part}")
                        except (ValueError, IndexError) as e:
                            print(f"Error parsing line: {e}")
                            continue
            
            print(f"Final total available: {total_available}")
            return total_available if total_available > 0 else None
            
        except Exception as e:
            print(f"Error reading total available papers from logs: {e}")
            import traceback
            traceback.print_exc()
            return None

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
            get_latest_log_info: If true, return latest log info instead of papers
        """
        try:
            # Check if this is a request for latest log info
            if request.query_params.get('get_latest_log_info') == 'true':
                latest_log_total = self.get_total_available_papers()
                return Response({
                    'latest_log_total': latest_log_total,
                    'message': 'Latest log info retrieved successfully'
                })
            
            # Get pagination parameters
            page = int(request.query_params.get('page', 1))
            page_size = min(int(request.query_params.get('page_size', 20)), 100)  # Cap at 100 items per page
            
            # Get all papers data
            papers, error = self.get_papers_data()
            if error and not papers:
                return Response({
                    'pagination': {
                        'current_page': page,
                        'page_size': page_size,
                        'total_pages': 1,
                        'total_items': 0,
                        'has_next': False,
                        'has_previous': False,
                        'total_available_from_arxiv': None
                    },
                    'papers': [],
                    'clustering': {
                        'available': False,
                        'error': error,
                        'stats': {}
                    }
                })
            
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
            
            # Get total available papers from ArXiv logs
            total_available_from_arxiv = self.get_total_available_papers()
            
            # Prepare response data
            response_data = {
                'pagination': {
                    'current_page': page,
                    'page_size': page_size,
                    'total_pages': total_pages,
                    'total_items': total_papers,
                    'has_next': page < total_pages,
                    'has_previous': page > 1,
                    'total_available_from_arxiv': total_available_from_arxiv
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
