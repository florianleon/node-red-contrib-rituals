module.exports = function(RED) {
    const BASE_URL = 'https://rituals.apiv2.sense-company.com';

    function RitualsPerfumeNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        
        node.config = RED.nodes.getNode(config.config);
        node.amount = config.amount;

        if (!node.config) {
            node.error('Missing Rituals configuration');
            return;
        }

        node.on('input', async function(msg) {
            try {
                node.status({ fill: 'blue', shape: 'dot', text: 'setting...' });

                const hash = msg.deviceHash || msg.payload.deviceHash;
                const amount = parseInt(msg.perfumeAmount || msg.payload.perfumeAmount || node.amount);

                if (!hash) {
                    throw new Error('deviceHash is required');
                }

                if (amount < 1 || amount > 3) {
                    throw new Error('Perfume amount must be between 1 and 3');
                }

                const url = `${BASE_URL}/apiv2/hubs/${hash}/attributes/speedc`;
                await node.config.apiRequest('POST', url, { speedc: amount.toString() });

                msg.payload = {
                    success: true,
                    deviceHash: hash,
                    perfumeAmount: amount
                };

                node.status({ fill: 'green', shape: 'dot', text: `set to ${amount}` });
                node.send(msg);

                setTimeout(() => node.status({}), 3000);

            } catch (error) {
                node.status({ fill: 'red', shape: 'ring', text: error.message });
                node.error('Set perfume amount failed: ' + error.message, msg);
                msg.payload = { success: false, error: error.message };
                node.send(msg);
            }
        });
    }

    RED.nodes.registerType('rituals-perfume', RitualsPerfumeNode);
};
