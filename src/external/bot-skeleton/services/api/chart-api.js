import { generateDerivApiInstance } from './appId';

class ChartAPI {
    api;
    is_initializing = false;

    // Arrow-function so the reference is stable for add/removeEventListener.
    onsocketclose = () => {
        this.reconnectIfNotConnected();
    };

    init = async (force_create_connection = false) => {
        if (this.is_initializing) return;

        if (!this.api || force_create_connection) {
            this.is_initializing = true;
            try {
                if (this.api?.connection) {
                    this.api.connection.removeEventListener('close', this.onsocketclose);
                    this.api.disconnect();
                }
                this.api = await generateDerivApiInstance();
                // eslint-disable-next-line no-console
                console.log('[chart-api] init: WS readyState =', this.api?.connection?.readyState);
                this.api?.connection.addEventListener('open', () => {
                    // eslint-disable-next-line no-console
                    console.log('[chart-api] WS OPEN');
                });
                this.api?.connection.addEventListener('close', this.onsocketclose);
                this.api?.connection.addEventListener('error', e => {
                    // eslint-disable-next-line no-console
                    console.log('[chart-api] WS ERROR', e);
                });
            } finally {
                this.is_initializing = false;
            }
        }
        this.getTime();
    };

    getTime() {
        if (!this.time_interval) {
            this.time_interval = setInterval(() => {
                this.api.send({ time: 1 });
            }, 30000);
        }
    }

    reconnectIfNotConnected = () => {
        // eslint-disable-next-line no-console
        console.log('chart connection state: ', this.api?.connection?.readyState);
        if (this.api?.connection?.readyState && this.api?.connection?.readyState > 1) {
            // eslint-disable-next-line no-console
            console.log('Info: Chart connection to the server was closed, trying to reconnect.');
            this.init(true);
        }
    };
}

const chart_api = new ChartAPI();

export default chart_api;
