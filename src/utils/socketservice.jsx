import io from 'socket.io-client';

class WSService {
	socket;

	constructor() {
		this.socket = null;
	}

	initializeSocket = async () => {
		try {
			this.socket = io("http://localhost:8000", {
				transports: ['websocket'],
			});

			this.socket.on('connect', () => {
				console.log('=== socket connected ===');
			});

			this.socket.on('disconnect', () => {
				console.log('=== socket disconnected ===');
			});

			this.socket.on('connect_error', (err) => {
				console.error(`connect_error due to ${err.message}`);
			});
		} catch (error) {
			console.log('socket is not inialized', error);
		}
	};

	emit(
		event,
		...args
	) {
		if (this.socket) {
			if (true) {
				this.socket.emit(event, ...args);
			} else {
				console.error(`Invalid event: ${event}`);
			}
		} else {
			console.error('Socket is not initialized. Cannot emit event.');
		}
	}

	on(
		event,
		cb
	) {
		if (this.socket) {
			// Casting cb to any to bypass type-checking temporarily
			this.socket.on(event, cb);
		} else {
			console.error(
				'Socket is not initialized. Cannot add event listener.'
			);
		}
	}

	removeListener(listenerName) {
		if (this.socket) {
			this.socket.removeListener(listenerName);
		} else {
			console.error(
				'Socket is not initialized. Cannot remove event listener.'
			);
		}
	}
}

const socketServices = new WSService();

export default socketServices;