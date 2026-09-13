from django.contrib.syndication.views import Feed
from django.urls import reverse

from .models import Post


class LatestPostsFeed(Feed):
    title = "Pergament - latest essays"
    description = "Long-form writing, carefully typeset."

    def link(self):
        return reverse("post_list")

    def items(self):
        return Post.objects.published().select_related("author")[:20]

    def item_title(self, item):
        return item.title

    def item_description(self, item):
        return item.excerpt or item.body[:280]

    def item_pubdate(self, item):
        return item.published_at

    def item_author_name(self, item):
        return item.author.get_full_name() or item.author.username
