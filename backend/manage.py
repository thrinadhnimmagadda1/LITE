#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def _configure_local_caches() -> None:
    """Ensure ML/matplotlib caches are writable within repo."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    cache_root = os.path.join(base_dir, ".cache")
    mpl_cache = os.path.join(cache_root, "matplotlib")
    hf_cache = os.path.join(cache_root, "huggingface")

    os.makedirs(mpl_cache, exist_ok=True)
    os.makedirs(hf_cache, exist_ok=True)

    os.environ.setdefault("MPLCONFIGDIR", mpl_cache)
    os.environ.setdefault("HF_HOME", hf_cache)
    os.environ.setdefault("TRANSFORMERS_CACHE", hf_cache)
    os.environ.setdefault("HF_HUB_CACHE", hf_cache)
    os.environ.setdefault("HF_HUB_DISABLE_XET", "1")


def main():
    """Run administrative tasks."""
    _configure_local_caches()
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
