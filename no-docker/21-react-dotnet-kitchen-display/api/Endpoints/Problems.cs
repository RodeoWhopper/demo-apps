namespace Kds.Api.Endpoints;

// Small helpers so every error response is an RFC 9457 problem document.
public static class Problems
{
    public static IResult NotFound(string detail) => Results.Problem(statusCode: StatusCodes.Status404NotFound, title: "Not Found", detail: detail);
    public static IResult Unauthorized(string detail) => Results.Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Unauthorized", detail: detail);
    public static IResult Conflict(string detail) => Results.Problem(statusCode: StatusCodes.Status409Conflict, title: "Conflict", detail: detail);
    public static IResult BadRequest(string detail) => Results.Problem(statusCode: StatusCodes.Status400BadRequest, title: "Bad Request", detail: detail);
    public static IResult Validation(Dictionary<string, string[]> errors) => Results.ValidationProblem(errors, title: "One or more validation errors occurred.");

    public sealed class Errors
    {
        private readonly Dictionary<string, List<string>> _errors = new();
        public bool Any => _errors.Count > 0;
        public void Add(string field, string message)
        {
            if (!_errors.TryGetValue(field, out var list)) _errors[field] = list = [];
            list.Add(message);
        }
        public IResult ToResult() => Validation(_errors.ToDictionary(k => k.Key, v => v.Value.ToArray()));
    }
}
