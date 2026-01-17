# MikroTik Router Configuration Guide

This guide provides complete step-by-step instructions for configuring your MikroTik router to work with the RADIUS backend.

## Prerequisites

- MikroTik RouterOS 6.x or 7.x
- Access to MikroTik via Winbox or SSH
- IP address of your RADIUS server (backend)
- RADIUS secret key (from your .env file)

## Network Topology Example

```
Internet --- [WAN: ether1] MikroTik Router [LAN: ether2] --- [bridge] --- Hotspot Network
                                   |
                            [RADIUS Backend]
                            IP: 192.168.1.100
```

---

## Step 1: Configure Network Interfaces

### 1.1 Set up WAN interface (Internet)

```bash
# If using DHCP client on WAN
/ip dhcp-client add interface=ether1 disabled=no

# If using static IP
/ip address add address=203.0.113.10/24 interface=ether1
/ip route add gateway=203.0.113.1
/ip dns set servers=8.8.8.8,8.8.4.4 allow-remote-requests=yes
```

### 1.2 Create bridge for LAN

```bash
# Create bridge
/interface bridge add name=bridge-hotspot

# Add LAN interface to bridge
/interface bridge port add bridge=bridge-hotspot interface=ether2

# Set bridge IP address
/ip address add address=10.5.50.1/24 interface=bridge-hotspot network=10.5.50.0
```

### 1.3 Configure NAT for Internet access

```bash
/ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade
```

---

## Step 2: Configure Hotspot

### 2.1 Run Hotspot Setup Wizard (Option 1 - Easy)

```bash
# Run the interactive setup wizard
/ip hotspot setup

# Follow prompts:
# - hotspot interface: bridge-hotspot
# - local address of network: 10.5.50.1/24
# - address pool: 10.5.50.2-10.5.50.254
# - ssl certificate: none
# - smtp server: 0.0.0.0
# - dns name: hotspot.local
# - dns server: use router DNS
# - local hotspot user: admin (create one for testing)
```

### 2.2 Manual Hotspot Configuration (Option 2 - Advanced)

```bash
# Create IP pool for hotspot clients
/ip pool add name=hotspot-pool ranges=10.5.50.2-10.5.50.254

# Create hotspot profile
/ip hotspot profile
add name=hotspot-profile \
    hotspot-address=10.5.50.1 \
    dns-name=hotspot.local \
    login-by=http-chap,https,http-pap \
    use-radius=yes

# Create hotspot server
/ip hotspot
add name=hotspot1 \
    interface=bridge-hotspot \
    address-pool=hotspot-pool \
    profile=hotspot-profile \
    disabled=no

# Create DHCP server for hotspot
/ip dhcp-server
add name=hotspot-dhcp \
    interface=bridge-hotspot \
    address-pool=hotspot-pool \
    lease-time=1h \
    disabled=no

/ip dhcp-server network
add address=10.5.50.0/24 \
    gateway=10.5.50.1 \
    dns-server=10.5.50.1 \
    netmask=24
```

---

## Step 3: Configure RADIUS

This is the **MOST IMPORTANT** section for integration with your backend.

### 3.1 Add RADIUS server

```bash
# Add RADIUS server for Authentication and Accounting
/radius
add service=hotspot \
    address=192.168.1.100 \
    secret="your_radius_secret_key_here" \
    authentication-port=1812 \
    accounting-port=1813 \
    timeout=3000ms \
    disabled=no

# IMPORTANT: Replace these values:
# - address: IP address of your RADIUS backend server
# - secret: Must match RADIUS_SECRET in your .env file
```

### 3.2 Enable RADIUS in Hotspot Profile

```bash
/ip hotspot profile
set hotspot-profile use-radius=yes

# Enable RADIUS accounting
/ip hotspot profile
set hotspot-profile \
    use-radius=yes \
    radius-accounting=yes \
    radius-interim-update=1m
```

