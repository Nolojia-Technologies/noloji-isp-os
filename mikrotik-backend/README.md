# MikroTik RADIUS Backend

A production-ready Node.js backend system for MikroTik hotspot management with RADIUS authentication, accounting, and RouterOS API integration.

## Features

### RADIUS Server
- ✅ **Authentication** - Username/password and voucher-based authentication
- ✅ **Accounting** - Start, Interim-Update (every 60s), and Stop packets
- ✅ **MikroTik Attributes** - Rate-Limit, Session-Timeout, Idle-Timeout
- ✅ **Session Management** - Real-time session tracking and updates
- ✅ **Auto-Disconnect** - Expired users and data limit enforcement
- ✅ **Complete Logging** - All RADIUS packets logged to database

### MikroTik API Integration (Port 8728)
- ✅ **Active Users** - Retrieve active hotspot sessions
- ✅ **User Disconnection** - Disconnect by username or MAC address
- ✅ **Bandwidth Control** - Add/update/remove simple queues
- ✅ **Hotspot Management** - Create/remove hotspot users
- ✅ **System Monitoring** - CPU, RAM, uptime, interface stats
- ✅ **RADIUS Config Check** - Verify RADIUS configuration

### REST API
- ✅ **User Management** - CRUD operations for users
- ✅ **Voucher Generation** - Batch voucher creation with PINs
- ✅ **Plan Management** - Bandwidth and time-based plans
- ✅ **Session Monitoring** - Active sessions and historical data
- ✅ **RADIUS Logs** - Complete packet logging and troubleshooting

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   MikroTik      │◄────────┤   Node.js        │◄────────┤   PostgreSQL    │
│   Router        │  RADIUS │   Backend        │   SQL   │   Database      │
│                 │  UDP     │                  │         │                 │
│  - Hotspot      │  1812/   │  - RADIUS Server │         │  - Users        │
│  - NAS          │  1813    │  - Express API   │         │  - Vouchers     │
│  - RouterOS API │◄────────┤  - Session Mgr   │         │  - Sessions     │
│                 │  TCP     │  - MikroTik API  │         │  - Plans        │
│                 │  8728    │                  │         │  - Logs         │
└─────────────────┘          └──────────────────┘         └─────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+
- MikroTik RouterOS 6.x or 7.x
- Network connectivity between backend and MikroTik

### Installation

1. **Clone or extract the backend**

```bash
cd mikrotik-backend
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment**

```bash
cp .env.example .env
nano .env
```

Edit `.env` with your settings:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wifi_billing
DB_USER=postgres
DB_PASSWORD=your_password

# RADIUS
RADIUS_SECRET=your_radius_secret_key_here

# MikroTik Router
MIKROTIK_HOST=192.168.88.1
MIKROTIK_USERNAME=admin
MIKROTIK_PASSWORD=your_mikrotik_password
```

4. **Create database**

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE wifi_billing;
\q
```

5. **Run migrations**

```bash
npm run migrate
```

You should see:
```
✅ Database migration completed successfully!
📊 Tables created:
   - routers
   - plans
   - users
   - vouchers
   - sessions
   - radius_logs
   - bandwidth_usage
   - disconnection_queue
```

6. **Start the backend**

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

You should see:
```
🚀 All services started successfully!
==================================================
API Server: http://0.0.0.0:3001
RADIUS Auth: UDP port 1812
RADIUS Acct: UDP port 1813
==================================================
```

7. **Configure MikroTik router**

Follow the complete guide: [MIKROTIK_CONFIGURATION.md](docs/MIKROTIK_CONFIGURATION.md)

Quick MikroTik commands:
```bash
# Add RADIUS server
/radius add service=hotspot address=YOUR_BACKEND_IP secret="your_radius_secret" authentication-port=1812 accounting-port=1813

# Enable RADIUS in hotspot profile
/ip hotspot profile set default use-radius=yes radius-accounting=yes radius-interim-update=1m

# Enable API
/ip service set api address=YOUR_BACKEND_IP/32 disabled=no port=8728
```

## API Documentation

### Base URL
```
http://localhost:3001/api
```

### Authentication
Currently no authentication required. In production, add JWT or API key authentication.

---

### Users

#### Create User
```http
POST /api/users
Content-Type: application/json

{
  "username": "john",
  "password": "password123",
  "email": "john@example.com",
  "full_name": "John Doe",
  "plan_id": 1,
  "valid_until": "2025-12-31T23:59:59Z"
}
```

#### Get All Users
```http
GET /api/users
```

#### Get User by ID
```http
GET /api/users/1
```

#### Update User
```http
PUT /api/users/1
Content-Type: application/json

{
  "is_active": true,
  "plan_id": 2
}
```

#### Delete User
```http
DELETE /api/users/1
```

#### Get User Sessions
```http
GET /api/users/1/sessions
```

---

### Vouchers

#### Generate Vouchers
```http
POST /api/vouchers/generate
Content-Type: application/json

