// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

// Depends on jsonlint.js from https://github.com/zaach/jsonlint

// declare global: jsonlint

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.registerHelper("lint", "markdown", function(text) {
  var found = [];
  var options ={
	"strings": {
		"content": text
  },
  "selectRules":["juejin"]   //8,9,15,16,17,38 
  };
  
  //var results = markdownlint.sync(options).toString().split("\n");;
  var results = markdownlint.sync(options).content;
  
  for(var i=0;i<results.length;i++){
    console.log(results[i]);
  var detail = results[i].ruleNames[0] + ":" + results[i].ruleDescription;
  var posfrom,posto;
  try{
    posfrom = results[i].errorRange[0]-1;
    posto = posfrom + results[i].errorRange[1];
  }catch{
    posfrom = 0;
    posto = 0;
  }
  var lineNumber = results[i].lineNumber;
	  found.push({from: CodeMirror.Pos(lineNumber-1, posfrom),
                to: CodeMirror.Pos(lineNumber-1,posto),
                message: detail});
  }
  console.log(found);
  /*jsonlint.parseError = function(str, hash) {
    var loc = hash.loc;
    found.push({from: CodeMirror.Pos(loc.first_line - 1, loc.first_column),
                to: CodeMirror.Pos(loc.last_line - 1, loc.last_column),
                message: str});
  };
  try { jsonlint.parse(text); }
  catch(e) {}*/
  return found;
});

});