### 3.3 Set RADIUS attributes

```bash
# Configure hotspot to accept RADIUS attributes
/ip hotspot profile
set hotspot-profile \
    use-radius=yes \
    radius-accounting=yes \
    radius-interim-update=1m \
    radius-default-domain="" \
    radius-location-id="" \
    radius-location-name=""
```

### 3.4 Set NAS-Identifier (Optional but recommended)

```bash
# Set a unique identifier for this router
/system identity set name=MikroTik-Gateway

# The NAS-Identifier will be sent in RADIUS packets
# This helps identify which router sent the request
```

---

## Step 4: Configure RADIUS Incoming

To accept RADIUS attributes like Mikrotik-Rate-Limit:

```bash
# Enable incoming RADIUS attributes
/radius incoming
set accept-attributes=rate-limit,session-timeout,idle-timeout
```

---

## Step 5: Create Hotspot User Profiles

### 5.1 Create user profiles matching your backend plans

```bash
# Default profile (no bandwidth limit - controlled by RADIUS)
/ip hotspot user profile
add name=default \
    shared-users=1 \
    rate-limit="" \
    idle-timeout=none \
    keepalive-timeout=2m \
    status-autorefresh=1m \
    transparent-proxy=no

# Profile for 2Mbps plan (fallback if RADIUS fails)
/ip hotspot user profile
add name=2mbps-plan \
    rate-limit=2M/2M \
    shared-users=1 \
    idle-timeout=5m

# Profile for 5Mbps plan
/ip hotspot user profile
add name=5mbps-plan \
    rate-limit=5M/5M \
    shared-users=1 \
    idle-timeout=5m

# Profile for 10Mbps plan
/ip hotspot user profile
add name=10mbps-plan \
    rate-limit=10M/10M \
    shared-users=1 \
    idle-timeout=5m
```

**Note:** When using RADIUS, bandwidth limits from RADIUS will override these profile limits.

---

## Step 6: Test RADIUS Connection

### 6.1 Test RADIUS authentication

```bash
# Create a test user (for testing only)
/ip hotspot user add name=testuser password=testpass profile=default

# Check RADIUS status
/radius print

# Monitor RADIUS requests
/radius monitor 0

# Check logs for RADIUS authentication
/log print where topics~"radius"
```

### 6.2 Test from client device

1. Connect to the hotspot WiFi network
2. Open a web browser - you should see the login page
3. Try logging in with a user from your backend database
4. Check backend logs: `tail -f logs/radius.log`

---

## Step 7: Enable API Access (For Backend Integration)

The backend needs API access to disconnect users and manage queues.

### 7.1 Enable API service

```bash
# Enable API
/ip service
set api address=192.168.1.100/32 disabled=no port=8728

# For security, only allow backend server IP
# Replace 192.168.1.100 with your backend server IP
```

### 7.2 Create API user

```bash
# Create dedicated API user with limited permissions
/user group
add name=api-group \
    policy=api,read,write,policy,test,!local,!telnet,!ssh,!ftp,!reboot,!password

# Create API user
/user
add name=api-user \
    password=your_secure_api_password \
    group=api-group

# IMPORTANT: Update these credentials in your backend .env file:
# MIKROTIK_USERNAME=api-user
# MIKROTIK_PASSWORD=your_secure_api_password
```

---

## Step 8: Configure Firewall Rules

### 8.1 Allow hotspot traffic

```bash
# Allow hotspot clients to access router
/ip firewall filter
add chain=input protocol=tcp dst-port=80,443 src-address=10.5.50.0/24 \
    action=accept comment="Allow Hotspot HTTP/HTTPS"

# Allow DNS from hotspot clients
add chain=input protocol=udp dst-port=53 src-address=10.5.50.0/24 \
    action=accept comment="Allow Hotspot DNS"

# Allow RADIUS from backend
add chain=input protocol=udp src-address=192.168.1.100 dst-port=1812,1813 \
    action=accept comment="Allow RADIUS"

# Allow API from backend
add chain=input protocol=tcp src-address=192.168.1.100 dst-port=8728 \
    action=accept comment="Allow API"
```

