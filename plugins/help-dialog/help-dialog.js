/*!
 * Help dialog plugin for Editor.md
 *
 * @file        help-dialog.js
 * @author      pandao
 * @version     1.2.0
 * @updateTime  2015-03-08
 * {@link       https://github.com/pandao/editor.md}
 * @license     MIT
 */

(function() {

	var factory = function (exports) {

		var $            = jQuery;
		var pluginName   = "help-dialog";

		exports.fn.helpDialog = function() {
			var _this       = this;
			var lang        = this.lang;
			var editor      = this.editor;
			var settings    = this.settings;
			var path        = settings.pluginPath + pluginName + "/";
			var classPrefix = this.classPrefix;
			var dialogName  = classPrefix + pluginName, dialog;
			var dialogLang  = lang.dialog.help;

			if (editor.find("." + dialogName).length < 1)
			{			
				var dialogContent = "<div class=\"markdown-body\" style=\"font-family:微软雅黑, Helvetica, Tahoma, STXihei,Arial;height:390px;overflow:auto;font-size:14px;border-bottom:1px solid #ddd;padding:0 20px 20px 0;\"></div>";

				dialog = this.createDialog({
					name       : dialogName,
					title      : dialogLang.title,
					width      : 840,
					height     : 540,
					mask       : settings.dialogShowMask,
					drag       : settings.dialogDraggable,
					content    : dialogContent,
					lockScreen : settings.dialogLockScreen,
					maskStyle  : {
						opacity         : settings.dialogMaskOpacity,
						backgroundColor : settings.dialogMaskBgColor
					},
					buttons    : {
						close : [lang.buttons.close, function() {      
							this.hide().lockScreen(false).hideMask();
							
							return false;
						}]
					}
				});
			}

			dialog = editor.find("." + dialogName);

			this.dialogShowMask(dialog);
			this.dialogLockScreen();
			dialog.show();

			var helpContent = dialog.find(".markdown-body");

			if (helpContent.html() === "") 
			{
				/*$.get(path + "help.md", function(text) {
					var md = exports.$marked(text);
					helpContent.html(md);
                    
                    helpContent.find("a").attr("target", "_blank");
				});*/
				$.ajax({url:path + "help.md", success : function(text){
					var md = exports.$marked(text);
					helpContent.html(md);
                    
                    helpContent.find("a").attr("target", "_blank");
				},error:function(e){
					console.log(e);
					var text = "##### Markdown语法教程 (Markdown syntax tutorial)\n\n\
- [Markdown Syntax](http://daringfireball.net/projects/markdown/syntax/ 'Markdown Syntax')\n\
- [Mastering Markdown](https://guides.github.com/features/mastering-markdown/ 'Mastering Markdown')\n\
- [Markdown Basics](https://help.github.com/articles/markdown-basics/ 'Markdown Basics')\n\
- [GitHub Flavored Markdown](https://help.github.com/articles/github-flavored-markdown/ 'GitHub Flavored Markdown')\n\
- [Markdown 语法说明（简体中文）](http://www.markdown.cn/ 'Markdown 语法说明（简体中文）')\n\
- [Markdown 語法說明（繁體中文）](http://markdown.tw/ 'Markdown 語法說明（繁體中文）')\n\n\
##### 键盘快捷键 (Keyboard shortcuts)\n\n\
> If Editor.md code editor is on focus, you can use keyboard shortcuts.\n\
    \n\
| Keyboard shortcuts (键盘快捷键)                 |   说明                            | Description                                        |\n\
| :---------------------------------------------- |:--------------------------------- | :------------------------------------------------- |\n\
| F9                                              | 切换实时预览                      | Switch watch/unwatch                               |\n\
| F10                                             | 全屏HTML预览(按 Shift + ESC 退出) | Full preview HTML (Press Shift + ESC exit)         |\n\
| F11                                             | 切换全屏状态                      | Switch fullscreen (Press ESC exit)                 |\n\
| Ctrl + 1~6 / Command + 1~6                      | 插入标题1~6                       | Insert heading 1~6                                 |\n\
| Ctrl + A / Command + A                          | 全选                              | Select all                                         |\n\
| Ctrl + B / Command + B                          | 插入粗体                          | Insert bold                                        |\n\
| Ctrl + D / Command + D                          | 插入日期时间                      | Insert datetime                                    |\n\
| Ctrl + E / Command + E                          | 插入Emoji符号                     | Insert &#58;emoji&#58;                             |\n\
| Ctrl + F / Command + F                          | 查找/搜索                         | Start searching                                    |\n\
| Ctrl + G / Command + G                          | 切换到下一个搜索结果项            | Find next search results                           |\n\
| Ctrl + H / Command + H                          | 插入水平线                        | Insert horizontal rule                             |\n\
| Ctrl + I / Command + I                          | 插入斜体                          | Insert italic                                      |\n\
| Ctrl + K / Command + K                          | 插入行内代码                      | Insert inline code                                 |\n\
| Ctrl + L / Command + L                          | 插入链接                          | Insert link                                        |\n\
| Ctrl + U / Command + U                          | 插入无序列表                      | Insert unordered list                              |\n\
| Ctrl + Q                                        | 代码折叠切换                      | Switch code fold                                   |\n\
| Ctrl + Z / Command + Z                          | 撤销                              | Undo                                               |\n\
| Ctrl + Y / Command + Y                          | 重做                              | Redo                                               |\n\
| Ctrl + Shift + A                                | 插入@链接                         | Insert &#64;link                                   |\n\
| Ctrl + Shift + C                                | 插入行内代码                      | Insert inline code                                 |\n\
| Ctrl + Shift + E                                | 打开插入Emoji表情对话框           | Open emoji dialog                                  |\n\
| Ctrl + Shift + F / Command + Option + F         | 替换                              | Replace                                            |\n\
| Ctrl + Shift + G / Shift + Command + G          | 切换到上一个搜索结果项            | Find previous search results                       |\n\
| Ctrl + Shift + H                                | 打开HTML实体字符对话框            | Open HTML Entities dialog                          |\n\
| Ctrl + Shift + I                                | 插入图片                          | Insert image &#33;[]&#40;&#41;                     |\n\
| Ctrl + Shift + K                                | 插入TeX(KaTeX)公式符号            | Insert TeX(KaTeX) symbol &#36;&#36;TeX&#36;&#36;   |\n\
| Ctrl + Shift + L                                | 打开插入链接对话框                | Open link dialog                                   |\n\
| Ctrl + Shift + O                                | 插入有序列表                      | Insert ordered list                                |\n\
| Ctrl + Shift + P                                | 打开插入PRE对话框                 | Open Preformatted text dialog                      |\n\
| Ctrl + Shift + Q                                | 插入引用                          | Insert blockquotes                                 |\n\
| Ctrl + Shift + R / Shift + Command + Option + F | 全部替换                          | Replace all                                        |\n\
| Ctrl + Shift + S                                | 插入删除线                        | Insert strikethrough                               |\n\
| Ctrl + Shift + T                                | 打开插入表格对话框                | Open table dialog                                  |\n\
| Ctrl + Shift + U                                | 将所选文字转成大写                | Selection text convert to uppercase                |\n\
| Shift + Alt + C                                 | 插入```代码                       | Insert code blocks (```)                           |\n\
| Shift + Alt + H                                 | 打开使用帮助对话框                | Open help dialog                                   |\n\
| Shift + Alt + L                                 | 将所选文本转成小写                | Selection text convert to lowercase                |\n\
| Shift + Alt + P                                 | 插入分页符                        | Insert page break                                  |\n\
| Alt + L                                         | 将所选文本转成小写                | Selection text convert to lowercase                |\n\
| Shift + Alt + U                                 | 将所选的每个单词的首字母转成大写  | Selection words first letter convert to Uppercase  |\n\
| Ctrl + Shift + Alt + C                          | 打开插入代码块对话框层            | Open code blocks dialog                            |\n\
| Ctrl + Shift + Alt + I                          | 打开插入图片对话框层              | Open image dialog                                  |\n\
| Ctrl + Shift + Alt + U                          | 将所选文本的第一个首字母转成大写  | Selection text first letter convert to uppercase   |\n\
| Ctrl + Alt + G                                  | 跳转到指定的行                    | Goto line                                          |\n\
\n\
##### Emoji表情参考 (Emoji reference)\n\
\n\
- [Github emoji](https://www.webpagefx.com/tools/emoji-cheat-sheet/ 'Github emoji')\n\
- [Twitter Emoji \(Twemoji\)](http://twitter.github.io/twemoji/preview.html 'Twitter Emoji \(Twemoji\)')\n\
- [FontAwesome icons emoji](http://fortawesome.github.io/Font-Awesome/icons/ 'FontAwesome icons emoji')\n\
\n\
##### 流程图参考 (Flowchart reference)\n\
\n\
[http://adrai.github.io/flowchart.js/](http://adrai.github.io/flowchart.js/)\n\
\n\
##### 时序图参考 (SequenceDiagram reference)\n\
\n\
[http://bramp.github.io/js-sequence-diagrams/](http://bramp.github.io/js-sequence-diagrams/)\n\
\n\
##### TeX/LaTeX reference\n\
\n\
[http://meta.wikimedia.org/wiki/Help:Formula](http://meta.wikimedia.org/wiki/Help:Formula)\n\
";
					var md = exports.$marked(text);
					helpContent.html(md);
                    
                    helpContent.find("a").attr("target", "_blank");
				}});
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
