BINARY ?= bin/kisa

.PHONY: build run test vet tidy clean

build:
	CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o $(BINARY) ./cmd/server

run:
	go run ./cmd/server

test:
	go test ./...

vet:
	go vet ./...

tidy:
	go mod tidy

clean:
	rm -rf bin data/*.db data/*.db-wal data/*.db-shm
