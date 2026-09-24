# =========================================================
# BUILD STAGE
# =========================================================
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /src

# Copy project file first for better Docker layer caching
COPY ["SjTuklas.Api.csproj", "./"]

# Restore NuGet packages
RUN dotnet restore "SjTuklas.Api.csproj"

# Copy the rest of the application
COPY . .

# Build the application
RUN dotnet build "SjTuklas.Api.csproj" \
    -c Release \
    -o /app/build \
    --no-restore


# =========================================================
# PUBLISH STAGE
# =========================================================
FROM build AS publish

RUN dotnet publish "SjTuklas.Api.csproj" \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false


# =========================================================
# RUNTIME STAGE
# =========================================================
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final

WORKDIR /app

# ASP.NET Core listens on port 8080 inside the container
ENV ASPNETCORE_HTTP_PORTS=8080

EXPOSE 8080

# Copy published application
COPY --from=publish /app/publish .

# Start the API
ENTRYPOINT ["dotnet", "SjTuklas.Api.dll"]