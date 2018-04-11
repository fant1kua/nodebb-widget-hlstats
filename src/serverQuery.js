const dgram = require('dgram');

class Query {
	constructor() {
		this.collect = this.collect.bind(this);
		this.send = this.send.bind(this);
		this.parse = this.parse.bind(this);
		this.parseInfo = this.parseInfo.bind(this);
		this.parseInfoOld = this.parseInfoOld.bind(this);
		this.parsePlayers = this.parsePlayers.bind(this);
		this.parseRules = this.parseRules.bind(this);

		this.data = new Map();
	}

	close(socket, timer) {
		if (timer) {
			clearTimeout(timer);
		}

		if (socket) {
			socket.close();
		}
	}

	collect(data) {
		let index = 0;

		let header = data.readInt32LE(index);
		index += 4;

		if (header === -1) {
			this.data.set(0, data.slice(index));
			return true;
		} else if (header == -2) {
			const id = data.readInt32LE(index);
			if (!this.id) {
				this.id = id;
			} else if (id !== this.id) {
				throw new Error('Packet id mismatch');
			}

			index += 4;

			const testByte = data[index];
			const packetIndex = (testByte >> 4) & 0x0F;
			const numPackets = testByte & 0x0F;
			index += 1;

			if (data.readInt32LE(index) === -1) {
				index += 4;
			}

			this.data.set(packetIndex, data.slice(index));
			return this.data.size === numPackets;
		}
	}

	readString(data, index, encoding = 'utf8') {
		const start = index;

		while (index < data.length && data.readUInt8(index) !== 0x00) {
			index++;
		}

		return [index + 1, data.slice(start, index).toString(encoding)];
	}

	parseInfo(data) {
		const result = {};
		let index = 1;
		let tmp;

		result.protocol = data.readUInt8(index);
		index += 1;

		tmp = this.readString(data, index);
		result.name = tmp[1];
		index = tmp[0];

		tmp = this.readString(data, index);
		result.map = tmp[1];
		index = tmp[0];

		tmp = this.readString(data, index);
		result.folder = tmp[1];
		index = tmp[0];

		tmp = this.readString(data, index);
		result.game = tmp[1];
		index = tmp[0];

		result.id = data.readInt16LE(index);
		index += 2;

		result.players = data.readUInt8(index);
		index += 1;

		result.maxplayers = data.readUInt8(index);
		index += 1;

		result.bots = data.readUInt8(index);
		index += 1;

		const type = String.fromCharCode(data.readUInt8(index));
		index += 1;
		switch (type) {
			case 'd':
				result.type = 'dedicated';
				break;

			case 'l':
				result.type = 'local';
				break;

			case 'p':
				result.type = 'proxy';
				break;
		}

		const environment = String.fromCharCode(data.readUInt8(index));
		index += 1;

		switch (environment) {
			case 'l':
				result.environment = 'linux';
				break;

			case 'w':
				result.environment = 'windows';
				break;

			case 'm':
				result.environment = 'mac';
				break;
		}

		result.visibility = data.readUInt8(index) === 1 ? true : false;
		index += 1;

		result.vac = data.readUInt8(index) === 1 ? true : false;
		index += 1;

		if (result.id === 2400) {
			result.mode = data.readUInt8(index);
			index += 1;

			result.witnesses = data.readUInt8(index);
			index += 1;

			result.duration = data.readUInt8(index);
			index += 1;
		}

		tmp = this.readString(data, index);
		result.version = tmp[1];
		index = tmp[0];

		const flag = data.readUInt8(index);
		index += 1;

		if (flag & 0x80) {
			result.port = data.readInt16LE(index);
			index += 2;
		}

		if (flag & 0x10) {
			index += 8;
		}

		if (flag & 0x40) {
			result.spectator = {};

			result.spectator.port = data.readInt16LE(index);
			index += 2;

			tmp = this.readString(data, index);
			result.spectator.name = tmp[1];
			index = tmp[0];
		}

		if (flag & 0x20) {
			tmp = this.readString(data, index);
			result.keywords = tmp[1];
			index = tmp[0];
		}

		return result;
	}

	parseInfoOld(data) {
		const result = {};
		let index = 1;
		let tmp;

		tmp = this.readString(data, index);
		result.address = tmp[1];
		index = tmp[0];

		tmp = this.readString(data, index);
		result.name = tmp[1];
		index = tmp[0];

		tmp = this.readString(data, index);
		result.map = tmp[1];
		index = tmp[0];

		tmp = this.readString(data, index);
		result.folder = tmp[1];
		index = tmp[0];

		tmp = this.readString(data, index);
		result.game = tmp[1];
		index = tmp[0];

		result.players = data.readUInt8(index);
		index += 1;

		result.maxplayers = data.readUInt8(index);
		index += 1;

		result.protocol = data.readUInt8(index);
		index += 1;

		const type = String.fromCharCode(data.readUInt8(index));
		index += 1;
		switch (type) {
			case 'd':
				result.type = 'dedicated';
				break;

			case 'l':
				result.type = 'local';
				break;

			case 'p':
				result.type = 'proxy';
				break;
		}

		const environment = String.fromCharCode(data.readUInt8(index));
		index += 1;

		switch (environment) {
			case 'l':
				result.environment = 'linux';
				break;

			case 'w':
				result.environment = 'windows';
				break;

			case 'm':
				result.environment = 'mac';
				break;
		}

		result.visibility = data.readUInt8(index) === 1 ? true : false;
		index += 1;

		const mod = data.readUInt8(index);
		index += 1;

		if (mod === 1) {
			result.mod = {};

			tmp = this.readString(data, index);
			result.mod.link = tmp[1];
			index = tmp[0];

			tmp = this.readString(data, index);
			result.mod.downloadlink = tmp[1];
			index = tmp[0];

			index++;

			result.mod.version = data.readInt32LE(index);
			index += 4;

			result.mod.size = data.readInt32LE(index);
			index += 4;

			result.mod.type = data.readUInt8(index);
			index += 1;

			result.mod.dll = data.readUInt8(index);
			index += 1;
		}

		result.vac = data.readUInt8(index) === 1 ? true : false;
		index += 1;

		result.bots = data.readUInt8(index);
		index += 1;

		return result;
	}

