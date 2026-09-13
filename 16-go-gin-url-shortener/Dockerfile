# ---- build stage -----------------------------------------------------------
FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/kisa ./cmd/server \
    && mkdir -p /out/data

# ---- runtime stage ---------------------------------------------------------
# distroless/static: no shell, no libc – works because the binary is pure Go (CGO_ENABLED=0).
FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=build /out/kisa /app/kisa
# /data is pre-created and owned by the nonroot user (uid 65532) so anonymous
# and named volumes are writable out of the box.
COPY --from=build --chown=65532:65532 /out/data /data
ENV PORT=8016 \
    DB_PATH=/data/kisa.db \
    GIN_MODE=release
VOLUME ["/data"]
EXPOSE 8016
USER nonroot
ENTRYPOINT ["/app/kisa"]
