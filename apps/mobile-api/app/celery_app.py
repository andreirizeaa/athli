from celery import Celery

# Create Celery app and load configuration from separate config file
celery = Celery("lift_analysis")
celery.config_from_object("celery_config")

# Make sure tasks are imported so the worker registers them
celery.conf.imports = ("tasks",)
