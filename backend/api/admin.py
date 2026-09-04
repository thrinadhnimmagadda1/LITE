from django.contrib import admin
from .models import Paper, PaperChunk, PaperDocument, PaperImportLog, PaperTopic, SearchJob, Topic


@admin.register(Paper)
class PaperAdmin(admin.ModelAdmin):
    list_display = ('arxiv_id', 'title', 'year', 'month', 'cluster', 'updated_at')
    search_fields = ('arxiv_id', 'title', 'abstract', 'authors')
    list_filter = ('year', 'month', 'cluster')


@admin.register(SearchJob)
class SearchJobAdmin(admin.ModelAdmin):
    list_display = ('query', 'status', 'papers_matched', 'topics_found', 'outliers_found', 'processing_seconds', 'created_at')
    search_fields = ('query', 'optional_keywords')
    list_filter = ('status', 'created_at')


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ('label', 'search_job', 'cluster_id', 'paper_count', 'is_outlier')
    search_fields = ('label', 'keywords')
    list_filter = ('is_outlier',)


@admin.register(PaperTopic)
class PaperTopicAdmin(admin.ModelAdmin):
    list_display = ('paper', 'topic', 'search_job', 'confidence')
    list_filter = ('search_job', 'topic')


@admin.register(PaperDocument)
class PaperDocumentAdmin(admin.ModelAdmin):
    list_display = ('paper', 'status', 'source_url', 'extracted_at', 'updated_at')
    search_fields = ('paper__arxiv_id', 'paper__title', 'source_url')
    list_filter = ('status', 'extracted_at')


@admin.register(PaperChunk)
class PaperChunkAdmin(admin.ModelAdmin):
    list_display = ('paper', 'document', 'chunk_index', 'token_estimate')
    search_fields = ('paper__arxiv_id', 'paper__title', 'text')


@admin.register(PaperImportLog)
class PaperImportLogAdmin(admin.ModelAdmin):
    list_display = ('filename', 'row_count', 'status', 'imported_at')
    list_filter = ('status', 'imported_at')
