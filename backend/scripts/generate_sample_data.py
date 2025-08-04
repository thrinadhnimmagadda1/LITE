"""
Script to generate sample data for the LITE backend.
This creates a CSV file with sample paper data that matches the expected format.
"""
import os
import csv
from datetime import datetime
from pathlib import Path

# Define the output directory
OUTPUT_DIR = Path(__file__).parent / 'out'
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Sample data for papers
sample_papers = [
    {
        'id': '2103.00001',
        'Title': 'A Survey on Deep Learning for Natural Language Processing',
        'Abstract': 'Deep learning has revolutionized the field of natural language processing in recent years.',
        'Authors': 'John Smith, Jane Doe',
        'Published': '2023-01-15',
        'Cluster': '0',
        'X': '0.5',
        'Y': '0.5'
    },
    {
        'id': '2103.00002',
        'Title': 'Transformers for Natural Language Processing',
        'Abstract': 'This paper explores the use of transformer models in various NLP tasks.',
        'Authors': 'Alice Johnson, Bob Wilson',
        'Published': '2023-02-20',
        'Cluster': '1',
        'X': '0.6',
        'Y': '0.4'
    },
    {
        'id': '2103.00003',
        'Title': 'Advances in Computer Vision with Deep Learning',
        'Abstract': 'Recent advancements in computer vision using deep learning techniques.',
        'Authors': 'Charlie Brown, David Lee',
        'Published': '2023-03-10',
        'Cluster': '2',
        'X': '0.7',
        'Y': '0.3'
    },
    {
        'id': '2103.00004',
        'Title': 'Reinforcement Learning: Theory and Applications',
        'Abstract': 'A comprehensive overview of reinforcement learning algorithms and their applications.',
        'Authors': 'Eva Green, Frank White',
        'Published': '2023-01-05',
        'Cluster': '0',
        'X': '0.55',
        'Y': '0.45'
    },
    {
        'id': '2103.00005',
        'Title': 'Neural Architecture Search: A Survey',
        'Abstract': 'Survey of methods for automating the design of neural network architectures.',
        'Authors': 'Grace Hopper, Ada Lovelace',
        'Published': '2023-02-15',
        'Cluster': '1',
        'X': '0.65',
        'Y': '0.35'
    }
]

def generate_sample_csv():
    """Generate a sample CSV file with paper data."""
    # Create a timestamp for the filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = OUTPUT_DIR / f'sample_papers_{timestamp}.csv'
    
    # Write the data to the CSV file
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['id', 'Title', 'Abstract', 'Authors', 'Published', 'Cluster', 'X', 'Y']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        for paper in sample_papers:
            writer.writerow(paper)
    
    print(f"Generated sample data file: {filename}")
    return filename

if __name__ == "__main__":
    csv_file = generate_sample_csv()
    print(f"Sample data has been generated at: {csv_file}")
    print("You can now use the /api/papers/ endpoint to view the sample data.")
