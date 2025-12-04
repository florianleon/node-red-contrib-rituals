module.exports = function(RED) {
    const BASE_URL = 'https://rituals.apiv2.sense-company.com';

    function RitualsStatusNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        
        node.config = RED.nodes.getNode(config.config);
        
        // Store last known values
        node.lastWifi = null;
        node.lastPerfumeLevel = null;

        if (!node.config) {
            node.error('Missing Rituals configuration');
            return;
        }

        node.on('input', async function(msg) {
            try {
                node.status({ fill: 'blue', shape: 'dot', text: 'getting status...' });

                const hash = msg.deviceHash || msg.payload.deviceHash;

                if (!hash) {
                    throw new Error('deviceHash is required');
                }

                const getUrl = (attr) => `${BASE_URL}/apiv2/hubs/${hash}/attributes/${attr}`;
                const getSensorUrl = (sensor) => `${BASE_URL}/apiv2/hubs/${hash}/sensors/${sensor}`;

                // Get main attributes
                const fanc = await node.config.apiRequest('GET', getUrl('fanc'));
                const speedc = await node.config.apiRequest('GET', getUrl('speedc'));
                
                let roomc = null;
                try {
                    roomc = await node.config.apiRequest('GET', getUrl('roomc'));
                } catch (e) {}

                // Get sensors
                const getSensor = async (sensor) => {
                    try {
                        return await node.config.apiRequest('GET', getSensorUrl(sensor));
                    } catch (e) {
                        return null;
                    }
                };

                const wific = await getSensor('wific');
                const fillc = await getSensor('fillc');

                // Parse values from API response objects
                const getFancValue = (data) => data?.value || data;
                const getSpeedcValue = (data) => data?.value || data;
                const getRoomcValue = (data) => data?.value || data;
                const getSensorValue = (data) => data?.raw || data?.value || data;

                // Update last known values if available
                // WiFi signal: convert from dBm to percentage (rough approximation)
                const wifiRaw = wific ? parseInt(getSensorValue(wific)) : null;
                const wifiValue = wifiRaw !== null ? Math.min(100, Math.max(0, 100 + wifiRaw)) : null;
                
                // Perfume level: 30ml cartridge, raw value likely in 0.01ml units
                const perfumeRaw = fillc ? parseInt(getSensorValue(fillc)) : null;
                const perfumeValue = perfumeRaw !== null ? Math.min(100, Math.round((perfumeRaw / 16000) * 100)) : null;
                
                if (wifiValue !== null) node.lastWifi = wifiValue;
                if (perfumeValue !== null) node.lastPerfumeLevel = perfumeValue;

                msg.payload = {
                    deviceHash: hash,
                    isOn: getFancValue(fanc) === '1',
                    perfumeAmount: parseInt(getSpeedcValue(speedc)) || 0,
                    roomSize: roomc ? parseInt(getRoomcValue(roomc)) : null,
                    wifi: node.lastWifi,
                    perfumeLevel: node.lastPerfumeLevel
                };

                node.status({ fill: 'green', shape: 'dot', text: fanc === '1' ? 'on' : 'off' });
                node.send(msg);

                setTimeout(() => node.status({}), 3000);

            } catch (error) {
                node.status({ fill: 'red', shape: 'ring', text: error.message });
                node.error('Get status failed: ' + error.message, msg);
                msg.payload = { success: false, error: error.message };
                node.send(msg);
            }
        });
    }

    RED.nodes.registerType('rituals-status', RitualsStatusNode);
};