### 8.2 Drop invalid hotspot traffic

```bash
/ip firewall filter
add chain=input src-address=10.5.50.0/24 action=drop \
    comment="Drop other hotspot traffic to router"
```

---

## Step 9: Bandwidth Management (Simple Queues)

If you want to manage bandwidth via Simple Queues (in addition to RADIUS):

```bash
# Example: Create queue for a specific user
/queue simple
add name="user-john" \
    target=10.5.50.10/32 \
    max-limit=5M/5M \
    burst-limit=6M/6M \
    burst-threshold=4M/4M \
    burst-time=8s/8s \
    comment="User: john"

# The backend API can create/modify/delete these queues automatically
```

---

## Step 10: Logging and Monitoring

### 10.1 Enable detailed RADIUS logging

```bash
# Enable RADIUS logging
/system logging
add topics=radius action=memory
add topics=radius action=disk

# View RADIUS logs
/log print where topics~"radius"
```

### 10.2 Monitor active hotspot users

```bash
# View active hotspot sessions
/ip hotspot active print

# View hotspot users
/ip hotspot user print

# View bandwidth usage (simple queues)
/queue simple print stats
```

### 10.3 Monitor system resources

```bash
# View system resources
/system resource print

# Monitor CPU and memory
/system resource monitor
```

---

## Step 11: Verify Configuration

### 11.1 Check RADIUS configuration

```bash
# Print RADIUS servers
/radius print detail

# Expected output:
# 0  service=hotspot address=192.168.1.100 secret="***"
#    authentication-port=1812 accounting-port=1813 timeout=3s
```

### 11.2 Check hotspot configuration

```bash
# Print hotspot server
/ip hotspot print detail

# Print hotspot profile
/ip hotspot profile print detail

# Verify use-radius=yes
```

### 11.3 Test RADIUS authentication manually

```bash
# From backend server, use radtest:
radtest testuser testpass 192.168.88.1 1812 your_radius_secret

# Or use the backend API test endpoint:
curl http://localhost:3001/api/mikrotik/test
```

---

## Troubleshooting

### Issue: Users cannot authenticate

**Check:**
1. RADIUS server is running: `ps aux | grep node`
2. RADIUS port is accessible: `netstat -an | grep 1812`
3. RADIUS secret matches in .env and MikroTik config
4. Firewall allows RADIUS traffic
5. Check RADIUS logs: `tail -f logs/radius.log`
6. Check MikroTik logs: `/log print where topics~"radius"`

### Issue: Users authenticate but have no bandwidth limit

**Check:**
1. RADIUS is returning Mikrotik-Rate-Limit attribute
2. Check backend logs for Access-Accept response
3. Verify user has a plan assigned in database
4. Check if radius-incoming is configured:
   ```bash
   /radius incoming print
   ```

### Issue: Accounting not working (sessions not recording)

**Check:**
1. Accounting port (1813) is accessible
2. RADIUS accounting is enabled:
   ```bash
   /ip hotspot profile print
   # Verify: radius-accounting=yes
   ```
3. Interim-update interval is set:
   ```bash
   /ip hotspot profile print
   # Verify: radius-interim-update=1m
   ```
4. Check backend accounting logs

### Issue: Cannot connect to router via API

**Check:**
1. API service is enabled: `/ip service print`
2. API port (8728) is accessible from backend
3. Credentials match backend .env configuration
4. Firewall allows API traffic from backend IP

### Issue: Users get disconnected immediately after login

**Check:**
1. Session-Timeout attribute from RADIUS
2. User account validity in database
3. Data limit not exceeded
4. Check backend session manager logs

---

## Security Best Practices

### 1. Change default passwords
```bash
/user set admin password=new_strong_password
```

