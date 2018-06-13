/*!
 * HTML entities dialog plugin for Editor.md
 *
 * @file        html-entities-dialog.js
 * @author      pandao
 * @version     1.2.0
 * @updateTime  2015-03-08
 * {@link       https://github.com/pandao/editor.md}
 * @license     MIT
 */

(function() {

	var factory = function (exports) {

		var $            = jQuery;
		var pluginName   = "html-entities-dialog";
		var selecteds    = [];
		var entitiesData = [];

		exports.fn.htmlEntitiesDialog = function() {
			/*html-entities data local loaded*/
			localjson = [
	{
		"name" : "&amp;#64;",
		"description":"at symbol"		
	},
	{
		"name":"&amp;copy;",
		"description":"copyright symbol"
	},
	{
		"name":"&amp;reg;",
		"description":"registered symbol"
	},
	{
		"name":"&amp;trade;",
		"description":"trademark symbol"
	},
	{
		"name":"&amp;hearts;",
		"description":"heart"
	},
	{
		"name":"&amp;nbsp;",
		"description":"Inserts a non-breaking blank space"
	},
	{
		"name":"&amp;amp;",
		"description":"Ampersand"
	},
	{
		"name":"&amp;#36;",
		"description":"dollar symbol"
	},
	{
		"name":"&amp;cent;",
		"description":"Cent symbol"
	},
	{
		"name":"&amp;pound;",
		"description":"Pound"
	},
	{
		"name":"&amp;yen;",
		"description":"Yen"
	},
	{
		"name":"&amp;euro;",
		"description":"Euro symbol"
	},
	{
		"name":"&amp;quot;",
		"description":"quotation mark"
	},
	{
		"name":"&amp;ldquo;",
		"description":"Opening Double Quotes "
	},
	{
		"name":"&amp;rdquo;",
		"description":"Closing Double Quotes "
	},
	{
		"name":"&amp;lsquo;",
		"description":"Opening Single Quote Mark "
	},
	{
		"name":"&amp;rsquo;",
		"description":"Closing Single Quote Mark "
	},
	{
		"name":"&amp;laquo;",
		"description":"angle quotation mark (left)"
	},
	{
		"name":"&amp;raquo;",
		"description":"angle quotation mark (right)"
	},
	{
		"name":"&amp;lsaquo;",
		"description":"single left angle quotation"
	},
	{
		"name":"&amp;rsaquo;",
		"description":"single right angle quotation"
	},
	{
		"name":"&amp;sect;",
		"description":"Section Symbol"
	},
	{
		"name":"&amp;micro;",
		"description":"micro sign"
	},
	{
		"name":"&amp;para;",
		"description":"Paragraph symbol"
	},
	{
		"name":"&amp;bull;",
		"description":"Big List Dot"
	},
	{
		"name":"&amp;middot;",
		"description":"Medium List Dot"
	},
	{
		"name":"&amp;hellip;",
		"description":"horizontal ellipsis"
	},
	{
		"name":"&amp;#124;",
		"description":"vertical bar"
	},
	{
		"name":"&amp;brvbar;",
		"description":"broken vertical bar"
	},
	{
		"name":"&amp;ndash;",
		"description":"en-dash"
	},
	{
		"name":"&amp;mdash;",
		"description":"em-dash"
	},
	{
		"name":"&amp;curren;",
		"description":"Generic currency symbol"
	},
	{
		"name":"&amp;#33;",
		"description":"exclamation point"
	},
	{
		"name":"&amp;#35;",
		"description":"number sign"
	},
	{
		"name":"&amp;#39;",
		"description":"single quote"
	},
	{
		"name":"&amp;#40;",
		"description":""
	},
	{
		"name":"&amp;#41;",
		"description":""
	},
	{
		"name":"&amp;#42;",
		"description":"asterisk"
	},
	{
		"name":"&amp;#43;",
		"description":"plus sign"
	},
	{
		"name":"&amp;#44;",
		"description":"comma"
	},
	{
		"name":"&amp;#45;",
		"description":"minus sign - hyphen"
	},
	{
		"name":"&amp;#46;",
		"description":"period"
	},
	{
		"name":"&amp;#47;",
		"description":"slash"
	},
	{
		"name":"&amp;#48;",
		"description":"0"
	},
	{
		"name":"&amp;#49;",
		"description":"1"
	},
	{
		"name":"&amp;#50;",
		"description":"2"
	},
	{
		"name":"&amp;#51;",
		"description":"3"
	},
	{
		"name":"&amp;#52;",
		"description":"4"
	},
	{
		"name":"&amp;#53;",
		"description":"5"
	},
	{
		"name":"&amp;#54;",
		"description":"6"
	},
	{
		"name":"&amp;#55;",
		"description":"7"
	},
	{
		"name":"&amp;#56;",
		"description":"8"
	},
	{
		"name":"&amp;#57;",
		"description":"9"
	},
	{
		"name":"&amp;#58;",
		"description":"colon"
	},
	{
		"name":"&amp;#59;",
		"description":"semicolon"
	},
	{
		"name":"&amp;#61;",
		"description":"equal sign"
	},
	{
		"name":"&amp;#63;",
		"description":"question mark"
	},
	{
		"name":"&amp;lt;",
		"description":"Less than"
	},
	{
		"name":"&amp;gt;",
		"description":"Greater than"
	},
	{
		"name":"&amp;le;",
		"description":"Less than or Equal to"
	},
	{
		"name":"&amp;ge;",
		"description":"Greater than or Equal to"
	},
	{
		"name":"&amp;times;",
		"description":"Multiplication symbol"
	},
	{
		"name":"&amp;divide;",
		"description":"Division symbol"
	},
	{
		"name":"&amp;minus;",
		"description":"Minus symbol"
	},
	{
		"name":"&amp;plusmn;",
		"description":"Plus/minus symbol"
	},
	{
		"name":"&amp;ne;",
		"description":"Not Equal"
	},
	{
		"name":"&amp;sup1;",
		"description":"Superscript 1"
	},
	{
		"name":"&amp;sup2;",
		"description":"Superscript 2"
	},
	{
		"name":"&amp;sup3;",
		"description":"Superscript 3"
	},
	{
		"name":"&amp;frac12;",
		"description":"Fraction ½"
	},
	{
		"name":"&amp;frac14;",
		"description":"Fraction ¼"
	},
	{
		"name":"&amp;frac34;",
		"description":"Fraction ¾"
	},
	{
		"name":"&amp;permil;",
		"description":"per mille"
	},
	{
		"name":"&amp;deg;",
		"description":"Degree symbol"
	},
	{
		"name":"&amp;radic;",
		"description":"square root"
	},
	{
		"name":"&amp;infin;",
		"description":"Infinity"
	},
	{
		"name":"&amp;larr;",
		"description":"left arrow"
	},
	{
		"name":"&amp;uarr;",
		"description":"up arrow"
	},
	{
		"name":"&amp;rarr;",
		"description":"right arrow"
	},
	{
		"name":"&amp;darr;",
		"description":"down arrow"
	},
	{
		"name":"&amp;harr;",
		"description":"left right arrow"
	},
	{
		"name":"&amp;crarr;",
		"description":"carriage return arrow"
	},
	{
		"name":"&amp;lceil;",
		"description":"left ceiling"
	},
	{
		"name":"&amp;rceil;",
		"description":"right ceiling"
	},
	{
		"name":"&amp;lfloor;",
		"description":"left floor"
	},
	{
		"name":"&amp;rfloor;",
		"description":"right floor"
	},
	{
		"name":"&amp;spades;",
		"description":"spade"
	},
	{
		"name":"&amp;clubs;",
		"description":"club"
	},
	{
		"name":"&amp;hearts;",
		"description":"heart"
	},
	{
		"name":"&amp;diams;",
		"description":"diamond"
	},
	{
		"name":"&amp;loz;",
		"description":"lozenge"
	},
	{
		"name":"&amp;dagger;",
		"description":"dagger"
	},
	{
		"name":"&amp;Dagger;",
		"description":"double dagger"
	},
	{
		"name":"&amp;iexcl;",
		"description":"inverted exclamation mark"
	},
	{
		"name":"&amp;iquest;",
		"description":"inverted question mark"
	},
	{
		"name":"&amp;#338;",
		"description":"latin capital letter OE"
	},
	{
		"name":"&amp;#339;",
		"description":"latin small letter oe"
	},
	{
		"name":"&amp;#352;",
		"description":"latin capital letter S with caron"
	},
	{
		"name":"&amp;#353;",
		"description":"latin small letter s with caron"
	},
	{
		"name":"&amp;#376;",
		"description":"latin capital letter Y with diaeresis"
	},
	{
		"name":"&amp;#402;",
		"description":"latin small f with hook - function"
	},
	{
		"name":"&amp;not;",
		"description":"not sign"
	},
	{
		"name":"&amp;ordf;",
		"description":"feminine ordinal indicator"
	},
	{
		"name":"&amp;uml;",
		"description":"spacing diaeresis - umlaut"
	},
	{
		"name":"&amp;macr;",
		"description":"spacing macron - overline"
	},
	{
		"name":"&amp;acute;",
		"description":"acute accent - spacing acute"
	},
	{
		"name":"&amp;Agrave;",
		"description":"latin capital letter A with grave"
	},
	{
		"name":"&amp;Aacute;",
		"description":"latin capital letter A with acute"
	},
	{
		"name":"&amp;Acirc;",
		"description":"latin capital letter A with circumflex"
	},
	{
		"name":"&amp;Atilde;",
		"description":"latin capital letter A with tilde"
	},
	{
		"name":"&amp;Auml;",
		"description":"latin capital letter A with diaeresis"
	},
	{
		"name":"&amp;Aring;",
		"description":"latin capital letter A with ring above"
	},
	{
		"name":"&amp;AElig;",
		"description":"latin capital letter AE"
	},
	{
		"name":"&amp;Ccedil;",
		"description":"latin capital letter C with cedilla"
	},
	{
		"name":"&amp;Egrave;",
		"description":"latin capital letter E with grave"
	},
	{
		"name":"&amp;Eacute;",
		"description":"latin capital letter E with acute"
	},
	{
		"name":"&amp;Ecirc;",
		"description":"latin capital letter E with circumflex"
	},
	{
		"name":"&amp;Euml;",
		"description":"latin capital letter E with diaeresis"
	},
	{
		"name":"&amp;Igrave;",
		"description":"latin capital letter I with grave"
	},
	{
		"name":"&amp;Iacute;",
		"description":"latin capital letter I with acute"
	},
	{
		"name":"&amp;Icirc;",
		"description":"latin capital letter I with circumflex"
	},
	{
		"name":"&amp;Iuml;",
		"description":"latin capital letter I with diaeresis"
	},

	{
		"name":"&amp;ETH;",
		"description":"latin capital letter ETH"
	},
	{
		"name":"&amp;Ntilde;",
		"description":"latin capital letter N with tilde"
	},
	{
		"name":"&amp;Ograve;",
		"description":"latin capital letter O with grave"
	},
	{
		"name":"&amp;Oacute;",
		"description":"latin capital letter O with acute"
	},
	{
		"name":"&amp;Ocirc;",
		"description":"latin capital letter O with circumflex"
	},
	{
		"name":"&amp;Otilde;",
		"description":"latin capital letter O with tilde"
	},
	{
		"name":"&amp;Ouml;",
		"description":"latin capital letter O with diaeresis"
	},
	{
		"name":"&amp;times;",
		"description":"multiplication sign"
	},
	{
		"name":"&amp;Oslash;",
		"description":"latin capital letter O with slash"
	},
	{
		"name":"&amp;Ugrave;",
		"description":"latin capital letter U with grave"
	},
	{
		"name":"&amp;Uacute;",
		"description":"latin capital letter U with acute"
	},
	{
		"name":"&amp;Ucirc;",
		"description":"latin capital letter U with circumflex"
	},
	{
		"name":"&amp;Uuml;",
		"description":"latin capital letter U with diaeresis"
	},
	{
		"name":"&amp;Yacute;",
		"description":"latin capital letter Y with acute"
	},
	{
		"name":"&amp;THORN;",
		"description":"latin capital letter THORN"
	},
	{
		"name":"&amp;szlig;",
		"description":"latin small letter sharp s - ess-zed"
	},


	{
		"name":"&amp;eth;",
		"description":"latin capital letter eth"
	},
	{
		"name":"&amp;ntilde;",
		"description":"latin capital letter n with tilde"
	},
	{
		"name":"&amp;ograve;",
		"description":"latin capital letter o with grave"
	},
	{
		"name":"&amp;oacute;",
		"description":"latin capital letter o with acute"
	},
	{
		"name":"&amp;ocirc;",
		"description":"latin capital letter o with circumflex"
	},
	{
		"name":"&amp;otilde;",
		"description":"latin capital letter o with tilde"
	},
	{
		"name":"&amp;ouml;",
		"description":"latin capital letter o with diaeresis"
	},
	{
		"name":"&amp;times;",
		"description":"multiplication sign"
	},
	{
		"name":"&amp;oslash;",
		"description":"latin capital letter o with slash"
	},
	{
		"name":"&amp;ugrave;",
		"description":"latin capital letter u with grave"
	},
	{
		"name":"&amp;uacute;",
		"description":"latin capital letter u with acute"
	},
	{
		"name":"&amp;ucirc;",
		"description":"latin capital letter u with circumflex"
	},
	{
		"name":"&amp;uuml;",
		"description":"latin capital letter u with diaeresis"
	},
	{
		"name":"&amp;yacute;",
		"description":"latin capital letter y with acute"
	},
	{
		"name":"&amp;thorn;",
		"description":"latin capital letter thorn"
	},
	{
		"name":"&amp;yuml;",
		"description":"latin small letter y with diaeresis"
	},

	{
		"name":"&amp;agrave;",
		"description":"latin capital letter a with grave"
	},
	{
		"name":"&amp;aacute;",
		"description":"latin capital letter a with acute"
	},
	{
		"name":"&amp;acirc;",
		"description":"latin capital letter a with circumflex"
	},
	{
		"name":"&amp;atilde;",
		"description":"latin capital letter a with tilde"
	},
	{
		"name":"&amp;auml;",
		"description":"latin capital letter a with diaeresis"
	},
	{
		"name":"&amp;aring;",
		"description":"latin capital letter a with ring above"
	},
	{
		"name":"&amp;aelig;",
		"description":"latin capital letter ae"
	},
	{
		"name":"&amp;ccedil;",
		"description":"latin capital letter c with cedilla"
	},
	{
		"name":"&amp;egrave;",
		"description":"latin capital letter e with grave"
	},
	{
		"name":"&amp;eacute;",
		"description":"latin capital letter e with acute"
	},
	{
		"name":"&amp;ecirc;",
		"description":"latin capital letter e with circumflex"
	},
	{
		"name":"&amp;euml;",
		"description":"latin capital letter e with diaeresis"
	},
	{
		"name":"&amp;igrave;",
		"description":"latin capital letter i with grave"
	},
	{
		"name":"&amp;Iacute;",
		"description":"latin capital letter i with acute"
	},
	{
		"name":"&amp;icirc;",
		"description":"latin capital letter i with circumflex"
	},
	{
		"name":"&amp;iuml;",
		"description":"latin capital letter i with diaeresis"
	},

	{
		"name":"&amp;#65;",
		"description":"A"
	},
	{
		"name":"&amp;#66;",
		"description":"B"
	},
	{
		"name":"&amp;#67;",
		"description":"C"
	},
	{
		"name":"&amp;#68;",
		"description":"D"
	},
	{
		"name":"&amp;#69;",
		"description":"E"
	},
	{
		"name":"&amp;#70;",
		"description":"F"
	},
	{
		"name":"&amp;#71;",
		"description":"G"
	},
	{
		"name":"&amp;#72;",
		"description":"H"
	},
	{
		"name":"&amp;#73;",
		"description":"I"
	},
	{
		"name":"&amp;#74;",
		"description":"J"
	},
	{
		"name":"&amp;#75;",
		"description":"K"
	},
	{
		"name":"&amp;#76;",
		"description":"L"
	},
	{
		"name":"&amp;#77;",
		"description":"M"
	},
	{
		"name":"&amp;#78;",
		"description":"N"
	},
	{
		"name":"&amp;#79;",
		"description":"O"
	},
	{
		"name":"&amp;#80;",
		"description":"P"
	},
	{
		"name":"&amp;#81;",
		"description":"Q"
	},
	{
		"name":"&amp;#82;",
		"description":"R"
	},
	{
		"name":"&amp;#83;",
		"description":"S"
	},
	{
		"name":"&amp;#84;",
		"description":"T"
	},
	{
		"name":"&amp;#85;",
		"description":"U"
	},
	{
		"name":"&amp;#86;",
		"description":"V"
	},
	{
		"name":"&amp;#87;",
		"description":"W"
	},
	{
		"name":"&amp;#88;",
		"description":"X"
	},
	{
		"name":"&amp;#89;",
		"description":"Y"
	},
	{
		"name":"&amp;#90;",
		"description":"Z"
	},
	{
		"name":"&amp;#91;",
		"description":"opening bracket"
	},
	{
		"name":"&amp;#92;",
		"description":"backslash"
	},
	{
		"name":"&amp;#93;",
		"description":"closing bracket"
	},
	{
		"name":"&amp;#94;",
		"description":"caret - circumflex"
	},
	{
		"name":"&amp;#95;",
		"description":"underscore"
	},

	{
		"name":"&amp;#96;",
		"description":"grave accent"
	},
	{
		"name":"&amp;#97;",
		"description":"a"
	},
	{
		"name":"&amp;#98;",
		"description":"b"
	},
	{
		"name":"&amp;#99;",
		"description":"c"
	},
	{
		"name":"&amp;#100;",
		"description":"d"
	},
	{
		"name":"&amp;#101;",
		"description":"e"
	},
	{
		"name":"&amp;#102;",
		"description":"f"
	},
	{
		"name":"&amp;#103;",
		"description":"g"
	},
	{
		"name":"&amp;#104;",
		"description":"h"
	},
	{
		"name":"&amp;#105;",
		"description":"i"
	},
	{
		"name":"&amp;#106;",
		"description":"j"
	},
	{
		"name":"&amp;#107;",
		"description":"k"
	},
	{
		"name":"&amp;#108;",
		"description":"l"
	},
	{
		"name":"&amp;#109;",
		"description":"m"
	},
	{
		"name":"&amp;#110;",
		"description":"n"
	},
	{
		"name":"&amp;#111;",
		"description":"o"
	},
	{
		"name":"&amp;#112;",
		"description":"p"
	},
	{
		"name":"&amp;#113;",
		"description":"q"
	},
	{
		"name":"&amp;#114;",
		"description":"r"
	},
	{
		"name":"&amp;#115;",
		"description":"s"
	},
	{
		"name":"&amp;#116;",
		"description":"t"
	},
	{
		"name":"&amp;#117;",
		"description":"u"
	},
	{
		"name":"&amp;#118;",
		"description":"v"
	},
	{
		"name":"&amp;#119;",
		"description":"w"
	},
	{
		"name":"&amp;#120;",
		"description":"x"
	},
	{
		"name":"&amp;#121;",
		"description":"y"
	},
	{
		"name":"&amp;#122;",
		"description":"z"
	},
	{
		"name":"&amp;#123;",
		"description":"opening brace"
	},
	{
		"name":"&amp;#124;",
		"description":"vertical bar"
	},
	{
		"name":"&amp;#125;",
		"description":"closing brace"
	},
	{
		"name":"&amp;#126;",
		"description":"equivalency sign - tilde"
	}
]
	///////////////////////////////////////////////		
			var _this       = this;
			var cm          = this.cm;
			var lang        = _this.lang;
			var settings    = _this.settings;
			var path        = settings.pluginPath + pluginName + "/";
			var editor      = this.editor;
			var cursor      = cm.getCursor();
			var selection   = cm.getSelection();
			var classPrefix = _this.classPrefix;

			var dialogName  = classPrefix + "dialog-" + pluginName, dialog;
			var dialogLang  = lang.dialog.htmlEntities;

			var dialogContent = [
				'<div class="' + classPrefix + 'html-entities-box" style=\"width: 760px;height: 334px;margin-bottom: 8px;overflow: hidden;overflow-y: auto;\">',
				'<div class="' + classPrefix + 'grid-table">',
				'</div>',
				'</div>',
			].join("\r\n");

			cm.focus();

			if (editor.find("." + dialogName).length > 0) 
			{
                dialog = editor.find("." + dialogName);

				selecteds = [];
				dialog.find("a").removeClass("selected");

				this.dialogShowMask(dialog);
				this.dialogLockScreen();
				dialog.show();
			} 
			else
			{
				dialog = this.createDialog({
					name       : dialogName,
					title      : dialogLang.title,
					width      : 800,
					height     : 475,
					mask       : settings.dialogShowMask,
					drag       : settings.dialogDraggable,
					content    : dialogContent,
					lockScreen : settings.dialogLockScreen,
					maskStyle  : {
						opacity         : settings.dialogMaskOpacity,
						backgroundColor : settings.dialogMaskBgColor
					},
					buttons    : {
						enter  : [lang.buttons.enter, function() {							
							cm.replaceSelection(selecteds.join(" "));
							this.hide().lockScreen(false).hideMask();
							
							return false;
						}],
						cancel : [lang.buttons.cancel, function() {                           
							this.hide().lockScreen(false).hideMask();
							
							return false;
						}]
					}
				});
			}
				
			var table = dialog.find("." + classPrefix + "grid-table");

			var drawTable = function() {

				if (entitiesData.length < 1) return ;

				var rowNumber = 20;
				var pageTotal = Math.ceil(entitiesData.length / rowNumber);

				table.html("");
				
				for (var i = 0; i < pageTotal; i++)
				{
					var row = "<div class=\"" + classPrefix + "grid-table-row\">";
					
					for (var x = 0; x < rowNumber; x++)
					{
						var entity = entitiesData[(i * rowNumber) + x];
						
						if (typeof entity !== "undefined")
						{
							var name = entity.name.replace("&amp;", "&");

							row += "<a href=\"javascript:;\" value=\"" + entity.name + "\" title=\"" + name + "\" class=\"" + classPrefix + "html-entity-btn\">" + name + "</a>";
						}
					}
					
					row += "</div>";
					
					table.append(row);
				}

				dialog.find("." + classPrefix + "html-entity-btn").bind(exports.mouseOrTouch("click", "touchend"), function() {
					$(this).toggleClass("selected");

					if ($(this).hasClass("selected")) 
					{
						selecteds.push($(this).attr("value"));
					}
				});
			};
			
			if (entitiesData.length < 1) 
			{            
				if (typeof (dialog.loading) == "function") dialog.loading(true);

				/*$.getJSON(path + pluginName.replace("-dialog", "") + ".json", function(json) {

					if (typeof (dialog.loading) == "function") dialog.loading(false);

					entitiesData = json;
					drawTable();
				});*/
				$.ajax({url:path + pluginName.replace("-dialog", "") + ".json", success : function(json){
					if (typeof (dialog.loading) == "function") dialog.loading(false);

					entitiesData = json;
					drawTable();
				},error:function(e){
					console.log(e);
					if (typeof (dialog.loading) == "function") dialog.loading(false);

					entitiesData = localjson;
					drawTable();
				}});
				
			}
			else
			{		
				drawTable();
			}
		};

	};
    
	// CommonJS/Node.js
	if (typeof require === "function" && typeof exports === "object" && typeof module === "object")
    { 
        module.exports = factory;
    }
	else if (typeof define === "function")  // AMD/CMD/Sea.js
    {
		if (define.amd) { // for Require.js

			define(["editormd"], function(editormd) {
                factory(editormd);
            });

		} else { // for Sea.js
			define(function(require) {
                var editormd = require("./../../editormd");
                factory(editormd);
            });
		}
	} 
	else
	{
        factory(window.editormd);
	}

})();
