import os
import csv
import json
from datetime import datetime
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.conf import settings
from api.models import Paper, PaperImportLog

class Command(BaseCommand):
    help = 'Import papers from CSV files into the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            help='Path to the CSV file to import',
        )
        parser.add_argument(
            '--directory',
            type=str,
            help='Directory containing CSV files to import',
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing papers before import',
        )

    def handle(self, *args, **options):
        files_to_import = []
        
        # Handle file or directory input
        if options['file']:
            if not os.path.isfile(options['file']):
                raise CommandError(f'File not found: {options["file"]}')
            files_to_import.append(Path(options['file']))
        elif options['directory']:
            if not os.path.isdir(options['directory']):
                raise CommandError(f'Directory not found: {options["directory"]}')
            files_to_import.extend(Path(options['directory']).glob('*.csv'))
        else:
            # Default to checking common locations
            possible_dirs = [
                Path(settings.BASE_DIR).parent / 'backend' / 'scripts' / 'out',
                Path(settings.BASE_DIR).parent / 'backend' / 'out',
                Path(settings.BASE_DIR).parent / 'out',
                Path(settings.BASE_DIR) / 'out',
                Path(settings.BASE_DIR).parent / 'backend' / 'scripts' / 'output'
            ]
            
            for dir_path in possible_dirs:
                if dir_path.exists() and dir_path.is_dir():
                    files_to_import.extend(dir_path.glob('*.csv'))
                    if files_to_import:
                        break
        
        if not files_to_import:
            raise CommandError('No CSV files found to import')
        
        self.stdout.write(f'Found {len(files_to_import)} CSV file(s) to import')
        
        # Clear existing data if requested
        if options['clear']:
            self.stdout.write('Clearing existing papers...')
            Paper.objects.all().delete()
        
        # Process each file
        for file_path in files_to_import:
            self.stdout.write(f'\nProcessing file: {file_path}')
            self.import_file(file_path)
    
    def import_file(self, file_path):
        """Import papers from a single CSV file."""
        import_log = PaperImportLog(
            filename=file_path.name,
            row_count=0,
            status='processing'
        )
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                rows = list(reader)
                total_rows = len(rows)
                
                with transaction.atomic():
                    for i, row in enumerate(rows, 1):
                        try:
                            self.import_paper(row)
                            import_log.row_count += 1
                            
                            # Log progress
                            if i % 100 == 0 or i == total_rows:
                                self.stdout.write(f'  Processed {i}/{total_rows} rows...', ending='\r')
                                
                        except Exception as e:
                            self.stderr.write(f'\nError processing row {i}: {e}')
                            continue
                    
                    import_log.status = 'success' if import_log.row_count > 0 else 'partial'
                    import_log.save()
                    
                    self.stdout.write(f'\nSuccessfully imported {import_log.row_count} papers from {file_path.name}')
                    
        except Exception as e:
            import_log.status = 'failed'
            import_log.error_message = str(e)
            import_log.save()
            self.stderr.write(f'\nError importing file {file_path}: {e}')
            raise CommandError(f'Failed to import {file_path}: {e}')
    
    def import_paper(self, row):
        """Import a single paper from a CSV row."""
        # Extract paper ID
        paper_id = row.get('id') or row.get('ID', '').strip()
        if not paper_id:
            raise ValueError('Missing paper ID')
        
        # Parse published date
        published_date = None
        date_str = row.get('Published') or row.get('published') or row.get('Date', '')
        if date_str:
            try:
                # Handle different date formats
                for fmt in ('%Y-%m-%d', '%Y/%m/%d', '%d-%m-%Y', '%d/%m/%Y'):
                    try:
                        published_date = datetime.strptime(date_str.split()[0], fmt).date()
                        break
                    except ValueError:
                        continue
            except (ValueError, AttributeError):
                pass
        
        # Extract year and month
        year = None
        month = None
        
        # Try to get from explicit fields first
        if 'Year' in row and row['Year']:
            try:
                year = int(float(row['Year']))
            except (ValueError, TypeError):
                pass
                
        if 'Month' in row and row['Month']:
            month = str(row['Month']).strip()
        
        # Fall back to published date
        if published_date and not (year and month):
            year = published_date.year
            month = published_date.strftime('%B')
        
        # Prepare metadata
        metadata = {k: v for k, v in row.items() if v and k not in [
            'id', 'ID', 'Title', 'title', 'Abstract', 'abstract', 
            'Authors', 'authors', 'Published', 'published', 'Date',
            'Cluster', 'cluster', 'Categories', 'categories', 'Year', 'year',
            'Month', 'month', 'url', 'URL'
        ]}
        
        # Create or update paper
        paper, created = Paper.objects.update_or_create(
            arxiv_id=paper_id,
            defaults={
                'title': row.get('Title') or row.get('title', '').strip(),
                'abstract': (row.get('Abstract') or row.get('abstract', '')).strip(),
                'authors': (row.get('Authors') or row.get('authors', '')).strip(),
                'published_date': published_date,
                'year': year,
                'month': month,
                'categories': (row.get('Categories') or row.get('categories', '')).strip(),
                'cluster': int(float(row.get('Cluster') or row.get('cluster') or -1)),
                'url': row.get('url') or f'https://arxiv.org/abs/{paper_id}',
                'metadata': metadata
            }
        )
        
        return paper
