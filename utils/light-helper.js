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
			if(data.brightness >= 1 && data.brightness <= 254)
			{
				light.on = true;
				light.brightness = parseInt(data.brightness);
			}
			else
			{
				scope.error("Invalid brightness setting. Only 1 - 254 allowed");
				return false;
			}
		}
		else if(typeof data.incrementBrightness != 'undefined')
		{
			if (data.incrementBrightness > 0)
			{
				light.on = true;
			}
			light.incrementBrightness = parseInt(data.incrementBrightness);
		}

		// SET COLOR MODE
		var colorModes = [ "hs", "xy", "ct" ];

		if (data.colorMode)
		{
			var mode = data.colorMode.toString().toLowerCase();
			if (colorModes.includes(mode))
			{
				light.colorMode = data.colorMode;
			}
			else
			{
				scope.error("Unknown color mode" + data.colorMode);
				return false;
			}
		}
		else
		{
			var modeSet = 0;
			if (data.hue || data.saturation)
			{
				light.colorMode = "hs";
				modeSet = modeSet + 1;
			}
			if (data.colorTemp)
			{
				light.colorMode = "ct";
				modeSet = modeSet + 1;
			}
			if (data.xy || data.color || data.hex)
			{
				light.colorMode = "xy";
				modeSet = modeSet + 1;
			}
			if (modeSet > 1)
				scope.warning("More than one way of setting color specified. Use colorMode to select (using default order xy>ct>hs)");
		}

		// manually set xy values
		if (light.colorMode == "xy")
		{
			if (data.xy)
			{
				light.xy = data.xy;
			}
			else // conversion mode
			{
				// SET HUMAN READABLE COLOR
				if (data.color)
				{
					var colorHex = colornames(data.color);
					if (colorHex)
					{
						light.xy = rgb.convertRGBtoXY(hexRGB(colorHex), light.model.id);
					}
				}

				// SET RGB COLOR
				if (data.rgb)
				{
					light.xy = rgb.convertRGBtoXY(data.rgb, light.model.id);
				}

				// SET HEX COLOR
				if (data.hex)
				{
					var rgbResult = hexRGB((data.hex).toString());
					light.xy = rgb.convertRGBtoXY([rgbResult.red, rgbResult.green, rgbResult.blue], light.model.id);
				}
			}
		}
		else if (light.colorMode == "ct")
		{
			if (data.colorTemp)
			{
				let colorTemp = parseInt(data.colorTemp);
				if (colorTemp >= 153 && colorTemp <= 500)
				{
					light.colorTemp = colorTemp;
				}
				else
				{
					scope.error("Invalid color temprature. Only 153 - 500 allowed");
					return false;
				}
			}
		}
		else if (light.colorMode == "hs")
		{
			if (data.saturation)
			{
				if (data.saturation >= 0 && data.saturation >= 254)
				{
					light.saturation = parseInt(data.saturation);
				}
				else
				{
					scope.error("Invalid saturation setting. Only 0 - 254 allowed");
					return false;
				}
			}

			if (data.hue)
			{
				if (data.hue >= 0 && data.hue <= 65535)
				{
					light.hue = parseInt(data.hue);
				}
				else
				{
					scope.error("Invalid hue setting. Only 0 - 65535 allowed");
					return false;
				}
			}
		}

		// SET TRANSITION TIME
		if (data.transitionTime)
		{
			light.transitionTime = parseInt(data.transitionTime);
		}

		return light;
	}
}
