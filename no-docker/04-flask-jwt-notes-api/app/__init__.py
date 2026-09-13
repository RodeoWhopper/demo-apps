"""Scribble API - Flask application factory."""
from flask import Flask, jsonify, redirect, render_template, send_from_directory, url_for
from flask_cors import CORS
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, OperationalError

from .config import Config
from .errors import register_error_handlers
from .extensions import db
from .models import Note, User

__version__ = "1.0.0"


def create_app(config_object=Config) -> Flask:
    app = Flask(__name__, static_folder="static", template_folder="templates")
    app.config.from_object(config_object)
    app.config["DATABASE_PATH"].parent.mkdir(parents=True, exist_ok=True)

    db.init_app(app)
    CORS(app, resources={r"/*": {"origins": app.config["CORS_ORIGINS"]}}, expose_headers=["WWW-Authenticate"])
    register_error_handlers(app)

    from .blueprints import admin, auth, notes

    app.register_blueprint(auth.bp)
    app.register_blueprint(notes.bp)
    app.register_blueprint(admin.bp)

    @app.get("/healthz")
    def healthz():
        try:
            db.session.execute(text("SELECT 1"))
            return jsonify({
                "status": "ok",
                "db": "ok",
                "version": __version__,
                "users": User.query.count(),
                "notes": Note.query.count(),
            })
        except Exception as exc:  # pragma: no cover
            return jsonify({"status": "error", "db": str(exc)}), 503

    @app.get("/")
    def index():
        return redirect(url_for("docs"), code=302)

    @app.get("/docs")
    def docs():
        return render_template("docs.html", version=__version__)

    @app.get("/openapi.yaml")
    def openapi_spec():
        response = send_from_directory(app.static_folder, "openapi.yaml", mimetype="application/yaml")
        response.headers["Cache-Control"] = "no-cache"
        return response

    @app.cli.command("seed")
    def seed_command():
        """Create demo users and notes (idempotent)."""
        from .seed import seed_demo

        seed_demo()

    _init_database(app)
    return app


def _init_database(app: Flask) -> None:
    """Create tables and seed demo data. Safe when several gunicorn workers boot at once."""
    from .seed import seed_demo

    with app.app_context():
        try:
            db.create_all()
        except OperationalError as exc:
            # Another worker created the tables at the same moment.
            if "already exists" not in str(exc).lower():
                raise
        db.session.remove()

        if app.config["AUTO_SEED"]:
            try:
                if User.query.count() == 0:
                    seed_demo()
            except (IntegrityError, OperationalError):
                db.session.rollback()  # a sibling worker won the seed race
        db.session.remove()
        db.engine.dispose()  # do not carry pooled SQLite connections into forked workers
