module.exports = function(RED) {
    const BASE_URL = 'https://rituals.apiv2.sense-company.com';

    function RitualsStatusNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        
        node.config = RED.nodes.getNode(config.config);

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

                const battc = await getSensor('battc');
                const wific = await getSensor('wific');
                const fillc = await getSensor('fillc');

                msg.payload = {
                    deviceHash: hash,
                    isOn: fanc === '1',
                    perfumeAmount: parseInt(speedc) || 0,
                    roomSize: roomc ? parseInt(roomc) : null,
                    battery: battc ? parseInt(battc) : null,
                    wifi: wific ? parseInt(wific) : null,
                    perfumeLevel: fillc ? parseInt(fillc) : null
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
