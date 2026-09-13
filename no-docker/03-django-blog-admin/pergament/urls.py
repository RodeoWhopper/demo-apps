from django.contrib import admin
from django.urls import include, path

admin.site.site_header = "Pergament backoffice"
admin.site.site_title = "Pergament admin"
admin.site.index_title = "Editorial desk"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("accounts/", include("blog.auth_urls")),
    path("", include("blog.urls")),
]
