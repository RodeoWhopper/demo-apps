# ---- stage 1: build the React SPA -------------------------------------------
FROM node:22-alpine AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
RUN npm run build

# ---- stage 2: restore + publish the ASP.NET Core API (bundles web/dist as wwwroot/) ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api
WORKDIR /src
COPY api/Kds.Api.csproj api/
RUN dotnet restore api/Kds.Api.csproj
COPY api/ api/
# the csproj's IncludeSpaInPublish target picks this folder up (../web/dist relative to the project)
COPY --from=web /web/dist web/dist
RUN dotnet publish api/Kds.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

# ---- stage 3: runtime ---------------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=api /app/publish ./
# the official image ships a non-root "app" user (uid 1654)
RUN mkdir -p /app/data && chown -R app:app /app/data
ENV ASPNETCORE_URLS=http://+:8021 \
    ASPNETCORE_ENVIRONMENT=Production \
    ConnectionStrings__Default="Data Source=/app/data/kds.db"
VOLUME ["/app/data"]
EXPOSE 8021
USER app
ENTRYPOINT ["dotnet", "Kds.Api.dll"]
