module.exports = function(RED) {
    function RitualsTokenCheckNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.on('input', function(msg) {
            try {
                // Get token and expiry from context
                const token = node.context().global.get('ritualsToken') || node.context().flow.get('ritualsToken');
                const tokenExpiry = node.context().global.get('ritualsTokenExpiry') || node.context().flow.get('ritualsTokenExpiry');
                const devices = node.context().global.get('ritualsDevices') || node.context().flow.get('ritualsDevices');

                // Check if token exists
                if (!token) {
                    node.status({ fill: 'red', shape: 'ring', text: 'no token found' });
                    msg.payload = {
                        valid: false,
                        error: 'No token found',
                        message: 'Please run the Rituals Auth node first'
                    };
                    node.send([null, msg]); // Send to output 2 (invalid)
                    return;
                }

                // Check if token is expired
                const now = Date.now();
                const isExpired = tokenExpiry && now > tokenExpiry;

                if (isExpired) {
                    const expiredDate = new Date(tokenExpiry);
                    node.status({ fill: 'yellow', shape: 'ring', text: 'token expired' });
                    msg.payload = {
                        valid: false,
                        expired: true,
                        expiredAt: expiredDate.toLocaleString(),
                        message: 'Token expired. Please re-authenticate.'
                    };
                    node.send([null, msg]); // Send to output 2 (invalid)
                    return;
                }

                // Token is valid
                const expiresIn = tokenExpiry ? Math.floor((tokenExpiry - now) / (1000 * 60 * 60)) : 'unknown';
                const expiryDate = tokenExpiry ? new Date(tokenExpiry) : null;
                
                node.status({ fill: 'green', shape: 'dot', text: `valid (${expiresIn}h left)` });
                
                msg.payload = {
                    valid: true,
                    tokenLength: token.length,
                    expiresIn: tokenExpiry ? `${expiresIn} hours` : 'unknown',
                    expiresAt: expiryDate ? expiryDate.toLocaleString() : 'unknown',
                    deviceCount: devices ? devices.length : 0,
                    message: 'Token is valid'
                };

                // Add token and devices to msg for convenience
                msg.ritualsToken = token;
                msg.ritualsDevices = devices;

                // If devices exist, add first device hash for quick access
                if (devices && devices.length > 0) {
                    msg.deviceHash = devices[0].hash;
                    msg.payload.firstDeviceHash = devices[0].hash;
                }

                node.send([msg, null]); // Send to output 1 (valid)
                
                // Clear status after 5 seconds
                setTimeout(() => node.status({}), 5000);

            } catch (error) {
                node.status({ fill: 'red', shape: 'ring', text: 'error' });
                node.error('Token check failed: ' + error.message, msg);
                
                msg.payload = {
                    valid: false,
                    error: error.message
                };
                node.send([null, msg]); // Send to output 2 (invalid)
            }
        });
    }

    RED.nodes.registerType("rituals-token-check", RitualsTokenCheckNode);
}
