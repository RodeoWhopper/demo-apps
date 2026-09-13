BINARY  ?= bin/kisa
IMAGE   ?= kisa-link:local

.PHONY: build run test vet tidy clean docker-build docker-run

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

docker-build:
	docker build -t $(IMAGE) .

docker-run:
	docker run --rm -p 8016:8016 -v kisa-data:/data $(IMAGE)
