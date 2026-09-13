from django.conf import settings

from .models import Category


def site_meta(request):
    return {
        "SITE_NAME": settings.SITE_NAME,
        "SITE_TAGLINE": settings.SITE_TAGLINE,
        "nav_categories": Category.objects.all()[:8],
    }
