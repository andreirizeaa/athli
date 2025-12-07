"""
Structured logging configuration for FormAI Service.
Provides consistent log formatting across API and worker components.
"""

import logging
import sys
from datetime import datetime
from typing import Optional, Dict, Any
import json
import os


class StructuredFormatter(logging.Formatter):
    """Custom formatter for structured JSON logging with color support."""
    
    # ANSI color codes
    COLORS = {
        'ERROR': '\033[91m',    # Bright red
        'CRITICAL': '\033[91m', # Bright red
        'WARNING': '\033[93m',  # Yellow
        'RESET': '\033[0m'      # Reset color
    }
    
    def __init__(self):
        super().__init__()
        # Check if we should use colors (TTY and not explicitly disabled)
        self.use_colors = (
            hasattr(sys.stdout, 'isatty') and 
            sys.stdout.isatty() and 
            os.getenv('NO_COLOR') is None and
            os.getenv('FORCE_COLOR', '').lower() not in ('0', 'false', 'no')
        )
    
    def format(self, record):
        # Create structured log entry
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "service": getattr(record, 'service', 'unknown'),
            "component": getattr(record, 'component', 'unknown'),
            "user_id": getattr(record, 'user_id', None),
            "job_id": getattr(record, 'job_id', None),
            "message": record.getMessage(),
        }
        
        # Add extra fields if present
        if hasattr(record, 'extra_fields'):
            log_entry.update(record.extra_fields)
        
        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        
        # Format as JSON
        formatted_log = json.dumps(log_entry, default=str)
        
        # Apply color if terminal supports it and log level requires it
        if self.use_colors and record.levelname in self.COLORS:
            color = self.COLORS[record.levelname]
            reset = self.COLORS['RESET']
            formatted_log = f"{color}{formatted_log}{reset}"
        
        return formatted_log


def setup_logger(name: str, service: str = "formai-service", level: str = "INFO") -> logging.Logger:
    """Set up a structured logger for a specific component."""
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper()))
    
    # Remove existing handlers to avoid duplicates
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # Create console handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredFormatter())
    logger.addHandler(handler)
    
    # Prevent propagation to root logger
    logger.propagate = False
    
    return logger


def log_with_context(logger: logging.Logger, level: str, message: str, 
                    user_id: Optional[str] = None, job_id: Optional[str] = None,
                    component: str = "unknown", extra_fields: Optional[Dict[str, Any]] = None):
    """Log a message with structured context."""
    extra = {
        'service': 'formai-service',
        'component': component,
        'user_id': user_id,
        'job_id': job_id,
    }
    
    if extra_fields:
        extra['extra_fields'] = extra_fields
    
    getattr(logger, level.lower())(message, extra=extra)


# Create logger instances for different components
api_logger = setup_logger("formai.api", "formai-service")
worker_logger = setup_logger("formai.worker", "formai-service")
analysis_logger = setup_logger("formai.analysis", "formai-service")
