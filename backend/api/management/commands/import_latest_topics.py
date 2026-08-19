import csv
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from api.models import Paper, PaperTopic, SearchJob, Topic


class Command(BaseCommand):
    help = 'Import the latest topic CSV into SearchJob, Topic, Paper, and PaperTopic tables'

    def handle(self, *args, **options):
        out_dir = Path(settings.BASE_DIR).parent / 'backend' / 'scripts' / 'out'
        files = sorted(
            list(out_dir.glob('arxiv_with_authors_*.csv')),
            key=lambda path: path.stat().st_mtime,
            reverse=True,
        )
        if not files:
            raise CommandError(f'No topic CSV files found in {out_dir}')

        file_path = files[0]
        with file_path.open('r', encoding='utf-8', newline='') as csvfile:
            rows = list(csv.DictReader(csvfile))
        if not rows:
            raise CommandError(f'{file_path} is empty')

        with transaction.atomic():
            job = SearchJob.objects.create(
                query='Imported latest topic CSV',
                status='completed',
                papers_scanned=len(rows),
                papers_matched=len(rows),
                topics_found=len({row.get('Cluster', '-1') for row in rows if row.get('Cluster') != '-1'}),
                outliers_found=sum(1 for row in rows if row.get('Cluster') == '-1'),
                metadata={'source_file': file_path.name},
            )

            topic_map = {}
            for row in rows:
                cluster_id = int(float(row.get('Cluster') or -1))
                if cluster_id in topic_map:
                    continue
                topic_map[cluster_id] = Topic.objects.create(
                    search_job=job,
                    cluster_id=cluster_id,
                    label=(row.get('Topic Label') or f'Cluster {cluster_id}').strip(),
                    keywords=(row.get('Topic Keywords') or '').strip(),
                    paper_count=sum(1 for item in rows if int(float(item.get('Cluster') or -1)) == cluster_id),
                    is_outlier=cluster_id == -1,
                )

            for index, row in enumerate(rows):
                title = (row.get('Title') or 'Untitled').strip()
                paper_id = row.get('id') or row.get('ID') or f'imported-{job.id}-{index}'
                published_date = None
                year = int(float(row['Year'])) if row.get('Year') else None
                month = (row.get('Month') or '').strip() or None
                if year and month:
                    try:
                        published_date = datetime.strptime(f'{month} {year}', '%B %Y').date()
                    except ValueError:
                        published_date = None

                cluster_id = int(float(row.get('Cluster') or -1))
                topic = topic_map[cluster_id]
                paper, _ = Paper.objects.update_or_create(
                    arxiv_id=str(paper_id)[:100],
                    defaults={
                        'title': title,
                        'abstract': (row.get('Abstract') or '').strip(),
                        'authors': (row.get('Authors') or '').strip(),
                        'published_date': published_date,
                        'year': year,
                        'month': month,
                        'cluster': cluster_id,
                        'url': row.get('url') or '#',
                        'metadata': {
                            'topic_label': topic.label,
                            'topic_keywords': topic.keywords,
                            'source_file': file_path.name,
                        },
                    },
                )
                confidence = row.get('Topic Confidence')
                PaperTopic.objects.update_or_create(
                    paper=paper,
                    search_job=job,
                    defaults={
                        'topic': topic,
                        'confidence': float(confidence) if confidence else None,
                    },
                )

        self.stdout.write(self.style.SUCCESS(
            f'Imported {len(rows)} papers, {len(topic_map)} topics into SearchJob {job.id}'
        ))
