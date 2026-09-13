import markdown as md
from django import template
from django.utils.safestring import mark_safe

register = template.Library()

_renderer = md.Markdown(extensions=["fenced_code", "tables", "sane_lists", "smarty"])


@register.filter(name="markdown")
def render_markdown(text: str) -> str:
    """Render Markdown written by trusted (logged-in) authors to HTML."""
    _renderer.reset()
    return mark_safe(_renderer.convert(text or ""))
