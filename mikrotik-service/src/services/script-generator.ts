// MikroTik Script Generator
// Generates RouterOS scripts for ISPs to configure their routers

import config from '../config';

export interface ScriptGeneratorOptions {
    routerName: string;
    routerId: number;
    nasIdentifier: string;
    radiusSecret: string;
    callbackToken: string;
    serviceUrl: string;
    routerRole: 'hotspot' | 'pppoe' | 'edge';
}

/**
 * Generate all setup scripts for a router
 */
export function generateSetupScripts(options: ScriptGeneratorOptions): {
    radiusScript: string;
    heartbeatScript: string;
    activeUsersScript: string;
    fullSetupScript: string;
    instructions: string;
} {
    const radiusScript = generateRadiusScript(options);
    const heartbeatScript = generateHeartbeatScript(options);
    const activeUsersScript = generateActiveUsersScript(options);

    // Combined full setup script
    const fullSetupScript = `
# ============================================
# Nolojia Billing - Full Router Setup Script
# Router: ${options.routerName}
# Generated: ${new Date().toISOString()}
# ============================================
# IMPORTANT: Review this script before running!
# This will configure RADIUS and scheduled tasks.
# ============================================

${radiusScript}

${heartbeatScript}

${activeUsersScript}

:log info "Nolojia Billing setup complete for ${options.routerName}"
`;

    const instructions = generateInstructions(options);

    return {
        radiusScript,
        heartbeatScript,
        activeUsersScript,
        fullSetupScript,
        instructions
    };
}

/**
 * Generate RADIUS configuration script
 */
function generateRadiusScript(options: ScriptGeneratorOptions): string {
    const radiusHost = new URL(options.serviceUrl).hostname;

    return `
# ============================================
# RADIUS Configuration
# ============================================

# Remove existing Nolojia RADIUS entry if exists
:do {
    /radius remove [find where comment="Nolojia Billing"]
} on-error={}

# Add RADIUS server
/radius add \\
    address=${radiusHost} \\
    secret="${options.radiusSecret}" \\
    service=ppp,hotspot \\
    authentication-port=1812 \\
    accounting-port=1813 \\
    timeout=3s \\
    comment="Nolojia Billing"

# Configure PPPoE to use RADIUS (if applicable)
${options.routerRole === 'pppoe' || options.routerRole === 'edge' ? `
/ppp profile
:foreach profile in=[find] do={
    set $profile use-radius=yes
}
` : '# PPPoE not configured for this router role'}

# Configure Hotspot to use RADIUS (if applicable)
${options.routerRole === 'hotspot' || options.routerRole === 'edge' ? `
/ip hotspot profile
:foreach profile in=[find] do={
    set $profile use-radius=yes
}
` : '# Hotspot not configured for this router role'}

:log info "RADIUS configured for Nolojia Billing"
`;
}

/**
 * Generate heartbeat script (router health push)
 */
function generateHeartbeatScript(options: ScriptGeneratorOptions): string {
    const callbackUrl = `${options.serviceUrl}/api/callback/heartbeat`;

    return `
# ============================================
# Heartbeat Script - Sends router health to cloud
# ============================================

# Remove existing heartbeat script/scheduler
:do { /system script remove [find where name="nolojia-heartbeat"] } on-error={}
:do { /system scheduler remove [find where name="nolojia-heartbeat"] } on-error={}

# Create heartbeat script
/system script add name="nolojia-heartbeat" policy=read,write,test source={
    # Get system resources
    :local cpuLoad [/system resource get cpu-load]
    :local freeMemory [/system resource get free-memory]
    :local totalMemory [/system resource get total-memory]
    :local uptime [/system resource get uptime]
    :local version [/system resource get version]
    :local boardName [/system resource get board-name]
    :local identity [/system identity get name]
    
    # Count active sessions
    :local pppoeCount 0
    :local hotspotCount 0
    :do { :set pppoeCount [/ppp active print count-only] } on-error={}
    :do { :set hotspotCount [/ip hotspot active print count-only] } on-error={}
    
    # Build JSON payload
    :local payload "{\\\"routerId\\\":${options.routerId},\\\"token\\\":\\\"${options.callbackToken}\\\",\\\"identity\\\":\\\"$identity\\\",\\\"cpuLoad\\\":$cpuLoad,\\\"freeMemory\\\":$freeMemory,\\\"totalMemory\\\":$totalMemory,\\\"uptime\\\":\\\"$uptime\\\",\\\"version\\\":\\\"$version\\\",\\\"boardName\\\":\\\"$boardName\\\",\\\"pppoeActive\\\":$pppoeCount,\\\"hotspotActive\\\":$hotspotCount}"
    
    # Send to Nolojia
    :do {
        /tool fetch url="${callbackUrl}" \\
            http-method=post \\
            http-header-field="Content-Type: application/json" \\
            http-data=$payload \\
            output=none
    } on-error={
        :log warning "Nolojia heartbeat failed"
    }
}

# Schedule heartbeat every minute
/system scheduler add name="nolojia-heartbeat" \\
    interval=1m \\
    on-event="/system script run nolojia-heartbeat" \\
    policy=read,write,test \\
    start-time=startup

:log info "Heartbeat script configured"
`;
}

