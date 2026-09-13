# Kütüphane Plus – Spring Boot Library Lending System

Kütüphane Plus is a small-town library system: anyone can browse and search the catalogue, members log in to borrow books for 14 days and return them, and the librarian manages the inventory, all loans and members. Its place in the demo set: a **JVM app that must be built with Maven** (nothing is pre-compiled; the Maven wrapper or the multi-stage Dockerfile does it), **classic server-side sessions with Spring Security form login and CSRF tokens** (every POST carries a `_csrf` field that Thymeleaf injects automatically), role-based URL authorisation declared centrally in `SecurityConfig`, Thymeleaf server-rendered views with a parameterised layout, and a **file-based H2 database** – no external DB server needed.

## Stack

- Java 21 (Eclipse Temurin) · Maven 3.9.16 via wrapper (`./mvnw`, wrapper plugin 3.3.4, `only-script` type)
- Spring Boot 3.5.16: Spring Web MVC, Spring Security 6 (form login, CSRF, BCrypt), Spring Data JPA / Hibernate, Bean Validation, Actuator
- Thymeleaf 3 + `thymeleaf-extras-springsecurity6`
- H2 database (file mode), Hibernate `ddl-auto: update`
- Bootstrap 5.3.3 via jsDelivr CDN (only runtime network dependency, browser side)
- Docker: `maven:3.9-eclipse-temurin-21` build stage → `eclipse-temurin:21-jre-alpine` runtime, non-root user

## Ports

| Port | What |
|------|------|
| 8017 | HTTP (embedded Tomcat) – the only port |

## Quick start (local)

Requires JDK 21 on the PATH (Maven itself is downloaded by the wrapper).

```bash
cd 17-spring-boot-library
./mvnw -B package -DskipTests        # first run downloads Maven 3.9.16 + ~120 MB of dependencies
java -jar target/library.jar         # http://localhost:8017, creates ./data/library.mv.db and seeds demo data
# or, for development with live restarts:
./mvnw spring-boot:run
# run the MockMvc test suite:
./mvnw test
```

No JDK on the host? Build inside the official Maven image instead:

```bash
docker run --rm -v "$PWD":/app -w /app -v "$HOME/.m2":/root/.m2 maven:3.9-eclipse-temurin-21 mvn -B -q package -DskipTests
```

## Docker

```bash
docker build -t kutuphane-plus .
docker run --rm -p 8017:8017 -v kutuphane-data:/app/data kutuphane-plus
```

The image compiles the project in the build stage (BuildKit cache mount for `~/.m2`), then runs `java -jar app.jar` as the non-root user `app` with `SPRING_PROFILES_ACTIVE=prod`, `DB_PATH=/app/data/library` and `VOLUME /app/data`. Startup takes roughly 8–20 seconds; wait for `/actuator/health` to return `{"status":"UP"}`.

## Environment variables

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `PORT` | no | `8017` | HTTP port (`server.port`) |
| `DB_PATH` | no | `./data/library` (`/app/data/library` in Docker) | H2 file prefix without extension; H2 writes `<DB_PATH>.mv.db` |
| `SPRING_PROFILES_ACTIVE` | no | – (`prod` in Docker) | `prod` hides stack traces/messages in error pages; the H2 console is disabled in every profile |
| `JAVA_OPTS` | no | `-XX:MaxRAMPercentage=75` | Extra JVM flags (Docker entrypoint only) |

Any Spring property can also be overridden through the usual relaxed-binding env names (e.g. `SERVER_PORT`, `SPRING_DATASOURCE_URL`). See `.env.example`.

## Default credentials

| Role | Username (email) | Password | Can do |
|------|------------------|----------|--------|
| `ROLE_ADMIN` (librarian) | `librarian@kutuphane.dev` | `Admin123!` | everything below plus `/admin/**` |
| `ROLE_MEMBER` | `uye@kutuphane.dev` | `Uye123!` | borrow / return own loans |

Passwords are stored as BCrypt hashes in the `members` table (seeded by `DataSeeder` on first start).

## Routes

