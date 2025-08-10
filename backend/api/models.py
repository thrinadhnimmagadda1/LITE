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
