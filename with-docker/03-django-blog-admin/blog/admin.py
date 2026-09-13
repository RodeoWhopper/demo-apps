from django.contrib import admin, messages
from django.utils import timezone

from .models import Category, Comment, Post


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "post_count")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name",)

    @admin.display(description="Posts")
    def post_count(self, obj):
        return obj.posts.count()


class CommentInline(admin.TabularInline):
    model = Comment
    extra = 0
    fields = ("author_name", "body", "moderated", "created_at")
    readonly_fields = ("created_at",)


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "category", "status", "published_at", "comment_count")
    list_filter = ("status", "category", "author")
    search_fields = ("title", "excerpt", "body")
    prepopulated_fields = {"slug": ("title",)}
    date_hierarchy = "published_at"
    ordering = ("-published_at", "-created_at")
    autocomplete_fields = ("category",)
    raw_id_fields = ("author",)
    inlines = [CommentInline]
    actions = ["publish_selected", "unpublish_selected"]
    fieldsets = (
        (None, {"fields": ("title", "slug", "author", "category")}),
        ("Content", {"fields": ("excerpt", "body")}),
        ("Publishing", {"fields": ("status", "published_at")}),
    )

    @admin.display(description="Comments")
    def comment_count(self, obj):
        return obj.comments.count()

    @admin.action(description="Publish selected posts")
    def publish_selected(self, request, queryset):
        now = timezone.now()
        updated = 0
        for post in queryset:
            if post.status != Post.Status.PUBLISHED:
                post.status = Post.Status.PUBLISHED
                if post.published_at is None:
                    post.published_at = now
                post.save(update_fields=["status", "published_at", "updated_at"])
                updated += 1
        self.message_user(request, f"{updated} post(s) published.", messages.SUCCESS)

    @admin.action(description="Move selected posts back to draft")
    def unpublish_selected(self, request, queryset):
        updated = queryset.update(status=Post.Status.DRAFT)
        self.message_user(request, f"{updated} post(s) moved to draft.", messages.SUCCESS)


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("author_name", "post", "short_body", "moderated", "created_at")
    list_filter = ("moderated", "created_at")
    search_fields = ("author_name", "email", "body")
    actions = ["approve_comments", "reject_comments"]
    list_select_related = ("post",)

    @admin.display(description="Comment")
    def short_body(self, obj):
        return obj.body if len(obj.body) <= 60 else obj.body[:57] + "..."

    @admin.action(description="Approve selected comments")
    def approve_comments(self, request, queryset):
        updated = queryset.update(moderated=True)
        self.message_user(request, f"{updated} comment(s) approved.", messages.SUCCESS)

    @admin.action(description="Hide selected comments (unapprove)")
    def reject_comments(self, request, queryset):
        updated = queryset.update(moderated=False)
        self.message_user(request, f"{updated} comment(s) hidden.", messages.WARNING)
