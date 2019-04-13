module.exports = function(RED)
{
	"use strict";

	function HueScene(config)
	{
		RED.nodes.createNode(this, config);

		var scope = this;
		let bridge = RED.nodes.getNode(config.bridge);
		let huejay = require('huejay');
		let lightHelper = require('../utils/light-helper.js');
		
		//
		// CHECK CONFIG
		if(bridge == null)
		{
			this.status({fill: "red", shape: "ring", text: "not configured"});
			return false;
		}

		//
		// ENABLE SCENE
		this.on('input', function(msg)
		{
			var sceneId = (typeof msg.sceneId === 'string') ? msg.sceneId : msg.payload;
			var getScene;
			if (config.sceneid) {
				getScene = bridge.client.scenes.getById(config.sceneid);
			} else if (typeof sceneId === 'string') {
				getScene = bridge.client.scenes.getAll()
					.then(scenes => {
						let fallback;
						for (const scene of scenes) {
							if (scene.name === sceneId || scene.id === sceneId) {
								return scene;
							}
						}

						throw new Error('Scene with name or id ' + sceneId + ' does not exist.');
					});
			} else {
				getScene = Promise.reject(new Error('No scene provided'));
			}

			// keep legacy api (any value recalls scene).
			var shouldRecall = true;
			var shouldChange = (typeof msg.change != 'undefined');
			if (shouldChange) {
				// if lighs is set, default to not recalling
				shouldRecall = false;
			}

			if (typeof msg.recall != 'undefined') {
				shouldRecall = msg.recall;
			}

			getScene
			.then(scene => {
				if (shouldChange) {
					// modify scene

					if (typeof msg.change.lights != 'undefined') {
						if (msg.change.modifyMembers === true) {
							// modify scene members
							scene.lightIds = Object.keys(msg.change.lights);
						}

						scene.lightIds.forEach(lightId => {
							if (lightId in msg.change.lights) {
								var light = scene.getLightState(lightId);

								var data = msg.change.lights[lightId];
								if (data.color !== undefined || data.hex !== undefined || data.rgb !== undefined)
								{
									scope.error("Can't use color/hex/rgb when setting scene. Use xy instead");
									return;
								}

								light = lightHelper.parseLight(data, light, scope, true);
								if (light)
								{
									scene.setLightState(lightId, light);
								}
								else
								{
									scope.error("Failed to parse light");
								}
							}
						});
					}

					if (typeof msg.change.transitionTime != 'undefined') {
						scene.transitionTime = msg.change.transitionTime;
					}

					return bridge.client.scenes.save(scene);
				}
				else {
					return scene;
				}
			})
			.then(scene => {
				if (shouldChange)
				{
					scope.status({ fill: "green", shape: "dot", text: "scene saved" });
				}

				if (shouldRecall)
				{
					scope.status({ fill: "blue", shape: "dot", text: "scene recalled" });
					bridge.client.scenes.recall(scene);
				}

				var sendSceneInfo = {payload: {}};

				sendSceneInfo.payload.id = scene.id;
				sendSceneInfo.payload.name = scene.name;
				sendSceneInfo.payload.lightIds = scene.lightIds.join(', ');
				sendSceneInfo.payload.owner = scene.owner;
				sendSceneInfo.payload.appData = scene.appData;
				sendSceneInfo.payload.lastUpdated = scene.lastUpdated;
				sendSceneInfo.payload.version = scene.version;

				scope.send(sendSceneInfo);

				setTimeout(function() {
					scope.status({});
				}, 1000);
			})
			.catch(error => {
				scope.error(JSON.stringify(error));
				scope.error(error, msg);
			});
		});
	}

	RED.nodes.registerType("hue-scene", HueScene);
}
