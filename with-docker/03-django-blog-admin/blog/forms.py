from django import forms

from .models import Comment, Post


class PostForm(forms.ModelForm):
    class Meta:
        model = Post
        fields = ["title", "category", "excerpt", "body", "status"]
        widgets = {
            "title": forms.TextInput(attrs={"placeholder": "A title worth reading"}),
            "excerpt": forms.TextInput(attrs={"placeholder": "One-sentence teaser (optional)"}),
            "body": forms.Textarea(attrs={"rows": 18, "placeholder": "Write in Markdown..."}),
        }


class CommentForm(forms.ModelForm):
    class Meta:
        model = Comment
        fields = ["author_name", "email", "body"]
        labels = {"author_name": "Name", "email": "Email (not shown)", "body": "Comment"}
        widgets = {"body": forms.Textarea(attrs={"rows": 4})}