{
  "plan_id": 1,
  "quantity": 100,
  "validity_days": 30,
  "batch_name": "PROMO-JAN-2025",
  "code_length": 12,
  "include_pin": true
}
```

#### Get All Vouchers
```http
GET /api/vouchers
GET /api/vouchers?status=active
GET /api/vouchers?batch_id=PROMO-JAN-2025
```

#### Get Voucher by Code
```http
GET /api/vouchers/ABC123XYZ789
```

#### Update Voucher Status
```http
PUT /api/vouchers/ABC123XYZ789/status
Content-Type: application/json

{
  "status": "disabled"
}
```

#### Get Voucher Statistics
```http
GET /api/vouchers/stats
```

---

### Plans

#### Create Plan
```http
POST /api/plans
Content-Type: application/json

{
  "name": "Premium 20Mbps",
  "description": "High-speed unlimited plan",
  "upload_speed": 20480,
  "download_speed": 20480,
  "session_timeout": null,
  "validity_days": 30,
  "price": 50.00,
  "currency": "USD"
}
```

#### Get All Plans
```http
GET /api/plans
```

#### Get Plan by ID
```http
GET /api/plans/1
```

#### Update Plan
```http
PUT /api/plans/1
Content-Type: application/json

{
  "price": 45.00,
  "upload_speed": 25600,
  "download_speed": 25600
}
```

#### Delete Plan
```http
DELETE /api/plans/1
```

---

### Sessions

#### Get Active Sessions
```http
GET /api/sessions/active
```

#### Get All Sessions
```http
GET /api/sessions
GET /api/sessions?username=john
GET /api/sessions?status=active
GET /api/sessions?limit=50
```

#### Get Session by ID
```http
GET /api/sessions/1
```

#### Get Session Statistics
```http
GET /api/sessions/stats
GET /api/sessions/stats?period=24h
GET /api/sessions/stats?period=7d
GET /api/sessions/stats?period=30d
```

#### Get Online Users Count
```http
GET /api/sessions/online-count
```

---

### RADIUS Logs

#### Get RADIUS Logs
```http
GET /api/radius/logs
GET /api/radius/logs?username=john
GET /api/radius/logs?request_type=Access-Request
GET /api/radius/logs?limit=100
```

---

### MikroTik API

#### Test Connection
```http
GET /api/mikrotik/test
```

Response:
```json
{
  "success": true,
  "connected": true,
  "identity": "MikroTik-Gateway",
  "uptime": "2w3d4h5m",
  "version": "7.13"
}
```

#### Get System Resources
```http
GET /api/mikrotik/resources
```

#### Get Interface Statistics
```http
GET /api/mikrotik/interfaces
```

#### Check RADIUS Configuration
```http
GET /api/mikrotik/radius-config
```

#### Get Active Hotspot Users
```http
GET /api/mikrotik/hotspot/active
```

#### Disconnect User
```http
POST /api/mikrotik/hotspot/disconnect/john
```

#### Disconnect by MAC
```http
POST /api/mikrotik/hotspot/disconnect-mac/AA:BB:CC:DD:EE:FF
```

#### Create Hotspot User
```http
POST /api/mikrotik/hotspot/users
Content-Type: application/json

{
  "username": "guest",
  "password": "guest123",
  "profile": "default",
  "comment": "Guest user"
}
```

#### Get All Hotspot Users
```http
GET /api/mikrotik/hotspot/users
```

#### Remove Hotspot User
```http
DELETE /api/mikrotik/hotspot/users/guest
```

#### Add Simple Queue (Bandwidth Limit)
```http
POST /api/mikrotik/queues
Content-Type: application/json

{
  "name": "queue-john",
  "target": "10.5.50.10/32",
  "upload_limit": 5120,
  "download_limit": 10240,
  "comment": "John's bandwidth limit"
}
```

#### Get All Simple Queues
```http
GET /api/mikrotik/queues
```

#### Update Simple Queue
```http
PUT /api/mikrotik/queues/queue-john
Content-Type: application/json

{
  "upload_limit": 10240,
  "download_limit": 20480
}
```

#### Remove Simple Queue
```http
DELETE /api/mikrotik/queues/queue-john
```

---

### Health Check

```http
GET /api/health
```

Response:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-01-14T12:00:00.000Z",
  "uptime": 3600
}
```

---

## Database Schema

### users
- User accounts with username/password
- Plan assignment and validity period
- Usage tracking (data and time)
- MAC address binding

### vouchers
- Prepaid voucher codes
- PIN support for extra security
- Batch management
- Status tracking (active, used, expired)

### plans
- Bandwidth limits (upload/download in Kbps)
- Time limits (session timeout, validity days)
- Data limits (total MB)
- Pricing information

### sessions
- Active and historical sessions
- Real-time usage tracking (bytes, packets)
- Session duration and timing
- Termination cause

### radius_logs
- Complete RADIUS packet logging
- Request and response attributes
- Authentication results
- Performance metrics

### routers
- MikroTik router information
- API credentials
- RADIUS configuration

---

## Testing with Postman

Import the Postman collection: [mikrotik-backend.postman_collection.json](docs/postman_collection.json)

Or test manually with curl:

