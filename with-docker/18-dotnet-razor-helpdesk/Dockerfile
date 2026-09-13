# ---- build stage -----------------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Helpdesk.csproj .
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# ---- runtime stage ---------------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .
# the official image ships a non-root "app" user (uid 1654)
RUN mkdir -p /app/data && chown -R app:app /app/data
ENV ASPNETCORE_URLS=http://+:8018 \
    ASPNETCORE_ENVIRONMENT=Production \
    ConnectionStrings__Default="Data Source=/app/data/helpdesk.db"
VOLUME ["/app/data"]
EXPOSE 8018
USER app
ENTRYPOINT ["dotnet", "Helpdesk.dll"]