/**
 * Generate active users push script
 */
function generateActiveUsersScript(options: ScriptGeneratorOptions): string {
    const callbackUrl = `${options.serviceUrl}/api/callback/active-users`;

    return `
# ============================================
# Active Users Script - Syncs connected users to cloud
# ============================================

# Remove existing script/scheduler
:do { /system script remove [find where name="nolojia-active-users"] } on-error={}
:do { /system scheduler remove [find where name="nolojia-active-users"] } on-error={}

# Create active users script
/system script add name="nolojia-active-users" policy=read,write,test source={
    :local users ""
    :local first true
    
    # Get PPPoE active users
    :foreach session in=[/ppp active find] do={
        :local name [/ppp active get $session name]
        :local address [/ppp active get $session address]
        :local uptime [/ppp active get $session uptime]
        :local service [/ppp active get $session service]
        
        :if ($first) do={
            :set first false
        } else={
            :set users ($users . ",")
        }
        :set users ($users . "{\\\"username\\\":\\\"$name\\\",\\\"ip\\\":\\\"$address\\\",\\\"uptime\\\":\\\"$uptime\\\",\\\"type\\\":\\\"pppoe\\\",\\\"service\\\":\\\"$service\\\"}")
    }
    
    # Get Hotspot active users
    :foreach session in=[/ip hotspot active find] do={
        :local user [/ip hotspot active get $session user]
        :local address [/ip hotspot active get $session address]
        :local uptime [/ip hotspot active get $session uptime]
        :local server [/ip hotspot active get $session server]
        
        :if ($first) do={
            :set first false
        } else={
            :set users ($users . ",")
        }
        :set users ($users . "{\\\"username\\\":\\\"$user\\\",\\\"ip\\\":\\\"$address\\\",\\\"uptime\\\":\\\"$uptime\\\",\\\"type\\\":\\\"hotspot\\\",\\\"server\\\":\\\"$server\\\"}")
    }
    
    # Build JSON payload
    :local payload "{\\\"routerId\\\":${options.routerId},\\\"token\\\":\\\"${options.callbackToken}\\\",\\\"users\\\":[$users]}"
    
    # Send to Nolojia
    :do {
        /tool fetch url="${callbackUrl}" \\
            http-method=post \\
            http-header-field="Content-Type: application/json" \\
            http-data=$payload \\
            output=none
    } on-error={
        :log warning "Nolojia active users sync failed"
    }
}

# Schedule every minute (offset by 30 seconds from heartbeat)
/system scheduler add name="nolojia-active-users" \\
    interval=1m \\
    on-event="/system script run nolojia-active-users" \\
    policy=read,write,test \\
    start-time=00:00:30

:log info "Active users script configured"
`;
}

/**
 * Generate setup instructions
 */
function generateInstructions(options: ScriptGeneratorOptions): string {
    return `
# Setup Instructions for ${options.routerName}
# =============================================

## Quick Setup (Recommended)

1. Open Winbox or WebFig on your MikroTik router
2. Go to System → Scripts → New Terminal
3. Paste the "Full Setup Script" and press Enter
4. Wait for "Nolojia Billing setup complete" message

## Manual Setup

If you prefer to set up components individually:

1. Run the "RADIUS Configuration" script first
2. Run the "Heartbeat Script" 
3. Run the "Active Users Script"

## Verification

After running the scripts, verify:

1. Check RADIUS is configured:
   /radius print
   
2. Check scripts are created:
   /system script print
   
3. Check schedulers are running:
   /system scheduler print

4. Check logs for heartbeat activity:
   /log print where topics~"script"

## Troubleshooting

If heartbeat fails:
- Check internet connectivity from router
- Verify DNS resolution works
- Check firewall allows outbound HTTP/HTTPS

If RADIUS auth fails:
- Verify RADIUS secret matches
- Check ports 1812/1813 are not blocked
- Review /log for RADIUS errors

## Support

For issues, contact Nolojia support with:
- Router ID: ${options.routerId}
- NAS Identifier: ${options.nasIdentifier}
`;
}

export default {
    generateSetupScripts
};
