# Use the official .NET SDK image to build the app
FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /app

# Copy csproj and restore as distinct layers
COPY *.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . ./
RUN dotnet publish -c Release -o out

# Use the runtime-only image to run the app
FROM mcr.microsoft.com/dotnet/aspnet:6.0
WORKDIR /app
COPY --from=build /app/out .

# Open port 5000 for the app
EXPOSE 5000

# Run the application
ENTRYPOINT ["dotnet", "KampteeSalahTiming.dll"]