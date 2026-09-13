from flask import jsonify
from werkzeug.exceptions import HTTPException


class APIError(Exception):
    """Raise anywhere in a request to return a structured JSON error."""

    def __init__(self, status: int, message: str, code: str | None = None, details=None):
        super().__init__(message)
        self.status = status
        self.message = message
        self.code = code or _default_code(status)
        self.details = details


def _default_code(status: int) -> str:
    return {
        400: "bad_request",
        401: "unauthorized",
        403: "forbidden",
        404: "not_found",
        405: "method_not_allowed",
        409: "conflict",
        422: "validation_error",
        500: "internal_error",
    }.get(status, "error")


def error_response(status: int, message: str, code: str | None = None, details=None):
    payload = {"error": {"code": code or _default_code(status), "message": message}}
    if details:
        payload["error"]["details"] = details
    response = jsonify(payload)
    response.status_code = status
    if status == 401:
        response.headers["WWW-Authenticate"] = 'Bearer realm="scribble"'
    return response


def register_error_handlers(app):
    @app.errorhandler(APIError)
    def handle_api_error(err: APIError):
        return error_response(err.status, err.message, err.code, err.details)

    @app.errorhandler(HTTPException)
    def handle_http_error(err: HTTPException):
        return error_response(err.code or 500, err.description or err.name)

    @app.errorhandler(Exception)
    def handle_unexpected(err: Exception):  # pragma: no cover - safety net
        app.logger.exception("Unhandled error: %s", err)
        return error_response(500, "Internal server error")