```bash
# Create a user
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "test123",
    "plan_id": 1,
    "valid_until": "2025-12-31T23:59:59Z"
  }'

# Generate vouchers
curl -X POST http://localhost:3001/api/vouchers/generate \
  -H "Content-Type: application/json" \
  -d '{
    "plan_id": 1,
    "quantity": 10,
    "validity_days": 7
  }'

# Get active sessions
curl http://localhost:3001/api/sessions/active

# Test MikroTik connection
curl http://localhost:3001/api/mikrotik/test

# Get active hotspot users from MikroTik
curl http://localhost:3001/api/mikrotik/hotspot/active
```

---

## Troubleshooting

### RADIUS Authentication Issues

1. **Check RADIUS server is running**
   ```bash
   ps aux | grep node
   netstat -tuln | grep 1812
   ```

2. **Check RADIUS logs**
   ```bash
   tail -f logs/radius.log
   ```

3. **Verify RADIUS secret matches**
   - Backend: `.env` file `RADIUS_SECRET`
   - MikroTik: `/radius print`

4. **Test from MikroTik**
   ```bash
   /log print where topics~"radius"
   ```

### MikroTik API Issues

1. **Check API is enabled**
   ```bash
   /ip service print
   ```

2. **Test API connection**
   ```bash
   curl http://localhost:3001/api/mikrotik/test
   ```

3. **Check credentials in .env**
   ```env
   MIKROTIK_HOST=192.168.88.1
   MIKROTIK_USERNAME=admin
   MIKROTIK_PASSWORD=your_password
   ```

### Database Issues

1. **Check database connection**
   ```bash
   psql -U postgres -d wifi_billing -c "SELECT NOW();"
   ```

2. **Check database logs**
   ```bash
   tail -f logs/app.log | grep -i database
   ```

### Session Not Recording

1. **Verify RADIUS accounting is enabled on MikroTik**
   ```bash
   /ip hotspot profile print
   # Check: radius-accounting=yes
   ```

2. **Check accounting packets**
   ```bash
   tail -f logs/radius.log | grep Accounting
   ```

3. **Verify port 1813 is accessible**
   ```bash
   netstat -tuln | grep 1813
   ```

---

## Production Deployment

### Security Recommendations

1. **Use environment variables** - Never commit `.env` file
2. **Add authentication** - Implement JWT or API keys for REST API
3. **Enable HTTPS** - Use reverse proxy (Nginx) with SSL
4. **Firewall rules** - Restrict RADIUS and API ports to MikroTik IP only
5. **Strong passwords** - Use 20+ character RADIUS secrets
6. **Regular backups** - Backup database and MikroTik config
7. **Monitor logs** - Set up log rotation and monitoring

### Process Management

Use PM2 for production:

```bash
npm install -g pm2

# Start with PM2
pm2 start src/server.js --name mikrotik-backend

# Save PM2 config
pm2 save

# Setup PM2 startup
pm2 startup
```

### Reverse Proxy (Nginx)

```nginx
upstream mikrotik_backend {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://mikrotik_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Database Optimization

```sql
-- Create additional indexes for performance
CREATE INDEX idx_sessions_created_at ON sessions(created_at);
CREATE INDEX idx_radius_logs_nas_ip_created ON radius_logs(nas_ip_address, created_at);

-- Setup automatic cleanup of old logs (older than 90 days)
DELETE FROM radius_logs WHERE created_at < NOW() - INTERVAL '90 days';
```

---

## File Structure

```
mikrotik-backend/
├── src/
│   ├── config/
│   │   └── database.js          # PostgreSQL connection
│   ├── controllers/
│   │   ├── userController.js
│   │   ├── voucherController.js
│   │   ├── planController.js
│   │   ├── sessionController.js
│   │   └── mikrotikController.js
│   ├── services/
│   │   ├── radiusServer.js      # RADIUS authentication & accounting
│   │   ├── mikrotikApi.js       # MikroTik RouterOS API client
│   │   └── sessionManager.js    # Session management & auto-disconnect
│   ├── utils/
│   │   └── logger.js            # Winston logging
│   ├── routes/
│   │   └── index.js             # Express routes
│   └── server.js                # Main application entry
├── database/
│   ├── schema.sql               # Database schema
│   └── migrate.js               # Migration script
├── docs/
│   ├── MIKROTIK_CONFIGURATION.md
│   └── postman_collection.json
├── logs/
│   ├── app.log
│   └── radius.log
├── .env.example
├── package.json
└── README.md
```

---

## Support

For issues or questions:
1. Check logs: `logs/app.log` and `logs/radius.log`
2. Review [MIKROTIK_CONFIGURATION.md](docs/MIKROTIK_CONFIGURATION.md)
3. Test API endpoints with Postman collection
4. Check MikroTik logs: `/log print where topics~"radius"`

---

## License

MIT License - Free to use and modify

---

## Credits

Built with:
- Node.js & Express
- PostgreSQL
- radius (RADIUS protocol)
- routeros-client (MikroTik API)
- Winston (logging)

---

**Ready to deploy! Your production-ready MikroTik RADIUS backend is complete.**
