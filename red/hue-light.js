module.exports = function(RED)
{
	"use strict";

	function HueLight(config)
	{
		RED.nodes.createNode(this, config);

		var scope = this;
		let bridge = RED.nodes.getNode(config.bridge);
		let moment = require('moment');
		let lightHelper = require('../utils/light-helper.js');
		let rgb = require('../utils/rgb');
		let rgbHex = require('rgb-hex');
		let hexRGB = require('hex-rgb');
		let colornames = require("colornames");
		let colornamer = require('color-namer');

		
		//
		// CHECK CONFIG
		if(bridge == null)
		{
			this.status({fill: "red", shape: "ring", text: "not configured"});
			return false;
		}

		//
		// UPDATE STATE
		this.status({fill: "grey", shape: "dot", text: "initializing…"});
		//
		// ON UPDATE
		if(config.lightid)
		{
			bridge.events.on('light' + config.lightid, function (light) {
				this.sendLightStatus(light);
			});
		}
		else
		{
			scope.status({fill: "grey", shape: "dot", text: "universal mode"});
		}


		//
		// TURN ON / OFF LIGHT
		this.on('input', function(msg)
		{
			var tempLightID = (typeof msg.topic != 'undefined' && isNaN(msg.topic) == false && msg.topic.length > 0) ? parseInt(msg.topic) : config.lightid;

			// CHECK IF LIGHT ID IS SET
			if(tempLightID == false)
			{
				scope.error("No light Id defined. Please check the docs.");
				return false;
			}

			// SIMPLE TURN ON / OFF LIGHT
			if(msg.payload == true || msg.payload == false)
			{
				if(tempLightID != false)
				{
					bridge.client.lights.getById(tempLightID)
					.then(light => {
						light.on = msg.payload;
						return bridge.client.lights.save(light);
					})
					.then(light => {
						if(light != false)
						{
							scope.sendLightStatus(light);
						}
					})
					.catch(error => {
						scope.error(error, msg);
						scope.status({fill: "red", shape: "ring", text: "input error"});
					});
				}
			}
			// ALERT EFFECT
			else if(typeof msg.payload.alert != 'undefined' && msg.payload.alert > 0)
			{
				bridge.client.lights.getById(tempLightID)
				.then(light => {
					scope.context().set('lightPreviousState', [light.on ? true : false, light.brightness, light.xy ? light.xy : false]);

					// SET ALERT COLOR
					if(light.xy)
					{
						if(typeof msg.payload.rgb != 'undefined')
						{
							light.xy = rgb.convertRGBtoXY(msg.payload.rgb, light.model.id);
						}
						else if(typeof msg.payload.hex != 'undefined')
						{
							var rgbResult = hexRGB((msg.payload.hex).toString());
							light.xy = rgb.convertRGBtoXY([rgbResult.red, rgbResult.green, rgbResult.blue], light.model.id);
						}
						else if(typeof msg.payload.color != 'undefined')
						{
							var colorHex = colornames(msg.payload.color);
							if(colorHex)
							{
								light.xy = rgb.convertRGBtoXY(hexRGB(colorHex), light.model.id);
							}
						}
						else
						{
							light.xy = rgb.convertRGBtoXY([255,0,0], light.model.id);
						}
					}

					// ACTIVATE
					light.on = true;
					light.brightness = 254;
					light.transitionTime = 0;
					return bridge.client.lights.save(light);
				})
				.then(light => {
					// ACTIVATE ALERT
					if(light != false)
					{
						light.alert = 'lselect';
						return bridge.client.lights.save(light);
					}
					else
					{
						return false;
					}
				})
				.then(light => {
					// TURN OFF ALERT
					if(light != false)
					{
						var lightPreviousState = scope.context().get('lightPreviousState');
						var alertSeconds = parseInt(msg.payload.alert);

						setTimeout(function() {
							light.on = lightPreviousState[0];
							light.alert = 'none';
							light.brightness = lightPreviousState[1];
							light.transitionTime = 2;

							if(lightPreviousState[2] != false)
							{
								light.xy = lightPreviousState[2];
							}

							bridge.client.lights.save(light);
						}, alertSeconds * 1000);
					}
				})
				.catch(error => {
					scope.error(error, msg);
					scope.status({fill: "red", shape: "ring", text: "input error"});
				});
			}
			// EXTENDED TURN ON / OFF LIGHT
			else
			{
				bridge.client.lights.getById(tempLightID)
				.then(light => {

					if (msg.payload !== undefined)
					{
						light = lightHelper.parseLight(msg.payload, light, scope);
						if (light === false)
						{
							node.error("Failed to parse light");
							return false;
						}

						// SET COLORLOOP EFFECT
						if (msg.payload.colorloop && msg.payload.colorloop > 0 && light.xy)
						{
							light.effect = 'colorloop';

							// DISABLE AFTER
							setTimeout(function () {
								light.effect = 'none';
								bridge.client.lights.save(light);
							}, parseInt(msg.payload.colorloop) * 1000);
						}

						return bridge.client.lights.save(light);
					}
					else
					{
						return light;
					}
				})
				.then(light => {
					if(light != false)
					{
						// TRANSITION TIME? WAIT…
						if(msg.payload.transitionTime)
						{
							setTimeout(function() {
								scope.sendLightStatus(light);
							}, parseInt(msg.payload.transitionTime)*1010);
						}
						else
						{
							scope.sendLightStatus(light);
						}
					}
				})
				.catch(error => {
					scope.error(error, msg);
					scope.status({fill: "red", shape: "ring", text: "input error"});
				});
			}
		});

		this.sendLightStatus = function(light)
		{
			var scope = this;
			if(light.on)
			{
				var brightnessPercent = Math.round((100/254)*light.brightness);
				scope.status({fill: "yellow", shape: "dot", text: "turned on ("+ brightnessPercent +"%)"});
			}
			else
			{
				scope.status({fill: "grey", shape: "dot", text: "turned off"});
			}

			// DETERMINE TYPE AND SEND STATUS
			var message = {};
			message.payload = {};
			message.payload.on = light.on;
			message.payload.brightness = light.brightness;
			message.payload.colorMode = light.colorMode;

			message.info = {};
			message.info.id = light.id;
			message.info.uniqueId = light.uniqueId;
			message.info.name = light.name;
			message.info.type = light.type;
			message.info.softwareVersion = light.softwareVersion;

			message.info.model = {};;
			message.info.model.id = light.model.id;
			message.info.model.manufacturer = light.model.manufacturer;
			message.info.model.name = light.model.name;
			message.info.model.type = light.model.type;
			message.info.model.colorGamut = light.model.colorGamut;
			message.info.model.friendsOfHue = light.model.friendsOfHue;

			if (light.colorMode == "xy")
			{
				var rgbColor = rgb.convertXYtoRGB(light.xy[0], light.xy[1], light.brightness);

				message.payload.xy = light.xy;
				message.payload.rgb = rgbColor;
				message.payload.hex = rgbHex(rgbColor[0], rgbColor[1], rgbColor[2]);

				if (config.colornamer == true)
				{
					var cNamesArray = colornamer(rgbHex(rgbColor[0], rgbColor[1], rgbColor[2]));
					message.payload.color = cNamesArray.basic[0]["name"];
				}
			}
			else if (light.colorMode == "ct")
			{
				message.payload.colorTemp = light.colorTemp;
			}
			else if (light.colorMode == "hs")
			{
				message.payload.saturation = light.saturation;
				message.payload.hue = light.hue;
			}


			message.payload.updated = moment().format();

			scope.send(message);
		}


		//
		// CLOSE NDOE / REMOVE RECHECK INTERVAL
		this.on('close', function()
		{
			bridge.events.removeAllListeners('light' + config.lightid);
		});
	}

	RED.nodes.registerType("hue-light", HueLight);
}
