from django.urls import path

from . import views
from .feeds import LatestPostsFeed

urlpatterns = [
    path("", views.PostListView.as_view(), name="post_list"),
    path("post/<slug:slug>/", views.post_detail, name="post_detail"),
    path("post/<slug:slug>/edit/", views.PostUpdateView.as_view(), name="post_edit"),
    path("category/<slug:slug>/", views.CategoryDetailView.as_view(), name="category_detail"),
    path("search/", views.SearchView.as_view(), name="search"),
    path("feed/", LatestPostsFeed(), name="feed"),
    path("write/", views.PostCreateView.as_view(), name="write"),
    path("dashboard/", views.DashboardView.as_view(), name="dashboard"),
    path("healthz/", views.healthz, name="healthz"),
]
