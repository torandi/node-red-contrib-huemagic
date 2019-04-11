module.exports = {
	// @param data Light data to parse
	// @param light Light to use as base (ie previous state of light)
	// @param scope Node red scope
	parseLight: function (data, light, scope) {
		let rgb = require('../utils/rgb');
		let rgbHex = require('rgb-hex');
		let hexRGB = require('hex-rgb');
		let colornames = require("colornames");

		"use strict";

		if(typeof data.on != 'undefined')
		{
			light.on = data.on;
		}

		// SET BRIGHTNESS
		if(typeof data.brightness != 'undefined')
		{
			if(data.brightness > 100 || data.brightness < 0)
			{
				scope.error("Invalid brightness setting. Only 0 - 100 percent allowed");
				return false;
			}
			else if(data.brightness == 0)
			{
				light.on = false;
			}
			else
			{
				light.on = true;
				light.brightness = Math.round((254/100)*parseInt(data.brightness));
			}
		}
		else if(typeof data.incrementBrightness != 'undefined')
		{
			if (data.incrementBrightness > 0)
			{
				light.on = true;
			}
			light.incrementBrightness = Math.round((254/100)*parseInt(data.incrementBrightness));
		}

		// SET HUMAN READABLE COLOR
		if(data.color && light.xy)
		{
			var colorHex = colornames(data.color);
			if(colorHex)
			{
				light.xy = rgb.convertRGBtoXY(hexRGB(colorHex), light.model.id);
			}
		}

		// SET RGB COLOR
		if(data.rgb && light.xy)
		{
			light.xy = rgb.convertRGBtoXY(data.rgb, light.model.id);
		}

		// SET HEX COLOR
		if(data.hex && light.xy)
		{
			var rgbResult = hexRGB((data.hex).toString());
			light.xy = rgb.convertRGBtoXY([rgbResult.red, rgbResult.green, rgbResult.blue], light.model.id);
		}

		// SET COLOR TEMPERATURE
		if(data.colorTemp && light.colorTemp)
		{
			let colorTemp = parseInt(data.colorTemp);
			if(colorTemp >= 153 && colorTemp <= 500)
			{
				light.colorTemp = parseInt(data.colorTemp);
			}
			else
			{
				scope.error("Invalid color temprature. Only 153 - 500 allowed");
				return false;
			}
		}

		// SET SATURATION
		if(data.saturation && light.saturation)
		{
			if(data.saturation > 100 || data.saturation < 0)
			{
				scope.error("Invalid saturation setting. Only 0 - 254 allowed");
				return false;
			}
			else
			{
				light.saturation = Math.round((254/100)*parseInt(data.saturation));
			}
		}

		// SET TRANSITION TIME
		if(data.transitionTime)
		{
			light.transitionTime = parseInt(data.transitionTime);
		}

		return light;
	}
}
