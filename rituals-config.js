module.exports = function(RED) {
    const axios = require('axios');

    const BASE_URL = 'https://rituals.apiv2.sense-company.com';
    const AUTH_URL = `${BASE_URL}/apiv2/account/token`;
    const HUBS_URL = `${BASE_URL}/apiv2/account/hubs`;

    function RitualsConfigNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        
        // Store credentials
        node.email = config.email;
        node.password = this.credentials.password;
        node.token = null;
        node.tokenExpiry = null;

        // Authenticate with Rituals API
        node.authenticate = async function() {
            try {
                node.log(`Attempting to authenticate with email: ${node.email}`);
                
                const response = await axios.post(AUTH_URL, {
                    email: node.email,
                    password: node.password
                }, {
                    headers: {
                        'Accept': '*/*',
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000,
                    validateStatus: function (status) {
                        return status < 500; // Don't throw on 4xx errors
                    }
                });

                node.log(`Auth response status: ${response.status}`);
                node.log(`Auth response data: ${JSON.stringify(response.data)}`);

                if (response.data && response.data.success) {
                    node.token = response.data.success;
                    // Token typically expires after 24 hours
                    node.tokenExpiry = Date.now() + (24 * 60 * 60 * 1000);
                    node.log('Successfully authenticated with Rituals API');
                    return true;
                } else {
                    const errorMsg = response.data.message || response.data.error || JSON.stringify(response.data) || 'Authentification failed';
                    throw new Error(errorMsg);
                }
            } catch (error) {
                if (error.response) {
                    // The request was made and the server responded with a status code
                    node.error(`Authentification failed with status ${error.response.status}: ${JSON.stringify(error.response.data)}`);
                } else if (error.request) {
                    // The request was made but no response was received
                    node.error('Authentification failed: No response from server');
                } else {
                    // Something happened in setting up the request
                    node.error('Authentification failed: ' + error.message);
                }
                throw error;
            }
        };

        // Get valid token (authenticate if needed)
        node.getToken = async function() {
            if (!node.token || Date.now() >= node.tokenExpiry) {
                await node.authenticate();
            }
            return node.token;
        };

        // Get all hubs/devices
        node.getDevices = async function() {
            try {
                const token = await node.getToken();
                const response = await axios.get(HUBS_URL, {
                    headers: {
                        'Accept': '*/*',
                        'Authorization': token
                    },
                    timeout: 10000
                });

                if (Array.isArray(response.data)) {
                    return response.data;
                } else {
                    throw new Error('Invalid response format');
                }
            } catch (error) {
                node.error('Failed to get devices: ' + error.message);
                throw error;
            }
        };

        // Make authenticated API request
        node.apiRequest = async function(method, url, data = null) {
            try {
                const token = await node.getToken();
                const config = {
                    method: method,
                    url: url,
                    headers: {
                        'Accept': '*/*',
                        'Authorization': token
                    },
                    timeout: 10000
                };

                if (data) {
                    if (method === 'POST' && typeof data === 'object') {
                        // Use form data for POST requests to attributes
                        config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                        config.data = new URLSearchParams(data).toString();
                    } else {
                        config.data = data;
                    }
                }

                const response = await axios(config);
                return response.data;
            } catch (error) {
                node.error('API request failed: ' + error.message);
                throw error;
            }
        };
    }

    RED.nodes.registerType('rituals-config', RitualsConfigNode, {
        credentials: {
            password: { type: 'password' }
        }
    });
};
