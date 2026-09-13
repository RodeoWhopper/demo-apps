from django.conf import settings
from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.db import connection
from django.db.models import Count, Q
from django.http import Http404, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse_lazy
from django.views.generic import CreateView, DetailView, ListView, UpdateView

from .forms import CommentForm, PostForm
from .models import Category, Comment, Post


class PostListView(ListView):
    template_name = "blog/post_list.html"
    context_object_name = "posts"
    paginate_by = settings.POSTS_PER_PAGE

    def get_queryset(self):
        return Post.objects.published().select_related("author", "category")


class CategoryDetailView(DetailView):
    model = Category
    template_name = "blog/category_detail.html"
    context_object_name = "category"

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx["posts"] = self.object.posts.published().select_related("author")
        return ctx


class SearchView(ListView):
    template_name = "blog/search.html"
    context_object_name = "posts"
    paginate_by = settings.POSTS_PER_PAGE

    def get_queryset(self):
        self.query = self.request.GET.get("q", "").strip()
        qs = Post.objects.published().select_related("author", "category")
        if not self.query:
            return qs.none()
        return qs.filter(
            Q(title__icontains=self.query)
            | Q(excerpt__icontains=self.query)
            | Q(body__icontains=self.query)
        )

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx["query"] = self.query
        return ctx


def post_detail(request, slug):
    post = get_object_or_404(Post.objects.select_related("author", "category"), slug=slug)
    can_preview = request.user.is_authenticated and (
        request.user == post.author or request.user.is_staff
    )
    if not post.is_published and not can_preview:
        raise Http404("Post not found")

    if request.method == "POST":
        form = CommentForm(request.POST)
        if form.is_valid():
            comment = form.save(commit=False)
            comment.post = post
            comment.moderated = False
            comment.save()
            messages.success(request, "Thank you. Your comment will appear once it has been moderated.")
            return redirect(post.get_absolute_url())
    else:
        form = CommentForm()

    context = {
        "post": post,
        "comments": post.comments.filter(moderated=True),
        "form": form,
        "is_preview": not post.is_published,
        "related": Post.objects.published()
        .filter(category=post.category)
        .exclude(pk=post.pk)[:3]
        if post.category
        else [],
    }
    return render(request, "blog/post_detail.html", context)


class PostCreateView(LoginRequiredMixin, CreateView):
    model = Post
    form_class = PostForm
    template_name = "blog/post_form.html"

    def form_valid(self, form):
        form.instance.author = self.request.user
        messages.success(self.request, "Post saved.")
        return super().form_valid(form)

    def get_success_url(self):
        if self.object.is_published:
            return self.object.get_absolute_url()
        return reverse_lazy("dashboard")


class PostUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    model = Post
    form_class = PostForm
    template_name = "blog/post_form.html"
    raise_exception = False

    def test_func(self):
        post = self.get_object()
        return self.request.user == post.author or self.request.user.is_staff

    def form_valid(self, form):
        messages.success(self.request, "Post updated.")
        return super().form_valid(form)

    def get_success_url(self):
        return reverse_lazy("dashboard")


class DashboardView(LoginRequiredMixin, ListView):
    template_name = "blog/dashboard.html"
    context_object_name = "posts"

    def get_queryset(self):
        return (
            Post.objects.filter(author=self.request.user)
            .select_related("category")
            .annotate(
                comment_total=Count("comments"),
                comment_pending=Count("comments", filter=Q(comments__moderated=False)),
            )
            .order_by("-updated_at")
        )

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        qs = self.get_queryset()
        ctx["published_count"] = qs.filter(status=Post.Status.PUBLISHED).count()
        ctx["draft_count"] = qs.filter(status=Post.Status.DRAFT).count()
        ctx["pending_comments"] = Comment.objects.filter(
            post__author=self.request.user, moderated=False
        ).count()
        return ctx


def healthz(request):
    """JSON health endpoint used by deployment tooling."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        db_status = "ok"
        published = Post.objects.published().count()
    except Exception as exc:  # pragma: no cover - only hit when the DB is broken
        return JsonResponse({"status": "error", "db": str(exc)}, status=503)
    return JsonResponse({"status": "ok", "db": db_status, "published_posts": published, "app": "pergament"})