### 2. Disable unused services
```bash
/ip service
set telnet disabled=yes
set ftp disabled=yes
set www disabled=no
set ssh disabled=no
set api disabled=no
set winbox address=192.168.1.0/24 disabled=no
```

### 3. Use strong RADIUS secret
- Minimum 20 characters
- Mix of letters, numbers, symbols
- Different from other passwords

### 4. Restrict API access
```bash
/ip service set api address=192.168.1.100/32
```

### 5. Regular backups
```bash
/system backup save name=backup-$(date +%Y%m%d)
```

---

## Quick Command Reference

```bash
# View active hotspot users
/ip hotspot active print

# Disconnect a user
/ip hotspot active remove [find user=username]

# View RADIUS logs
/log print where topics~"radius"

# View hotspot users
/ip hotspot user print

# Test RADIUS server
/radius monitor 0

# View system resources
/system resource print

# Backup configuration
/export file=backup

# Restore configuration
/import backup.rsc
```

---

## Complete Configuration Script

Here's a complete script you can copy and paste (modify values as needed):

```bash
# ================================================
# COMPLETE MIKROTIK HOTSPOT + RADIUS CONFIGURATION
# ================================================

# SET YOUR VALUES HERE
:local radiusServer "192.168.1.100"
:local radiusSecret "your_radius_secret_key_here"
:local hotspotInterface "bridge-hotspot"
:local hotspotNetwork "10.5.50.0/24"
:local hotspotGateway "10.5.50.1"
:local hotspotPoolStart "10.5.50.2"
:local hotspotPoolEnd "10.5.50.254"
:local wanInterface "ether1"
:local lanInterface "ether2"

# Create bridge
/interface bridge add name=$hotspotInterface

# Add LAN to bridge
/interface bridge port add bridge=$hotspotInterface interface=$lanInterface

# Set bridge IP
/ip address add address=$hotspotGateway/24 interface=$hotspotInterface

# Create IP pool
/ip pool add name=hotspot-pool ranges="$hotspotPoolStart-$hotspotPoolEnd"

# Add RADIUS server
/radius add \
    service=hotspot \
    address=$radiusServer \
    secret=$radiusSecret \
    authentication-port=1812 \
    accounting-port=1813 \
    timeout=3000ms

# Create hotspot profile
/ip hotspot profile add \
    name=hotspot-profile \
    hotspot-address=$hotspotGateway \
    dns-name=hotspot.local \
    login-by=http-chap,https,http-pap \
    use-radius=yes \
    radius-accounting=yes \
    radius-interim-update=1m

# Create hotspot user profile
/ip hotspot user profile add \
    name=default \
    shared-users=1 \
    idle-timeout=5m

# Create hotspot server
/ip hotspot add \
    name=hotspot1 \
    interface=$hotspotInterface \
    address-pool=hotspot-pool \
    profile=hotspot-profile

# Configure DHCP
/ip dhcp-server add \
    name=hotspot-dhcp \
    interface=$hotspotInterface \
    address-pool=hotspot-pool \
    lease-time=1h

/ip dhcp-server network add \
    address=$hotspotNetwork \
    gateway=$hotspotGateway \
    dns-server=$hotspotGateway

# Enable NAT
/ip firewall nat add \
    chain=srcnat \
    out-interface=$wanInterface \
    action=masquerade

# Enable API (restrict to backend IP)
/ip service set api address=$radiusServer/32 port=8728 disabled=no

:put "Configuration complete! Please create API user and configure backend .env file."
```

---

## Support and Documentation

- MikroTik Wiki: https://wiki.mikrotik.com/wiki/Manual:Hotspot
- RADIUS Documentation: https://wiki.mikrotik.com/wiki/Manual:RADIUS_Client
- Backend API Documentation: See README.md in backend directory

---

**Configuration complete! Your MikroTik router is now ready to work with the RADIUS backend.**