| Path | Method | Auth | Description |
|------|--------|------|-------------|
| `/actuator/health` | GET | no | Health check → `{"status":"UP"}` (only the health endpoint is exposed) |
| `/` | GET | no | Catalogue with stats; `?q=` searches title / author / ISBN |
| `/books/{id}` | GET | no | Book details; borrow button when logged in |
| `/login` | GET | no | Custom Thymeleaf login page (`?error`, `?logout` flags) |
| `/login` | POST | no (CSRF) | Spring Security form login: `username`, `password`, `_csrf` → redirects to `/my/loans` |
| `/logout` | POST | session (CSRF) | Invalidates the session, redirects to `/?logout` |
| `/my/loans` | GET | authenticated | The member's loans with status badges and return buttons |
| `/books/{id}/borrow` | POST | authenticated (CSRF) | Borrow a copy (14 days, max 3 active loans, one copy per book per member) |
| `/loans/{id}/return` | POST | authenticated (CSRF) | Return a loan – members only their own, admins any (`back=admin` returns to `/admin/loans`) |
| `/admin/books` | GET | `ROLE_ADMIN` | Book list |
| `/admin/books/new`, `/admin/books` | GET, POST | `ROLE_ADMIN` | Create a book (validated, unique ISBN) |
| `/admin/books/{id}/edit`, `/admin/books/{id}` | GET, POST | `ROLE_ADMIN` | Edit a book (total copies cannot drop below copies on loan) |
| `/admin/books/{id}/delete` | POST | `ROLE_ADMIN` | Delete a book without loan history |
| `/admin/loans` | GET | `ROLE_ADMIN` | All loans (active / overdue / returned) with return action |
| `/admin/members` | GET | `ROLE_ADMIN` | Members with active-loan counts |
| `/admin/members/{id}/toggle` | POST | `ROLE_ADMIN` | Activate / deactivate a member (cannot deactivate yourself) |
| `/403` | any | no | Access-denied page (also the target of `accessDeniedPage`, e.g. for a POST without CSRF) |
| `/css/**` | GET | no | Static assets |

Anonymous access to a protected page redirects (302) to `/login`; an authenticated member on `/admin/**` gets **403** with the custom page.

## Data / persistence

- H2 file database at `DB_PATH` (`./data/library.mv.db` locally, `/app/data/library.mv.db` in the container on the `/app/data` volume). Delete the file to reset.
- Schema is created/updated by Hibernate (`spring.jpa.hibernate.ddl-auto=update`), tables `books`, `members`, `loans`.
- `DataSeeder` (a `CommandLineRunner`) seeds 10 books, 2 users and 3 loans (one active, one overdue, one returned) only when `members` is empty.
- Sessions are in-memory (single instance); restarting the app logs everyone out.

## Verification performed

Java/Maven are not installed on the build machine, so everything ran inside Docker on 2026-09-10 (Docker 29.6.2):

- Wrapper generated with `mvn -N wrapper:wrapper -Dmaven=3.9.16 -Dtype=only-script` in `maven:3.9-eclipse-temurin-21`.
- `mvn -B -q package -DskipTests` in `maven:3.9-eclipse-temurin-21` (host `~/.m2` mounted) → `target/library.jar` (≈ 64 MB).
- `mvn -B -q test` → `LibraryApplicationTests`: 5 tests, 0 failures (public catalogue/health, redirect to login, member gets 403 on `/admin/**`, admin gets 200, seeded member form-login succeeds with `ROLE_MEMBER` and a wrong password redirects to `/login?error`).
- `docker build` (multi-stage) → OK; `docker run -p 8017:8017 -v kp-verify-data:/app/data` and verified with curl:
  - `/actuator/health` → 200 `{"status":"UP"}`; `/`, `/?q=atay`, `/books/1`, `/login`, `/css/app.css` → 200; `/books/999` → 404.
  - `/admin/books` and `/my/loans` anonymous → 302 to `/login`.
  - Form login: GET `/login` (JSESSIONID + `_csrf`), POST with wrong password → 302 `/login?error`; POST without `_csrf` → 403 page; member credentials → 302 `/my/loans`, then `/my/loans` → 200 and `/admin/books` → **403** with the custom page.
  - Member borrowed book 2 (302 → `/my/loans`, listed), a second borrow of the same book was refused with a flash message, and a loan was returned (302).
  - Admin login → `/admin/books`, `/admin/loans`, `/admin/members`, `/admin/books/new` → 200; created a book via POST (302, visible in the catalogue search); invalid book form → 200 with 3 field errors; POST `/logout` → 302 `/?logout` and `/admin/books` afterwards → 302 to login.
  - Persistence: a book created as admin was still present after `docker stop` + `docker run` on the same volume (catalogue count 11); the container runs as uid 100 (`app`) and `/app/data/library.mv.db` is owned by it; log shows profile `prod`.
- Not verified: running the jar directly on a host JVM (no JDK here – only inside containers), `./mvnw` script execution itself (generated by the wrapper plugin but not executed, because Maven was invoked directly in the image), and behaviour behind a reverse proxy.
- `target/`, the verification image and volume were removed afterwards.
