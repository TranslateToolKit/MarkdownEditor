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
  "selectRules":[8,15,16]
  };
  var results = markdownlint.sync(options).toString().split("\n");;
  
  console.log(results);
  for(var i=0;i<results.length;i++){
	  var temp = results[i].split(": ");
	  console.log(temp);
	  found.push({from: CodeMirror.Pos(temp[1]-1, 2),
                to: CodeMirror.Pos(temp[1]-1,4),
                message: temp[2]});
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
