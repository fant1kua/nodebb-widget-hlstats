"use strict";

const path = require('path');
const fs = require('fs');
const winston = module.parent.require('winston');
const serverQuery = require('./src/serverQuery');


const benchpress = module.parent.require('benchpressjs');

const templates = {};

function loadTemplate(template) {
	return new Promise(function (resolve, reject) {
		fs.readFile(path.resolve(__dirname, `./templates/${template}.tpl`), function (err, data) {
			if (err) {
				reject(err);
			} else {
				templates[template] = data.toString();
				resolve();
			}
		});
	});
}

module.exports = {
	init: function (params, callback) {
		Promise.all([
			loadTemplate('info'),
			loadTemplate('admin'),
		]).then(() => {
			callback();
		}).catch(err => {
			winston.error(err);
			callback(err);
		});
	},
	defineWidget: function (widgets, callback) {
		widgets.push({
			widget: "hlstats",
			name: "GoldSrc Stats",
			description: "",
			content: templates.admin
		});
		callback(null, widgets);
	},
	renderWidget: function(widget, callback) {
		serverQuery.send(widget.data.ip, widget.data.port, serverQuery.TYPE_INFO)
			.then(info => benchpress.compileRender(templates.info, {
				info,
			})).then(function(html) {
				widget.html = html;
				callback(null, widget);
			}).catch(err => {
				if (err.code == 'ERR_TIMEOUT') {
					widget.html = '';
					callback(null, widget);
				} else {
					winston.error(err);
					callback(err, widget);
				}
			});
	}
};
