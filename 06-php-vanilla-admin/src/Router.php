<?php
declare(strict_types=1);

namespace Bakkal;

/**
 * Tiny hand-written router: matches HTTP method + path, supports {param}
 * placeholders and per-route middleware closures.
 */
final class Router
{
    /** @var array<int, array{method:string, regex:string, handler:callable, middleware:array}> */
    private array $routes = [];

    public function get(string $pattern, callable $handler, array $middleware = []): void
    {
        $this->add('GET', $pattern, $handler, $middleware);
    }

    public function post(string $pattern, callable $handler, array $middleware = []): void
    {
        $this->add('POST', $pattern, $handler, $middleware);
    }

    public function add(string $method, string $pattern, callable $handler, array $middleware = []): void
    {
        $regex = '#^' . preg_replace('#\{([a-zA-Z_]+)\}#', '(?P<$1>[^/]+)', $pattern) . '$#';
        $this->routes[] = [
            'method' => strtoupper($method),
            'regex' => $regex,
            'handler' => $handler,
            'middleware' => $middleware,
        ];
    }

    public function dispatch(string $method, string $path): void
    {
        $method = strtoupper($method);
        $path = '/' . trim($path, '/');
        $methodMismatch = false;

        foreach ($this->routes as $route) {
            if (!preg_match($route['regex'], $path, $matches)) {
                continue;
            }
            if ($route['method'] !== $method) {
                $methodMismatch = true;
                continue;
            }
            $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
            foreach ($route['middleware'] as $mw) {
                $mw(); // middleware either returns normally or sends a response and exits
            }
            ($route['handler'])($params);
            return;
        }

        if ($methodMismatch) {
            http_response_code(405);
            header('Allow: GET, POST');
            View::render('errors/405', ['title' => 'Method Not Allowed']);
            return;
        }
        http_response_code(404);
        View::render('errors/404', ['title' => 'Not Found']);
    }
}
