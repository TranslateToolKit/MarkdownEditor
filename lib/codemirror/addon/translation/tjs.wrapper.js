

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

// Define search commands. Depends on dialog.js or another
// implementation of the openDialog method.

// Replace works a little oddly -- it will do the replace on the next
// Ctrl-G (or whatever is bound to findNext) press. You prevent a
// replace by making sure the match is no longer selected when hitting
// Ctrl-G.

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"), require("../dialog/dialog"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror", "../dialog/dialog"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";
	const { youdao, baidu, google } = window.tjs
 	 CodeMirror.defineExtension("translate", function(mode, callbacks, options) {
     if (!mode) mode=0;
     if (mode==0){
     			console.log(this);
                const linecount = this.doc.lineCount();
                console.log(linecount);
                let selection = new Array();

                for(let i=0;i<linecount;i++){
                    console.log(i);
                    const line = this.doc.getLine(i);
                    //this.cm.doc.setSelection({line:i,ch:0},{line:i});
                    selection.push(i);
                    google.translate(line).then(result => {
                    console.log(result); // result 的数据结构见下文
                    //console.log(this.cm.doc.getRange({i},{i}));//replaceRange('',[i,0]);//,{ i,null},{i,null});
                    this.doc.setSelection({line:selection[i],ch:0},{line:selection[i]});
                    this.doc.replaceSelection(result.result.join(""),{line:selection[i],ch:0},{line:selection[i]});
                    
                    if(i>=(linecount-1))callbacks(this);
                });
                    
                    console.log(selection);
                    
                }
     }else if(mode==1){
     			const value = this.getValue();
     			console.log(value);
     			const len = value.length;     			
                const reold = new RegExp("\n" , "g");
                let valuelist = [];
                let transvalue =[];
               
                if(len>2000){
                	let le = len;
                	console.log(le);
                	let copyvalue = value;
                	while(le>0){
                		if(le<=2000){
                			valuelist.push(copyvalue);
                			le =0;
                			continue;
                		}
                	let temp = copyvalue.substr(0,2000);
                	let index = temp.lastIndexOf("\n");
                	console.log(index);
                	let newvalue = copyvalue.substring(0,index+1);
                	copyvalue = copyvalue.substring(index+1,le-1);
                	valuelist.push(newvalue);
                	le=le-index-1;
                	console.log(le);
                }
            }else{
            	valuelist.push(value);
            }
                console.log(valuelist);
                var that = this;
                let count = valuelist.length;
                valuelist.forEach(function(value,index){
                	let tempvalue = value;
                tempvalue = tempvalue.replace(reold,"\n@")
                //console.log(escape(tempvalue));
                count -= 1;
                google.translate(tempvalue).then(result => {
                    console.log(result); // result 的数据结构见下文
                    //console.log(this.cm.doc.getRange({i},{i}));//replaceRange('',[i,0]);//,{ i,null},{i,null});
                    let content = result.result.join("");
                    console.log(content.replace(new RegExp('@ ','g'),'\n'))
                    let tempcontent = content.replace(new RegExp('@','g'),'\n');
                    console.log(index);
                    transvalue[index]=tempcontent;
                   console.log(transvalue);

                    console.log(count);
                    if(count<=0){
                    	console.log(transvalue);
                    	 let content = transvalue.join("").replace(new RegExp('！','g'),'!');
                    	 console.log(content);
                    	 content = content.replace(new RegExp('（','g'),'(');
                    	 content = content.replace(new RegExp('）','g'),')');
                    	 content = content.replace(new RegExp('> *','g'),'> * ');
                    	 content = content.replace(new RegExp('＃','g'),'#');
                    	 that.setValue(content);
                   		 setTimeout(callbacks(),3000);
                    }
                  
              
                    
                    //this.loadinghide();
                });
            })

     }

  });
});