	parsePlayers(data) {
		const players = [];
		let index = 1;
		let numplayers = data.readUInt8(index);
		index += 1;

		let id, name, score, duration;
		while (numplayers > 0 && index < data.length) {
			id = data.readUInt8(index);
			index += 1;
			name = this.readString(data, index);
			index = name[0];
			score = data.readInt32LE(index);
			index += 4;
			duration = data.readFloatLE(index);
			index += 4;

			players.push({
				index: id,
				name: name[1],
				score: score,
				duration: duration
			});

			numplayers--;
		}
		return players;
	}

	parseRules(data) {
		const rules = [];
		let index = 1;
		let numrules = data.readInt16LE(index);
		index += 2;

		let name, value;
		while (numrules > 0 && index < data.length) {
			name = this.readString(data, index);
			index = name[0];

			value = this.readString(data, index);
			index = value[0];

			rules.push({
				name: name[1],
				value: value[1]
			});

			numrules--;
		}

		return rules;
	}

	parse() {
		let data;
		if (this.data.size > 1) {
			const tmp = Array.from(this.data.entries()).sort((a, b) => {
				return a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0;
			});
			data = Buffer.concat(Array.from(new Map(tmp).values()));
		} else {
			data = Buffer.concat(Array.from(this.data.values()));
		}

		switch (data.readUInt8(0)) {
			case 0x49:
				return this.parseInfo(data);

			case 0x6D:
				return this.parseInfoOld(data);

			case 0x44:
				return this.parsePlayers(data);

			case 0x45:
				return this.parseRules(data);

			case 0x41:
				return {
					challenge: data.readInt32LE(1)
				};

			case 0x6A:
				const tmp = this.readString(data, 1);
				return {
					ping: tmp[1]
				};
		}

		return false;
	}

	send(host, port, type) {
		return new Promise((resolve, reject) => {
			let timer, packet, index;

			switch (type) {
				case 'ping':
					packet = Buffer.alloc(5);
					index = packet.writeInt32LE(-1, 0);
					index = packet.writeUInt8(0x69, index);
					break;

				case 'info':
					packet = Buffer.alloc(25);
					index = packet.writeInt32LE(-1, 0);
					index = packet.writeUInt8(0x54, index);
					index += packet.write('Source Engine Query', index);
					index = packet.writeUInt8(0x00, index);
					break;

				case 'players':
					packet = Buffer.alloc(9);
					index = packet.writeInt32LE(-1, 0);
					index = packet.writeUInt8(0x55, index);
					index = packet.writeInt32LE(-1, index);
					break;

				case 'rules':
					packet = Buffer.alloc(9);
					index = packet.writeInt32LE(-1, 0);
					index = packet.writeUInt8(0x56, index);
					index = packet.writeInt32LE(-1, index);
					break;

				default:
					reject(new Error('Bad type'));
					return;
			}

			this.data.clear();
			this.id = null;

			const socket = dgram.createSocket({ type: 'udp4' });

			socket.on('error', (error) => {
				this.close(socket, timer);
				reject(new Error(`Socket error: ${error.message}`));
			});

			socket.on('message', (data) => {
				try {
					if (this.collect(data)) {
						const result = this.parse();
						if (result && result.challenge) {

							this.close(null, timer);

							switch (type) {
								case 'players':
									packet = Buffer.alloc(9);
									index = packet.writeInt32LE(-1, 0);
									index = packet.writeUInt8(0x55, index);
									index = packet.writeInt32LE(result.challenge, index);
									break;

								case 'rules':
									packet = Buffer.alloc(9);
									index = packet.writeInt32LE(-1, 0);
									index = packet.writeUInt8(0x56, index);
									index = packet.writeInt32LE(result.challenge, index);
									break;

								default:
									this.close(socket, timer);
									reject(new Error('Bad type'));
									return;
							}

							socket.send(packet, port, host, () => {
								timer = setTimeout(() => {
									this.close(socket, timer);
								}, 2000);
							});
						} else {
							this.close(socket, timer);
							resolve(result);
						}
					}
				} catch (error) {
					this.close(socket, timer);
					reject(new Error(`Error: ${error.message}`));
				}
			});

			socket.bind();

			socket.send(packet, port, host, () => {
				timer = setTimeout(() => {
					this.close(socket, timer);
					reject({
						message: 'Timeout',
						code: 'ERR_TIMEOUT'
					});
				}, 2000);
			});
		});
	}
}

module.exports = new Query();
module.exports.TYPE_PING = 'ping';
module.exports.TYPE_INFO = 'info';
module.exports.TYPE_PLAYERS = 'players';
module.exports.TYPE_RULES = 'rules';
