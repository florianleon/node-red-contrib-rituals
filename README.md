# node-red-contrib-rituals

Node-RED nodes for controlling Rituals Perfume Genie diffusers using the V2 API.

## Features

- 🔐 Authentication and persistent token storage
- 🔍 Automatic device discovery
- 💨 Power control (on/off)
- 🎚️ Perfume intensity control (1-3)
- 📊 Device status monitoring (battery, WiFi, perfume level)
- ✅ Token validation helper

## Installation

### From GitHub (Recommended for Home Assistant)

Navigate to your Node-RED directory and run:

```bash
cd ~/.node-red  # or /config/node-red for Home Assistant
npm install https://github.com/florianleon/node-red-contrib-rituals
```

Restart Node-RED after installation.

### Via npm (when published)

```bash
npm install node-red-contrib-rituals
```

## Nodes

### 1. Rituals Config
Configuration node to store your Rituals account credentials (email/password).

### 2. Rituals Auth
Authenticate and store token + device list in context. Run once on startup.

### 3. Rituals Token Check
Validate stored token and extract device hash. Use before control nodes.

### 4. Rituals Power
Turn device on or off. Configure action in node or via `msg.action`.

### 5. Rituals Perfume
Set perfume intensity (1-3). Configure amount in node or via `msg.perfumeAmount`.

### 6. Rituals Status
Get device status (power, intensity, battery, WiFi, perfume level).

## Quick Start

### 1. Add Rituals Config Node
- Add any Rituals node to your flow
- Click the pencil icon next to "Config"
- Enter your Rituals account email and password
- Click "Add"

### 2. Authenticate Once
```
[Inject: once on startup] → [Rituals Auth] → [Debug]
```
This stores your token and device list in context (persists across deploys).

### 3. Control Your Device
```
[Inject] → [Token Check] → [Rituals Power] → [Debug]
```
Token Check validates and provides device hash automatically.

## Basic Usage Examples

### Turn Device On/Off
```
[Inject: button] → [Token Check] → [Rituals Power: "on"] → [Debug]
```
The Power node is pre-configured with "on" or "off" action.

### Set Perfume Intensity
```
[Inject: button] → [Token Check] → [Rituals Perfume: "3"] → [Debug]
```
Configure intensity (1-3) in the Perfume node, or override with `msg.perfumeAmount`.

### Get Device Status
```
[Inject: repeat 5min] → [Token Check] → [Rituals Status] → [Debug]
```
Returns: `isOn`, `perfumeAmount`, `battery`, `wifi`, `perfumeLevel`.

### Dynamic Control with Function Node
```
[Inject] → [Function] → [Rituals Power] → [Debug]
```

Function node:
```javascript
const devices = flow.get('ritualsDevices');
msg.deviceHash = devices[0].hash;
msg.action = 'on';  // or 'off'
return msg;
```

## Advanced: Token Management

### Check Token Before Operations
```
[Inject] → [Token Check] ──valid──→ [Rituals Power]
                 │
             invalid
                 ↓
          [Rituals Auth] → retry
```
Token Check has 2 outputs: valid (top) and invalid (bottom).

## Home Assistant Integration

### Install in Home Assistant
SSH into your Home Assistant:
```bash
cd /config/node-red
npm install https://github.com/florianleon/node-red-contrib-rituals
```
Restart Node-RED add-on.

### Example Flow for HA
Use with node-red-contrib-home-assistant-websocket to create native HA entities

## Example Flows

## Example Flow

Import the example flow from `examples/example-flow.json` to get started quickly. It includes:
- Startup authentication
- Turn on/off with token validation
- Set perfume intensity
- Get device status

## Context Variables

After authentication, these variables are stored in flow context:
- `ritualsToken` - Authentication token (24h validity)
- `ritualsTokenExpiry` - Token expiration timestamp
- `ritualsDevices` - Array of all your devices

Access in function nodes:
```javascript
const devices = flow.get('ritualsDevices');
const hash = devices[0].hash;
```

## Troubleshooting

### Authentication Failed
- Verify your email and password are correct
- Check that you can log in to the Rituals app
- Ensure internet connection is working

### "No token found"
- Run the Rituals Auth node first
- Check debug output for authentication success

### Token expired
- Tokens are valid for 24 hours
- Run Rituals Auth again to refresh
- Consider setting up automatic refresh (inject every 23 hours)

### Device not responding
- Ensure device is online and connected to WiFi
- Check device status with Rituals Status node
- Verify deviceHash is correct

## API Reference

Uses Rituals V2 API:
- Authentication: `POST /apiv2/account/token`
- Get Hubs: `GET /apiv2/account/hubs`
- Control: `POST /apiv2/hubs/{hash}/attributes/{attr}`
- Status: `GET /apiv2/hubs/{hash}/attributes/{attr}`

## License

MIT License

## Disclaimer

Unofficial project, not affiliated with Rituals Cosmetics.
