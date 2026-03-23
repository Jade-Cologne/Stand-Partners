import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.crawler.parser import run_daily_crawl
from app.crawler.discovery import run_weekly_discovery

logger = logging.getLogger(__name__)

_scheduler = BackgroundScheduler()


def start_scheduler():
    # Daily at 06:00 UTC — refresh audition listings
    _scheduler.add_job(
        run_daily_crawl,
        CronTrigger(hour=6, minute=0),
        id="daily_crawl",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    # Weekly on Sunday at 05:00 UTC — discover new orchestras
    _scheduler.add_job(
        run_weekly_discovery,
        CronTrigger(day_of_week="sun", hour=5, minute=0),
        id="weekly_discovery",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    _scheduler.start()
    logger.info("Crawler scheduler started.")


def stop_scheduler():
    _scheduler.shutdown(wait=False)
    logger.info("Crawler scheduler stopped.")
