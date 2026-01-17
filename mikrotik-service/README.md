# MikroTik Integration Service

Backend service for MikroTik router management in the Nolojia ISP Billing system.

## Features

- **Router Connection**: Secure API communication with MikroTik routers
- **Hotspot Management**: Create/update/delete hotspot users
- **PPPoE Management**: Manage PPPoE secrets and profiles
- **Bandwidth Control**: Simple queue management for speed limiting
- **Billing Enforcement**: Auto suspend/activate based on subscriptions
- **Health Monitoring**: Periodic router health checks

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Configure your Supabase credentials in .env

# Run in development
npm run dev

# Build for production
npm run build
npm start
```

## API Endpoints

### Router Management
- `POST /api/routers/:id/test` - Test router connection
- `GET /api/routers/:id/resources` - Get system resources

### Hotspot
- `GET /api/routers/:id/hotspot/active` - Get active users
- `POST /api/routers/:id/hotspot/disconnect/:username` - Disconnect user

### PPPoE
- `GET /api/routers/:id/pppoe/active` - Get active sessions
- `POST /api/routers/:id/pppoe/disconnect/:username` - Disconnect session

### Queues
- `GET /api/routers/:id/queues` - Get all simple queues

### Billing Enforcement
- `POST /api/customers/:id/suspend` - Suspend customer access
- `POST /api/customers/:id/activate` - Activate customer access
- `POST /api/customers/:id/provision` - Provision new customer
- `POST /api/customers/:id/speed` - Change customer speed
- `POST /api/billing/process-expired` - Process all expired subscriptions

## Configuration

Set these environment variables:

```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key
ENCRYPTION_KEY=32_byte_hex_key_for_credentials
PORT=3002
```

## Database Setup

Run `supabase-mikrotik-schema.sql` in your Supabase SQL Editor to create the required tables.
