# Literature Classification Project

Files for processing and classifying academic papers with multiple components for scraping, abstract processing, and classification.

## Project Structure

- **`abstract_adding/`** - Tools for abstract extraction and processing
  - Paper data management and abstract retrieval tools
  - JSON storage for paper metadata
  
- **`cat_classification/`** - Category classification system
  - Includes data processing and embedding generation
  - See [cat_classification/README.md](cat_classification/README.md) for details

- **`classification/`** - General classification utilities
  - Classification model implementations and utilities

- **`data/`** - Project datasets and processed data

- **`scraping/`** - Web scraping utilities
  - Tools for collecting paper information

- **`utils/`** - Shared utility functions
  - Common functionality used across different project components

## Setup

### Environment Setup

The project includes two methods for environment setup:

1. Using Conda (recommended):
```bash
conda env create -f environment.yml
```

2. Using pip:
```bash
pip install -r requirements.txt
```

## Project Components

### Abstract Processing

Located in `abstract_adding/`, this component handles:
- Automatic abstract retrieval
- Paper metadata management
- Data storage in JSON format

For more details, see [abstract_adding/README.md](abstract_adding/README.md)

### Category Classification

Located in `cat_classification/`, this component includes:
- Data preprocessing pipelines
- Embedding generation
- Classification models

### Data Collection

The `scraping/` directory contains tools for:
- Web scraping academic papers
- Data collection automation
- Source data processing
