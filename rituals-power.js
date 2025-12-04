module.exports = function(RED) {
    const BASE_URL = 'https://rituals.apiv2.sense-company.com';

    function RitualsPowerNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        
        node.config = RED.nodes.getNode(config.config);
        node.action = config.action;

        if (!node.config) {
            node.error('Missing Rituals configuration');
            return;
        }

        node.on('input', async function(msg) {
            try {
                node.status({ fill: 'blue', shape: 'dot', text: 'switching...' });

                const hash = msg.deviceHash || msg.payload.deviceHash;
                const action = msg.action || msg.payload.action || node.action;

                if (!hash) {
                    throw new Error('deviceHash is required');
                }

                const value = action === 'on' ? '1' : '0';
                const url = `${BASE_URL}/apiv2/hubs/${hash}/attributes/fanc`;
                await node.config.apiRequest('POST', url, { fanc: value });

                msg.payload = {
                    success: true,
                    deviceHash: hash,
                    action: action,
                    isOn: action === 'on'
                };

                node.status({ fill: 'green', shape: 'dot', text: action });
                node.send(msg);

                setTimeout(() => node.status({}), 3000);

            } catch (error) {
                node.status({ fill: 'red', shape: 'ring', text: error.message });
                node.error('Power control failed: ' + error.message, msg);
                msg.payload = { success: false, error: error.message };
                node.send(msg);
            }
        });
    }

    RED.nodes.registerType('rituals-power', RitualsPowerNode);
};
