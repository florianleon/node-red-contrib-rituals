module.exports = function(RED) {
    const axios = require('axios');

    const BASE_URL = 'https://rituals.apiv2.sense-company.com';
    const AUTH_URL = `${BASE_URL}/apiv2/account/token`;
    const HUBS_URL = `${BASE_URL}/apiv2/account/hubs`;

    function RitualsAuthNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        
        node.on('input', async function(msg) {
            try {
                node.status({ fill: 'blue', shape: 'dot', text: 'authentificating...' });

                // Get config node
                const ritualsConfig = RED.nodes.getNode(config.config);
                if (!ritualsConfig) {
                    throw new Error('Missing Rituals configuration');
                }

                // Authenticate and get token
                node.log('Authentificating with Rituals API...');
                const authResponse = await axios.post(AUTH_URL, {
                    email: ritualsConfig.email,
                    password: ritualsConfig.credentials.password
                }, {
                    headers: {
                        'Accept': '*/*',
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });

                if (!authResponse.data || !authResponse.data.success) {
                    throw new Error(authResponse.data.message || 'Authentification failed');
                }

                const token = authResponse.data.success;
                node.log('Authentification successful!');

                // Get devices
                node.status({ fill: 'blue', shape: 'dot', text: 'getting devices...' });
                const devicesResponse = await axios.get(HUBS_URL, {
                    headers: {
                        'Accept': '*/*',
                        'Authorization': token
                    },
                    timeout: 10000
                });

                const devices = devicesResponse.data;
                node.log(`Found ${devices.length} device(s)`);

                // Calculate token expiry (24 hours from now)
                const expiryTime = Date.now() + (24 * 60 * 60 * 1000);
                
                // Store in context
                node.context().global.set('ritualsToken', token);
                node.context().global.set('ritualsTokenExpiry', expiryTime);
                node.context().global.set('ritualsDevices', devices);
                node.context().flow.set('ritualsToken', token);
                node.context().flow.set('ritualsTokenExpiry', expiryTime);
                node.context().flow.set('ritualsDevices', devices);

                // Create simplified device list
                const deviceList = devices.map(d => ({
                    hash: d.hash,
                    hublot: d.hublot,
                    name: d.attributeValues?.roomnamec || 'Unnamed',
                    room: d.attributeValues?.fspacenamec || '',
                    isOnline: d.status === 1,
                    isOn: d.attributeValues?.fanc === '1'
                }));

                // Output - store full token and devices in msg properties
                msg.ritualsToken = token;  // Full token here
                msg.ritualsTokenExpiry = expiryTime;  // Expiry timestamp
                msg.ritualsDevices = devices;  // Full device data here
                
                const expiryDate = new Date(expiryTime);
                msg.payload = {
                    authenticated: true,
                    tokenLength: token.length,
                    deviceCount: devices.length,
                    devices: deviceList,
                    expiresAt: expiryDate.toLocaleString(),
                    expiresIn: '24 hours',
                    storage: 'persistent (file)',
                    message: 'Token stored in persistent context - will survive Node-RED restarts'
                };

                node.status({ fill: 'green', shape: 'dot', text: `authenticated - ${devices.length} device(s)` });
                node.send(msg);
                
                // Clear status after 5 seconds
                setTimeout(() => node.status({}), 5000);

            } catch (error) {
                node.status({ fill: 'red', shape: 'ring', text: error.message });
                node.error('Authentification failed: ' + error.message, msg);
                
                msg.payload = {
                    authenticated: false,
                    error: error.message
                };
                node.send(msg);
            }
        });

        node.on('close', function() {
            node.status({});
        });
    }

    RED.nodes.registerType('rituals-auth', RitualsAuthNode);
};
