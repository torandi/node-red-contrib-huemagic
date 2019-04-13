module.exports = {
	// @param data Light data to parse
	// @param light Light to use as base (ie previous state of light)
	// @param scope Node red scope
	// @param cleanup unusued colors (needed for scenes, should not be done for lights)
	parseLight: function (data, light, scope, cleanup) {
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
		var colorMode = light.colorMode;

		if (data.colorMode)
		{
			var mode = data.colorMode.toString().toLowerCase();
			if (colorModes.includes(mode))
			{
				colorMode = mode;
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
				colorMode = "hs";
				modeSet = modeSet + 1;
			}
			if (data.colorTemp)
			{
				colorMode = "ct";
				modeSet = modeSet + 1;
			}
			if (data.xy || data.color || data.hex)
			{
				colorMode = "xy";
				modeSet = modeSet + 1;
			}
			if (modeSet > 1)
				scope.warning("More than one way of setting color specified. Use colorMode to select (using default order xy>ct>hs)");
		}

		// manually set xy values
		if (colorMode == "xy")
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
		else if (colorMode == "ct")
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
					scope.error("Invalid color temperature. Only 153 - 500 allowed");
					return false;
				}
			}
		}
		else if (colorMode == "hs")
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

		if (cleanup)
		{
			// remove unusued color modes
			if(colorMode != "xy")
			{
				light.xy = undefined;
			}
			if (colorMode != "ct")
			{
				light.colorTemp = undefined;
			}
			if (colorMode != "hs")
			{
				light.hue = undefined;
				light.saturation = undefined;
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
