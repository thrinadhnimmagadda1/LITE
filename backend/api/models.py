from django.db import models
from django.core.cache import cache
from django.utils import timezone
from django.db.models import JSONField

class Paper(models.Model):
    """Model representing a research paper."""
    arxiv_id = models.CharField(max_length=100, unique=True, db_index=True)
    title = models.TextField()
    abstract = models.TextField(blank=True)
    authors = models.TextField(blank=True)
    published_date = models.DateField(null=True, blank=True, db_index=True)
    year = models.IntegerField(null=True, blank=True, db_index=True)
    month = models.CharField(max_length=20, blank=True, null=True)
    categories = models.TextField(blank=True)
    url = models.URLField(blank=True)
    cluster = models.IntegerField(null=True, blank=True, db_index=True)
    metadata = JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-published_date']
        indexes = [
            models.Index(fields=['cluster', 'published_date']),
            models.Index(fields=['year', 'month']),
        ]

    def __str__(self):
        return self.title

    @classmethod
    def get_papers_count(cls):
        """Get total count of papers with caching."""
        cache_key = 'papers_count'
        count = cache.get(cache_key)
        if count is None:
            count = cls.objects.count()
            cache.set(cache_key, count, 3600)  # Cache for 1 hour
        return count

    @classmethod
    def get_cluster_stats(cls):
        """Get statistics about paper clusters."""
        cache_key = 'cluster_stats'
        stats = cache.get(cache_key)
        if stats is None:
            from django.db.models import Count
            stats = list(cls.objects.values('cluster')
                               .annotate(count=Count('id'))
                               .order_by('-count'))
            cache.set(cache_key, stats, 3600)  # Cache for 1 hour
        return stats


class SearchJob(models.Model):
    """Track one user-triggered literature search and processing run."""
    query = models.TextField()
    optional_keywords = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=[
        ('queued', 'Queued'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ], default='queued', db_index=True)
    papers_scanned = models.IntegerField(default=0)
    papers_matched = models.IntegerField(default=0)
    duplicates_skipped = models.IntegerField(default=0)
    irrelevant_skipped = models.IntegerField(default=0)
    topics_found = models.IntegerField(default=0)
    outliers_found = models.IntegerField(default=0)
    processing_seconds = models.FloatField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    metadata = JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.query} ({self.status})"


class Topic(models.Model):
    """Semantic topic discovered for a search job."""
    search_job = models.ForeignKey(SearchJob, on_delete=models.CASCADE, related_name='topics')
    cluster_id = models.IntegerField(db_index=True)
    label = models.CharField(max_length=160)
    keywords = models.TextField(blank=True)
    paper_count = models.IntegerField(default=0)
    is_outlier = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('search_job', 'cluster_id')
        ordering = ['is_outlier', '-paper_count', 'label']

    def __str__(self):
        return self.label


class PaperTopic(models.Model):
    """Join table between papers and discovered topics."""
    paper = models.ForeignKey(Paper, on_delete=models.CASCADE, related_name='topic_assignments')
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='paper_assignments')
    search_job = models.ForeignKey(SearchJob, on_delete=models.CASCADE, related_name='paper_topics')
    confidence = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('paper', 'search_job')
        indexes = [
            models.Index(fields=['search_job', 'confidence']),
            models.Index(fields=['topic', 'confidence']),
        ]

    def __str__(self):
        return f"{self.paper_id} -> {self.topic_id}"


class PaperDocument(models.Model):
    """Cached full-text document for paper-scoped RAG."""
    paper = models.OneToOneField(Paper, on_delete=models.CASCADE, related_name='document')
    source_url = models.URLField(blank=True)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('ready', 'Ready'),
        ('failed', 'Failed'),
        ('abstract_only', 'Abstract Only'),
    ], default='pending', db_index=True)
    full_text = models.TextField(blank=True)
    error_message = models.TextField(blank=True)
    extracted_at = models.DateTimeField(null=True, blank=True)
    metadata = JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.paper.arxiv_id} ({self.status})"


class PaperChunk(models.Model):
    """A searchable chunk from one selected paper."""
    paper = models.ForeignKey(Paper, on_delete=models.CASCADE, related_name='chunks')
    document = models.ForeignKey(PaperDocument, on_delete=models.CASCADE, related_name='chunks')
    chunk_index = models.IntegerField()
    text = models.TextField()
    embedding = JSONField(default=list, blank=True)
    token_estimate = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('document', 'chunk_index')
        indexes = [
            models.Index(fields=['paper', 'chunk_index']),
        ]

    def __str__(self):
        return f"{self.paper.arxiv_id} chunk {self.chunk_index}"


class PaperImportLog(models.Model):
    """Track CSV imports and updates."""
    filename = models.CharField(max_length=255)
    row_count = models.IntegerField()
    imported_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=[
        ('success', 'Success'),
        ('partial', 'Partial'),
        ('failed', 'Failed')
    ])
    error_message = models.TextField(blank=True)

    def __str__(self):
        return f"{self.filename} - {self.imported_at}"
