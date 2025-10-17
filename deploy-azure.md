# Deploy Vacation Tracker to Azure App Service

## Prerequisites
- Azure CLI installed
- Docker installed
- Azure subscription

## Step 1: Build and Test Locally

```bash
# Build the Docker image
docker build -t vacation-tracker .

# Run locally to test
docker run -p 3000:3000 vacation-tracker

# Or use docker-compose
docker-compose up
```

## Step 2: Create Azure Resources

```bash
# Login to Azure
az login

# Create resource group
az group create --name vacation-tracker-rg --location "East US"

# Create Azure Container Registry
az acr create --resource-group vacation-tracker-rg --name vacationtrackeracr --sku Basic --admin-enabled true

# Create App Service Plan (Linux)
az appservice plan create --name vacation-tracker-plan --resource-group vacation-tracker-rg --sku B1 --is-linux

# Create Web App
az webapp create --resource-group vacation-tracker-rg --plan vacation-tracker-plan --name vacation-tracker-app --deployment-container-image-name vacationtrackeracr.azurecr.io/vacation-tracker:latest
```

## Step 3: Push Image to Azure Container Registry

```bash
# Get ACR login server
az acr show --name vacationtrackeracr --resource-group vacation-tracker-rg --query loginServer --output table

# Login to ACR
az acr login --name vacationtrackeracr

# Tag your image
docker tag vacation-tracker vacationtrackeracr.azurecr.io/vacation-tracker:latest

# Push to ACR
docker push vacationtrackeracr.azurecr.io/vacation-tracker:latest
```

## Step 4: Configure App Service

```bash
# Configure container settings
az webapp config container set --name vacation-tracker-app --resource-group vacation-tracker-rg --docker-custom-image-name vacationtrackeracr.azurecr.io/vacation-tracker:latest --docker-registry-server-url https://vacationtrackeracr.azurecr.io

# Set environment variables
az webapp config appsettings set --resource-group vacation-tracker-rg --name vacation-tracker-app --settings PORT=3000 NODE_ENV=production

# Enable container logging
az webapp log config --resource-group vacation-tracker-rg --name vacation-tracker-app --docker-container-logging filesystem
```

## Step 5: Access Your App

Your app will be available at: `https://vacation-tracker-app.azurewebsites.net`

## Continuous Deployment (Optional)

1. Fork this repository to your GitHub account
2. In Azure Portal, go to your App Service
3. Navigate to Deployment Center
4. Choose GitHub as source
5. Configure the workflow file (azure-deploy.yml is already created)
6. Add these secrets to your GitHub repository:
   - `REGISTRY_LOGIN_SERVER`: vacationtrackeracr.azurecr.io
   - `REGISTRY_USERNAME`: (from ACR access keys)
   - `REGISTRY_PASSWORD`: (from ACR access keys)
   - `AZURE_WEBAPP_PUBLISH_PROFILE`: (download from App Service)

## Monitoring and Logs

```bash
# View logs
az webapp log tail --resource-group vacation-tracker-rg --name vacation-tracker-app

# Check app status
az webapp show --resource-group vacation-tracker-rg --name vacation-tracker-app --query state
```

## Scaling (Optional)

```bash
# Scale up the App Service Plan
az appservice plan update --name vacation-tracker-plan --resource-group vacation-tracker-rg --sku S1

# Scale out (add instances)
az webapp scale --resource-group vacation-tracker-rg --name vacation-tracker-app --instance-count 2
```