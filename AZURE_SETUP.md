# Azure Storage Setup for Vacation Tracker

## The Problem
Azure App Service containers are **stateless** - they get destroyed and recreated on:
- App restarts/stops
- Scaling operations  
- Multiple instance deployments
- Platform updates

This causes your JSON file to be lost every time.

## The Solution: Azure Blob Storage

### Step 1: Create Azure Storage Account
1. Go to Azure Portal → Create Resource → Storage Account
2. Choose:
   - **Performance**: Standard
   - **Redundancy**: LRS (cheapest option)
   - **Access tier**: Hot
3. Create the storage account

### Step 2: Get Connection String
1. Go to your Storage Account → Access Keys
2. Copy the **Connection string** from Key1

### Step 3: Configure App Service
1. Go to your App Service → Configuration → Application Settings
2. Add new setting:
   - **Name**: `AZURE_STORAGE_CONNECTION_STRING`
   - **Value**: [paste your connection string]
3. Save and restart your app

## How It Works
- **With Storage**: Data persists across all restarts and instances
- **Without Storage**: Falls back to local file (will be lost on restart)
- **Automatic**: No code changes needed, just set the environment variable

## Cost
- Storage: ~$0.02/GB per month
- Transactions: ~$0.0004 per 10,000 operations
- **Total for this app**: Less than $1/month

## Alternative: Quick Database Solution
If you prefer a database, use Azure Database for PostgreSQL (Basic tier ~$15/month) with this connection:

```javascript
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
```

The Blob Storage solution is simpler and cheaper for your current JSON-based approach.