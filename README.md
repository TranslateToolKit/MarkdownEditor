# Markdown 编辑器

Markdown 文件编辑器，可以打开 MD 文件，编辑，方便增加修改各种 Markdown 样式，另外可以进行语法错误检查以及中英文翻译。

### 作者： [gengiusq1981](https://github.com/geniusq1981)

> **windows 桌面版本：**

> **在线试用 Demo：**[Markdown 编辑器](https://translatetoolkit.github.io/MarkdownEditor/)

                   使用 Chrome 以验证，为了使用翻译功能，请设置 [Chrome 开启跨域访问权限](https://github.com/zhongxia245/blog/issues/28)

![](https://github.com/TranslateToolKit/MarkdownEditor/blob/master/readme/screenshot.JPG)

程序界面截图

### 主要功能说明
- 打开文件：只允许打开后缀名为.md 的文件

- 保存文件：直接把当前编辑内容保存到浏览器默认下载目录下，
   文件名为当前文件的名字+时间戳

- 自动翻译：将编辑区内的文字进行全局翻译
    三种翻译引擎可选：谷歌（默认），有道，百度

- 格式检查：进行全局的格式检查（规格主要参考掘金翻译计划）

### NW.js 桌面程序制作步骤

- **下载 [NW.js](https://nwjs.io/)**

       下载相应的 Windows 版本，解压
       将 MarkdownEditor 文件夹内所有内容打包成压缩文件
       MarkdownEditor.zip,复制到 NW.js 的安装目录中

- **打包命令**

       通过命令 `copy /b nw.exe+MarkdownEditor.zip MarkdownEditor.exe` 生成 MarkdownEditor.exe

- **生成 exe**

       将依赖的 dll 文件和 Test.exe 打包成一个文件:
       - 制作单一可执行程序可以使用 [Enigma Virtual Box]
       - 制作一个安装程序可以使用 [inno]

- **icon 修改**

      可以使用 [Resource Hacker](http://www.angusj.com/resourcehacker/ ) 

- **压缩工具**

