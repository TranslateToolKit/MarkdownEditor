/* markdownlint - https://github.com/DavidAnson/markdownlint - @license MIT */

(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.markdownlint = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

// Alias "markdown-it" (expected) to "markdownit" (exported)
module.exports = window.markdownit;
if (!module.exports) {
  console.error("markdown-it must be loaded before markdownlint.");
}

},{}],2:[function(require,module,exports){
// @ts-check
"use strict";
var fs = require("fs");
var path = require("path");
var md = require("markdown-it")({ "html": true });
var rules = require("./rules");
var shared = require("./shared");
// Validates the list of rules for structure and reuse
function validateRuleList(ruleList) {
    var result = null;
    if (ruleList.length === rules.length) {
        // No need to validate if only using built-in rules
        return result;
    }
    var allIds = {};
    ruleList.forEach(function forRule(rule, index) {
        var customIndex = index - rules.length;
        function newError(property) {
            return new Error("Property '" + property + "' of custom rule at index " +
                customIndex + " is incorrect.");
        }
        ["names", "tags"].forEach(function forProperty(property) {
            var value = rule[property];
            if (!result &&
                (!value || !Array.isArray(value) || (value.length === 0) ||
                    !value.every(shared.isString) || value.some(shared.isEmptyString))) {
                result = newError(property);
            }
        });
        [
            ["description", "string"],
            ["function", "function"]
        ].forEach(function forProperty(propertyInfo) {
            var property = propertyInfo[0];
            var value = rule[property];
            if (!result && (!value || (typeof value !== propertyInfo[1]))) {
                result = newError(property);
            }
        });
        if (!result) {
            rule.names.forEach(function forName(name) {
                var nameUpper = name.toUpperCase();
                if (!result && (allIds[nameUpper] !== undefined)) {
                    result = new Error("Name '" + name + "' of custom rule at index " +
                        customIndex + " is already used as a name or tag.");
                }
                allIds[nameUpper] = true;
            });
            rule.tags.forEach(function forTag(tag) {
                var tagUpper = tag.toUpperCase();
                if (!result && allIds[tagUpper]) {
                    result = new Error("Tag '" + tag + "' of custom rule at index " +
                        customIndex + " is already used as a name.");
                }
                allIds[tagUpper] = false;
            });
        }
    });
    return result;
}
// Class for results with toString for pretty display
function newResults(ruleList) {
    function Results() { }
    Results.prototype.toString = function resultsToString(useAlias) {
        var that = this;
        var ruleNameToRule = null;
        var results = [];
        Object.keys(that).forEach(function forFile(file) {
            var fileResults = that[file];
            if (Array.isArray(fileResults)) {
                fileResults.forEach(function forResult(result) {
                    var ruleMoniker = result.ruleNames ?
                        result.ruleNames.join("/") :
                        (result.ruleName + "/" + result.ruleAlias);
                    results.push(file + ": " +
                        result.lineNumber + ": " +
                        ruleMoniker + " " +
                        result.ruleDescription +
                        (result.errorDetail ?
                            " [" + result.errorDetail + "]" :
                            "") +
                        (result.errorContext ?
                            " [Context: \"" + result.errorContext + "\"]" :
                            ""));
                });
            }
            else {
                if (!ruleNameToRule) {
                    ruleNameToRule = {};
                    ruleList.forEach(function forRule(rule) {
                        var ruleName = rule.names[0].toUpperCase();
                        ruleNameToRule[ruleName] = rule;
                    });
                }
                Object.keys(fileResults).forEach(function forRule(ruleName) {
                    var rule = ruleNameToRule[ruleName.toUpperCase()];
                    var ruleResults = fileResults[ruleName];
                    ruleResults.forEach(function forLine(lineNumber) {
                        var nameIndex = Math.min(useAlias ? 1 : 0, rule.names.length - 1);
                        var result = file + ": " +
                            lineNumber + ": " +
                            rule.names[nameIndex] + " " +
                            rule.description;
                        results.push(result);
                    });
                });
            }
        });
        return results.join("\n");
    };
    return new Results();
}
// Remove front matter (if present at beginning of content)
function removeFrontMatter(content, frontMatter) {
    var frontMatterLines = [];
    if (frontMatter) {
        var frontMatterMatch = content.match(frontMatter);
        if (frontMatterMatch && !frontMatterMatch.index) {
            var contentMatched = frontMatterMatch[0];
            content = content.slice(contentMatched.length);
            frontMatterLines = contentMatched.split(shared.newLineRe);
            if (frontMatterLines.length &&
                (frontMatterLines[frontMatterLines.length - 1] === "")) {
                frontMatterLines.length--;
            }
        }
    }
    return {
        "content": content,
        "frontMatterLines": frontMatterLines
    };
}
// Annotate tokens with line/lineNumber
function annotateTokens(tokens, lines) {
    var tbodyMap = null;
    tokens.forEach(function forToken(token) {
        // Handle missing maps for table body
        if (token.type === "tbody_open") {
            tbodyMap = token.map.slice();
        }
        else if ((token.type === "tr_close") && tbodyMap) {
            tbodyMap[0]++;
        }
        else if (token.type === "tbody_close") {
            tbodyMap = null;
        }
        if (tbodyMap && !token.map) {
            token.map = tbodyMap.slice();
        }
        // Update token metadata
        if (token.map) {
            token.line = lines[token.map[0]];
            token.lineNumber = token.map[0] + 1;
            // Trim bottom of token to exclude whitespace lines
            while (token.map[1] && !(lines[token.map[1] - 1].trim())) {
                token.map[1]--;
            }
            // Annotate children with lineNumber
            var lineNumber_1 = token.lineNumber;
            (token.children || []).forEach(function forChild(child) {
                child.lineNumber = lineNumber_1;
                child.line = lines[lineNumber_1 - 1];
                if ((child.type === "softbreak") || (child.type === "hardbreak")) {
                    lineNumber_1++;
                }
            });
        }
    });
}
// Map rule names/tags to canonical rule name
function mapAliasToRuleNames(ruleList) {
    var aliasToRuleNames = {};
    // const tagToRuleNames = {};
    ruleList.forEach(function forRule(rule) {
        var ruleName = rule.names[0].toUpperCase();
        // The following is useful for updating README.md:
        // console.log(
        //   "* **[" + ruleName + "](doc/Rules.md#" + ruleName.toLowerCase() +
        //    ")** *" + rule.names.slice(1).join("/") + "* - " + rule.description);
        rule.names.forEach(function forName(name) {
            var nameUpper = name.toUpperCase();
            aliasToRuleNames[nameUpper] = [ruleName];
        });
        rule.tags.forEach(function forTag(tag) {
            var tagUpper = tag.toUpperCase();
            var ruleNames = aliasToRuleNames[tagUpper] || [];
            ruleNames.push(ruleName);
            aliasToRuleNames[tagUpper] = ruleNames;
            // tagToRuleNames[tag] = ruleName;
        });
    });
    // The following is useful for updating README.md:
    // Object.keys(tagToRuleNames).sort().forEach(function forTag(tag) {
    //   console.log("* **" + tag + "** - " +
    //     aliasToRuleNames[tag.toUpperCase()].join(", "));
    // });
    return aliasToRuleNames;
}
// Apply (and normalize) config
function getEffectiveConfig(ruleList, config, aliasToRuleNames) {
    var defaultKey = Object.keys(config).filter(function forKey(key) {
        return key.toUpperCase() === "DEFAULT";
    });
    var ruleDefault = (defaultKey.length === 0) || !!config[defaultKey[0]];
    var effectiveConfig = {};
    ruleList.forEach(function forRule(rule) {
        var ruleName = rule.names[0].toUpperCase();
        effectiveConfig[ruleName] = ruleDefault;
    });
    Object.keys(config).forEach(function forKey(key) {
        var value = config[key];
        if (value) {
            if (!(value instanceof Object)) {
                value = {};
            }
        }
        else {
            value = false;
        }
        var keyUpper = key.toUpperCase();
        (aliasToRuleNames[keyUpper] || []).forEach(function forRule(ruleName) {
            effectiveConfig[ruleName] = value;
        });
    });
    return effectiveConfig;
}
// Create mapping of enabled rules per line
function getEnabledRulesPerLineNumber(ruleList, lines, frontMatterLines, noInlineConfig, effectiveConfig, aliasToRuleNames) {
    var enabledRules = {};
    var allRuleNames = [];
    ruleList.forEach(function forRule(rule) {
        var ruleName = rule.names[0].toUpperCase();
        allRuleNames.push(ruleName);
        enabledRules[ruleName] = !!effectiveConfig[ruleName];
    });
    function forMatch(match) {
        var enabled = match[1].toUpperCase() === "EN";
        var items = match[2] ?
            match[2].trim().toUpperCase().split(/\s+/) :
            allRuleNames;
        items.forEach(function forItem(nameUpper) {
            (aliasToRuleNames[nameUpper] || []).forEach(function forRule(ruleName) {
                enabledRules[ruleName] = enabled;
            });
        });
    }
    var enabledRulesPerLineNumber = new Array(1 + frontMatterLines.length);
    lines.forEach(function forLine(line) {
        if (!noInlineConfig) {
            var match = shared.inlineCommentRe.exec(line);
            if (match) {
                enabledRules = shared.clone(enabledRules);
                while (match) {
                    forMatch(match);
                    match = shared.inlineCommentRe.exec(line);
                }
            }
        }
        enabledRulesPerLineNumber.push(enabledRules);
    });
    return enabledRulesPerLineNumber;
}
// Array.sort comparison for objects in errors array
function lineNumberComparison(a, b) {
    return a.lineNumber - b.lineNumber;
}
// Function to return unique values from a sorted errors array
function uniqueFilterForSortedErrors(value, index, array) {
    return (index === 0) || (value.lineNumber > array[index - 1].lineNumber);
}
// Lints a single string
function lintContent(ruleList, name, content, config, frontMatter, noInlineConfig, resultVersion, callback) {
    // Remove UTF-8 byte order marker (if present)
    content = content.replace(/^\ufeff/, "");
    // Remove front matter
    var removeFrontMatterResult = removeFrontMatter(content, frontMatter);
    var frontMatterLines = removeFrontMatterResult.frontMatterLines;
    // Ignore the content of HTML comments
    content = shared.clearHtmlCommentText(removeFrontMatterResult.content);
    // Parse content into tokens and lines
    var tokens = md.parse(content, {});
    var lines = content.split(shared.newLineRe);
    annotateTokens(tokens, lines);
    var aliasToRuleNames = mapAliasToRuleNames(ruleList);
    var effectiveConfig = getEffectiveConfig(ruleList, config, aliasToRuleNames);
    var enabledRulesPerLineNumber = getEnabledRulesPerLineNumber(ruleList, lines, frontMatterLines, noInlineConfig, effectiveConfig, aliasToRuleNames);
    // Create parameters for rules
    var params = {
        name: name,
        tokens: tokens,
        lines: lines,
        frontMatterLines: frontMatterLines
    };
    shared.makeTokenCache(params);
    // Function to run for each rule
    var result = (resultVersion === 0) ? {} : [];
    function forRule(rule) {
        // Configure rule
        var ruleNameFriendly = rule.names[0];
        var ruleName = ruleNameFriendly.toUpperCase();
        params.config = effectiveConfig[ruleName];
        function throwError(property) {
            throw new Error("Property '" + property + "' of onError parameter is incorrect.");
        }
        var errors = [];
        function onError(errorInfo) {
            if (!errorInfo ||
                !errorInfo.lineNumber ||
                !shared.isNumber(errorInfo.lineNumber)) {
                throwError("lineNumber");
            }
            if (errorInfo.detail &&
                !shared.isString(errorInfo.detail)) {
                throwError("detail");
            }
            if (errorInfo.context &&
                !shared.isString(errorInfo.context)) {
                throwError("context");
            }
            if (errorInfo.range &&
                (!Array.isArray(errorInfo.range) ||
                    (errorInfo.range.length !== 2) ||
                    !shared.isNumber(errorInfo.range[0]) ||
                    !shared.isNumber(errorInfo.range[1]))) {
                throwError("range");
            }
            errors.push({
                "lineNumber": errorInfo.lineNumber + frontMatterLines.length,
                "detail": errorInfo.detail || null,
                "context": errorInfo.context || null,
                "range": errorInfo.range || null
            });
        }
        // Call (possibly external) rule function
        rule["function"](params, onError);
        // Record any errors (significant performance benefit from length check)
        if (errors.length) {
            errors.sort(lineNumberComparison);
            var filteredErrors = errors
                .filter(uniqueFilterForSortedErrors)
                .filter(function removeDisabledRules(error) {
                return enabledRulesPerLineNumber[error.lineNumber][ruleName];
            })
                .map(function formatResults(error) {
                if (resultVersion === 0) {
                    return error.lineNumber;
                }
                var errorObject = {};
                errorObject.lineNumber = error.lineNumber;
                if (resultVersion === 1) {
                    errorObject.ruleName = ruleNameFriendly;
                    errorObject.ruleAlias = rule.names[1] || rule.names[0];
                }
                else {
                    errorObject.ruleNames = rule.names;
                }
                errorObject.ruleDescription = rule.description;
                errorObject.errorDetail = error.detail;
                errorObject.errorContext = error.context;
                errorObject.errorRange = error.range;
                return errorObject;
            });
            if (filteredErrors.length) {
                if (resultVersion === 0) {
                    result[ruleNameFriendly] = filteredErrors;
                }
                else {
                    Array.prototype.push.apply(result, filteredErrors);
                }
            }
        }
    }
    // Run all rules
    try {
        ruleList.forEach(forRule);
    }
    catch (ex) {
        shared.makeTokenCache(null);
        return callback(ex);
    }
    shared.makeTokenCache(null);
    callback(null, result);
}
// Lints a single file
function lintFile(ruleList, file, config, frontMatter, noInlineConfig, resultVersion, synchronous, callback) {
    function lintContentWrapper(err, content) {
        if (err) {
            return callback(err);
        }
        lintContent(ruleList, file, content, config, frontMatter, noInlineConfig, resultVersion, callback);
    }
    // Make a/synchronous call to read file
    if (synchronous) {
        lintContentWrapper(null, fs.readFileSync(file, shared.utf8Encoding));
    }
    else {
        fs.readFile(file, shared.utf8Encoding, lintContentWrapper);
    }
}
// Lints files and strings
function lintInput(options, synchronous, callback) {
    // Normalize inputs
    options = options || {};
    callback = callback || function noop() { };
    var ruleList = rules.concat(options.customRules || []);
    var ruleErr = validateRuleList(ruleList);
    if (ruleErr) {
        return callback(ruleErr);
    }
    var files = [];
    if (Array.isArray(options.files)) {
        files = options.files.slice();
    }
    else if (options.files) {
        files = [String(options.files)];
    }
    var strings = options.strings || {};
    var stringsKeys = Object.keys(strings);
    var config = options.config || { "default": true };
    var frontMatter = (options.frontMatter === undefined) ?
        shared.frontMatterRe : options.frontMatter;
    var noInlineConfig = !!options.noInlineConfig;
    var resultVersion = (options.resultVersion === undefined) ?
        2 : options.resultVersion;
    var results = newResults(ruleList);
    // Helper to lint the next string or file
    function lintNextItem() {
        var iterating = true;
        var item = null;
        function lintNextItemCallback(err, result) {
            if (err) {
                iterating = false;
                return callback(err);
            }
            results[item] = result;
            if (!iterating) {
                lintNextItem();
            }
        }
        while (iterating) {
            if ((item = stringsKeys.shift())) {
                lintContent(ruleList, item, strings[item] || "", config, frontMatter, noInlineConfig, resultVersion, lintNextItemCallback);
            }
            else if ((item = files.shift())) {
                iterating = synchronous;
                lintFile(ruleList, item, config, frontMatter, noInlineConfig, resultVersion, synchronous, lintNextItemCallback);
            }
            else {
                return callback(null, results);
            }
        }
    }
    lintNextItem();
}
/**
 * Lint specified Markdown files.
 *
 * @param {Object} options Configuration options.
 * @param {Function} callback Callback (err, result) function.
 * @returns {void}
 */
function markdownlint(options, callback) {
    return lintInput(options, false, callback);
}
/**
 * Lint specified Markdown files synchronously.
 *
 * @param {Object} options Configuration options.
 * @returns {Object} Result object.
 */
function markdownlintSync(options) {
    var results = null;
    lintInput(options, true, function callback(error, res) {
        if (error) {
            throw error;
        }
        results = res;
    });
    return results;
}
// Parses the content of a configuration file
function parseConfiguration(name, content, parsers) {
    var config = null;
    var message = "";
    var errors = [];
    // Try each parser
    (parsers || [JSON.parse]).every(function (parser) {
        try {
            config = parser(content);
        }
        catch (ex) {
            errors.push(ex.message);
        }
        return !config;
    });
    // Message if unable to parse
    if (!config) {
        errors.unshift("Unable to parse '" + name + "'");
        message = errors.join("; ");
    }
    return {
        config: config,
        message: message
    };
}
/**
 * Read specified configuration file.
 *
 * @param {String} file Configuration file name/path.
 * @param {Array} [parsers] Optional parsing function(s).
 * @param {Function} callback Callback (err, result) function.
 * @returns {void}
 */
function readConfig(file, parsers, callback) {
    if (!callback) {
        // @ts-ignore
        callback = parsers;
        parsers = null;
    }
    // Read file
    fs.readFile(file, shared.utf8Encoding, function (err, content) {
        if (err) {
            return callback(err);
        }
        // Try to parse file
        var _a = parseConfiguration(file, content, parsers), config = _a.config, message = _a.message;
        if (!config) {
            return callback(new Error(message));
        }
        // Extend configuration
        var configExtends = config["extends"];
        if (configExtends) {
            delete config["extends"];
            var extendsFile = path.resolve(path.dirname(file), configExtends);
            readConfig(extendsFile, parsers, function (errr, extendsConfig) {
                if (errr) {
                    return callback(errr);
                }
                callback(null, shared.assign(extendsConfig, config));
            });
        }
        else {
            callback(null, config);
        }
    });
}
/**
 * Read specified configuration file synchronously.
 *
 * @param {String} file Configuration file name/path.
 * @param {Array} [parsers] Optional parsing function(s).
 * @returns {Object} Configuration object.
 */
function readConfigSync(file, parsers) {
    // Read file
    var content = fs.readFileSync(file, shared.utf8Encoding);
    // Try to parse file
    var _a = parseConfiguration(file, content, parsers), config = _a.config, message = _a.message;
    if (!config) {
        throw new Error(message);
    }
    // Extend configuration
    var configExtends = config["extends"];
    if (configExtends) {
        delete config["extends"];
        return shared.assign(readConfigSync(path.resolve(path.dirname(file), configExtends), parsers), config);
    }
    return config;
}
// Export a/synchronous APIs
markdownlint.sync = markdownlintSync;
markdownlint.readConfig = readConfig;
markdownlint.readConfigSync = readConfigSync;
module.exports = markdownlint;

},{"./rules":44,"./shared":45,"fs":46,"markdown-it":1,"path":47}],3:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "MD001", "heading-increment", "header-increment" ],
  "description": "Heading levels should only increment by one level at a time",
  "tags": [ "headings", "headers" ],
  "function": function MD001(params, onError) {
    let prevLevel = 0;
    shared.filterTokens(params, "heading_open", function forToken(token) {
      const level = parseInt(token.tag.slice(1), 10);
      if (prevLevel && (level > prevLevel)) {
        shared.addErrorDetailIf(onError, token.lineNumber,
          "h" + (prevLevel + 1), "h" + level);
      }
      prevLevel = level;
    });
  }
};

},{"./shared":45}],4:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "MD002", "first-heading-h1", "first-header-h1" ],
  "description": "First heading should be a top level heading",
  "tags": [ "headings", "headers" ],
  "function": function MD002(params, onError) {
    const level = params.config.level || 1;
    const tag = "h" + level;
    params.tokens.every(function forToken(token) {
      if (token.type === "heading_open") {
        shared.addErrorDetailIf(onError, token.lineNumber, tag, token.tag);
        return false;
      }
      return true;
    });
  }
};

},{"./shared":45}],5:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "MD003", "heading-style", "header-style" ],
  "description": "Heading style",
  "tags": [ "headings", "headers" ],
  "function": function MD003(params, onError) {
    let style = params.config.style || "consistent";
    shared.filterTokens(params, "heading_open", function forToken(token) {
      const styleForToken = shared.headingStyleFor(token);
      if (style === "consistent") {
        style = styleForToken;
      }
      if (styleForToken !== style) {
        const h12 = /h[12]/.test(token.tag);
        const setextWithAtx =
          (style === "setext_with_atx") &&
            ((h12 && (styleForToken === "setext")) ||
            (!h12 && (styleForToken === "atx")));
        const setextWithAtxClosed =
          (style === "setext_with_atx_closed") &&
            ((h12 && (styleForToken === "setext")) ||
            (!h12 && (styleForToken === "atx_closed")));
        if (!setextWithAtx && !setextWithAtxClosed) {
          let expected = style;
          if (style === "setext_with_atx") {
            expected = h12 ? "setext" : "atx";
          } else if (style === "setext_with_atx_closed") {
            expected = h12 ? "setext" : "atx_closed";
          }
          shared.addErrorDetailIf(onError, token.lineNumber,
            expected, styleForToken);
        }
      }
    });
  }
};

},{"./shared":45}],6:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

// Returns the unordered list style for a list item token
function unorderedListStyleFor(token) {
  switch (token.markup) {
    case "-":
      return "dash";
    case "+":
      return "plus";
    // case "*":
    default:
      return "asterisk";
  }
}

module.exports = {
  "names": [ "MD004", "ul-style" ],
  "description": "Unordered list style",
  "tags": [ "bullet", "ul" ],
  "function": function MD004(params, onError) {
    const style = params.config.style || "consistent";
    let expectedStyle = style;
    const nestingStyles = [];
    shared.flattenLists().forEach(function forList(list) {
      if (list.unordered) {
        if (expectedStyle === "consistent") {
          expectedStyle = unorderedListStyleFor(list.items[0]);
        }
        list.items.forEach(function forItem(item) {
          const itemStyle = unorderedListStyleFor(item);
          if (style === "sublist") {
            const nesting = list.nesting;
            if (!nestingStyles[nesting] &&
              (itemStyle !== nestingStyles[nesting - 1])) {
              nestingStyles[nesting] = itemStyle;
            } else {
              shared.addErrorDetailIf(onError, item.lineNumber,
                nestingStyles[nesting], itemStyle, null,
                shared.rangeFromRegExp(item.line, shared.listItemMarkerRe));
            }
          } else {
            shared.addErrorDetailIf(onError, item.lineNumber,
              expectedStyle, itemStyle, null,
              shared.rangeFromRegExp(item.line, shared.listItemMarkerRe));
          }
        });
      }
    });
  }
};

},{"./shared":45}],7:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "MD005", "list-indent" ],
  "description": "Inconsistent indentation for list items at the same level",
  "tags": [ "bullet", "ul", "indentation" ],
  "function": function MD005(params, onError) {
    shared.flattenLists().forEach(function forList(list) {
      list.items.forEach(function forItem(item) {
        shared.addErrorDetailIf(onError, item.lineNumber, list.indent,
          shared.indentFor(item), null,
          shared.rangeFromRegExp(item.line, shared.listItemMarkerRe));
      });
    });
  }
};

},{"./shared":45}],8:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "MD006", "ul-start-left" ],
  "description":
    "Consider starting bulleted lists at the beginning of the line",
  "tags": [ "bullet", "ul", "indentation" ],
  "function": function MD006(params, onError) {
    shared.flattenLists().forEach(function forList(list) {
      if (list.unordered && !list.nesting) {
        shared.addErrorDetailIf(onError, list.open.lineNumber,
          0, list.indent, null,
          shared.rangeFromRegExp(list.open.line, shared.listItemMarkerRe));
      }
    });
  }
};

},{"./shared":45}],9:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "MD007", "ul-indent" ],
  "description": "Unordered list indentation",
  "tags": [ "bullet", "ul", "indentation" ],
  "function": function MD007(params, onError) {
    const optionsIndent = params.config.indent || 2;
    shared.flattenLists().forEach(function forList(list) {
      if (list.unordered && list.parentsUnordered && list.indent) {
        shared.addErrorDetailIf(onError, list.open.lineNumber,
          list.parentIndent + optionsIndent, list.indent, null,
          shared.rangeFromRegExp(list.open.line, shared.listItemMarkerRe));
      }
    });
  }
};

},{"./shared":45}],10:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

const trailingSpaceRe = /\s+$/;

module.exports = {
  "names": [ "MD009", "no-trailing-spaces" ],
  "description": "Trailing spaces",
  "tags": [ "whitespace" ],
  "function": function MD009(params, onError) {
    let brSpaces = params.config.br_spaces;
    if (brSpaces === undefined) {
      brSpaces = 2;
    }
    const listItemEmptyLines = params.config.list_item_empty_lines;
    const allowListItemEmptyLines =
      (listItemEmptyLines === undefined) ? false : !!listItemEmptyLines;
    const listItemLineNumbers = [];
    if (allowListItemEmptyLines) {
      shared.filterTokens(params, "list_item_open", function forToken(token) {
        for (let i = token.map[0]; i < token.map[1]; i++) {
          listItemLineNumbers.push(i + 1);
        }
      });
    }
    const expected = (brSpaces < 2) ? 0 : brSpaces;
    shared.forEachLine(function forLine(line, lineIndex) {
      const lineNumber = lineIndex + 1;
      if (trailingSpaceRe.test(line) &&
        (listItemLineNumbers.indexOf(lineNumber) === -1)) {
        const actual = line.length - shared.trimRight(line).length;
        if (expected !== actual) {
          shared.addError(onError, lineNumber,
            "Expected: " + (expected === 0 ? "" : "0 or ") +
              expected + "; Actual: " + actual,
            null,
            shared.rangeFromRegExp(line, trailingSpaceRe));
        }
      }
    });
  }
};

},{"./shared":45}],11:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

const tabRe = /\t+/;

module.exports = {
  "names": [ "MD010", "no-hard-tabs" ],
  "description": "Hard tabs",
  "tags": [ "whitespace", "hard_tab" ],
  "function": function MD010(params, onError) {
    const codeBlocks = params.config.code_blocks;
    const includeCodeBlocks = (codeBlocks === undefined) ? true : !!codeBlocks;
    shared.forEachLine(function forLine(line, lineIndex, inCode) {
      if (tabRe.test(line) && (!inCode || includeCodeBlocks)) {
        shared.addError(onError, lineIndex + 1,
          "Column: " + (line.indexOf("\t") + 1), null,
          shared.rangeFromRegExp(line, tabRe));
      }
    });
  }
};

},{"./shared":45}],12:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

const reversedLinkRe = /\([^)]+\)\[[^\]^][^\]]*]/;

module.exports = {
  "names": [ "MD011", "no-reversed-links" ],
  "description": "Reversed link syntax",
  "tags": [ "links" ],
  "function": function MD011(params, onError) {
    shared.forEachInlineChild(params, "text", function forToken(token) {
      const match = reversedLinkRe.exec(token.content);
      if (match) {
        shared.addError(onError, token.lineNumber, match[0], null,
          shared.rangeFromRegExp(token.line, reversedLinkRe));
      }
    });
  }
};

},{"./shared":45}],13:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "MD012", "no-multiple-blanks" ],
  "description": "Multiple consecutive blank lines",
  "tags": [ "whitespace", "blank_lines" ],
  "function": function MD012(params, onError) {
    const maximum = params.config.maximum || 1;
    let count = 0;
    shared.forEachLine(function forLine(line, lineIndex, inCode) {
      count = (inCode || line.trim().length) ? 0 : count + 1;
      if (maximum < count) {
        shared.addErrorDetailIf(onError, lineIndex + 1, maximum, count);
      }
    });
  }
};

},{"./shared":45}],14:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

const labelRe = /^\s*\[.*[^\\]]:/;

module.exports = {
  "names": [ "MD013", "line-length" ],
  "description": "Line length",
  "tags": [ "line_length" ],
  "function": function MD013(params, onError) {
    const lineLength = params.config.line_length || 80;
    const codeBlocks = params.config.code_blocks;
    const includeCodeBlocks = (codeBlocks === undefined) ? true : !!codeBlocks;
    const tables = params.config.tables;
    const includeTables = (tables === undefined) ? true : !!tables;
    let headings = params.config.headings;
    if (headings === undefined) {
      headings = params.config.headers;
    }
    const includeHeadings = (headings === undefined) ? true : !!headings;
    const headingLineNumbers = [];
    if (!includeHeadings) {
      shared.forEachHeading(params, function forHeading(heading) {
        headingLineNumbers.push(heading.lineNumber);
      });
    }
    const tokenTypeMap = {
      "em_open": "e",
      "em_close": "E",
      "link_open": "l",
      "link_close": "L",
      "strong_open": "s",
      "strong_close": "S",
      "text": "T"
    };
    const linkOnlyLineNumbers = [];
    shared.filterTokens(params, "inline", function forToken(token) {
      let childTokenTypes = "";
      token.children.forEach(function forChild(child) {
        if (child.type !== "text" || child.content !== "") {
          childTokenTypes += tokenTypeMap[child.type] || "x";
        }
      });
      if (/^[es]*lT?L[ES]*$/.test(childTokenTypes)) {
        linkOnlyLineNumbers.push(token.lineNumber);
      }
    });
    const longLineRe = new RegExp("^(.{" + lineLength + "})(.*\\s.*)$");
    shared.forEachLine(
      function forLine(line, lineIndex, inCode, onFence, inTable) {
        const lineNumber = lineIndex + 1;
        if ((includeCodeBlocks || !inCode) &&
            (includeTables || !inTable) &&
            (includeHeadings || (headingLineNumbers.indexOf(lineNumber)) < 0) &&
            (linkOnlyLineNumbers.indexOf(lineNumber) < 0) &&
            longLineRe.test(line) &&
            !labelRe.test(line)) {
          shared.addErrorDetailIf(onError, lineNumber, lineLength,
            line.length, null, shared.rangeFromRegExp(line, longLineRe));
        }
      });
  }
};

},{"./shared":45}],15:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

const dollarCommandRe = /^(\s*)(\$\s)/;

module.exports = {
  "names": [ "MD014", "commands-show-output" ],
  "description": "Dollar signs used before commands without showing output",
  "tags": [ "code" ],
  "function": function MD014(params, onError) {
    [ "code_block", "fence" ].forEach(function forType(type) {
      shared.filterTokens(params, type, function forToken(token) {
        let allBlank = true;
        if (token.content && token.content.split(shared.newLineRe)
          .every(function forLine(line) {
            return !line || (allBlank = false) || dollarCommandRe.test(line);
          }) && !allBlank) {
          shared.addErrorContext(onError, token.lineNumber,
            token.content.split(shared.newLineRe)[0].trim(), null, null,
            shared.rangeFromRegExp(token.line, dollarCommandRe));
        }
      });
    });
  }
};

},{"./shared":45}],16:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "MD018", "no-missing-space-atx" ],
  "description": "No space after hash on atx style heading",
  "tags": [ "headings", "headers", "atx", "spaces" ],
  "function": function MD018(params, onError) {
    shared.forEachLine(function forLine(line, lineIndex, inCode) {
      if (!inCode && /^#+[^#\s]/.test(line) && !/#$/.test(line)) {
        shared.addErrorContext(onError, lineIndex + 1, line.trim(), null,
          null, shared.rangeFromRegExp(line, shared.atxHeadingSpaceRe));
      }
    });
  }
};

},{"./shared":45}],17:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "MD019", "no-multiple-space-atx" ],
  "description": "Multiple spaces after hash on atx style heading",
  "tags": [ "headings", "headers", "atx", "spaces" ],
  "function": function MD019(params, onError) {
    shared.filterTokens(params, "heading_open", function forToken(token) {
      if ((shared.headingStyleFor(token) === "atx") &&
          /^#+\s\s/.test(token.line)) {
        shared.addErrorContext(onError, token.lineNumber, token.line.trim(),
          null, null,
          shared.rangeFromRegExp(token.line, shared.atxHeadingSpaceRe));
      }
    });
  }
};

},{"./shared":45}],18:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

const atxClosedHeadingNoSpaceRe = /(?:^#+[^#\s])|(?:[^#\s]#+\s*$)/;

module.exports = {
  "names": [ "MD020", "no-missing-space-closed-atx" ],
  "description": "No space inside hashes on closed atx style heading",
  "tags": [ "headings", "headers", "atx_closed", "spaces" ],
  "function": function MD020(params, onError) {
    shared.forEachLine(function forLine(line, lineIndex, inCode) {
      if (!inCode && /^#+[^#]*[^\\]#+$/.test(line)) {
        const left = /^#+[^#\s]/.test(line);
        const right = /[^#\s]#+$/.test(line);
        if (left || right) {
          shared.addErrorContext(onError, lineIndex + 1, line.trim(), left,
            right, shared.rangeFromRegExp(line, atxClosedHeadingNoSpaceRe));
        }
      }
    });
  }
};

},{"./shared":45}],19:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

const atxClosedHeadingSpaceRe = /(?:^#+\s\s+?\S)|(?:\S\s\s+?#+\s*$)/;

module.exports = {
  "names": [ "MD021", "no-multiple-space-closed-atx" ],
  "description": "Multiple spaces inside hashes on closed atx style heading",
  "tags": [ "headings", "headers", "atx_closed", "spaces" ],
  "function": function MD021(params, onError) {
    shared.filterTokens(params, "heading_open", function forToken(token) {
      if (shared.headingStyleFor(token) === "atx_closed") {
        const left = /^#+\s\s/.test(token.line);
        const right = /\s\s#+$/.test(token.line);
        if (left || right) {
          shared.addErrorContext(onError, token.lineNumber, token.line.trim(),
            left, right,
            shared.rangeFromRegExp(token.line, atxClosedHeadingSpaceRe));
        }
      }
    });
  }
};

},{"./shared":45}],20:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "MD022", "blanks-around-headings", "blanks-around-headers" ],
  "description": "Headings should be surrounded by blank lines",
  "tags": [ "headings", "headers", "blank_lines" ],
  "function": function MD022(params, onError) {
    let prevHeadingLineNumber = 0;
    let prevMaxLineIndex = -1;
    let needBlankLine = false;
    params.tokens.forEach(function forToken(token) {
      if (token.type === "heading_open") {
        if ((token.map[0] - prevMaxLineIndex) === 0) {
          shared.addErrorContext(onError, token.lineNumber,
            token.line.trim());
        }
      } else if (token.type === "heading_close") {
        needBlankLine = true;
      }
      if (token.map) {
        if (needBlankLine) {
          if ((token.map[0] - prevMaxLineIndex) === 0) {
            shared.addErrorContext(onError, prevHeadingLineNumber,
              params.lines[prevHeadingLineNumber - 1].trim());
          }
          needBlankLine = false;
        }
        prevMaxLineIndex = Math.max(prevMaxLineIndex, token.map[1]);
      }
      if (token.type === "heading_open") {
        prevHeadingLineNumber = token.lineNumber;
      }
    });
  }
};

},{"./shared":45}],21:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

const spaceBeforeHeadingRe = /^\s+\S/;

module.exports = {
  "names": [ "MD023", "heading-start-left", "header-start-left" ],
  "description": "Headings must start at the beginning of the line",
  "tags": [ "headings", "headers", "spaces" ],
  "function": function MD023(params, onError) {
    shared.filterTokens(params, "heading_open", function forToken(token) {
      if (spaceBeforeHeadingRe.test(token.line)) {
        shared.addErrorContext(onError, token.lineNumber, token.line, null,
          null, shared.rangeFromRegExp(token.line, spaceBeforeHeadingRe));
      }
    });
  }
};

},{"./shared":45}],22:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "MD024", "no-duplicate-heading", "no-duplicate-header" ],
  "description": "Multiple headings with the same content",
  "tags": [ "headings", "headers" ],
  "function": function MD024(params, onError) {
    const knownContent = [];
    shared.forEachHeading(params, function forHeading(heading, content) {
      if (knownContent.indexOf(content) === -1) {
        knownContent.push(content);
      } else {
        shared.addErrorContext(onError, heading.lineNumber,
          heading.line.trim());
      }
    });
  }
};

},{"./shared":45}],23:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "MD025", "single-h1" ],
  "description": "Multiple top level headings in the same document",
  "tags": [ "headings", "headers" ],
  "function": function MD025(params, onError) {
    const level = params.config.level || 1;
    const tag = "h" + level;
    let hasTopLevelHeading = false;
    shared.filterTokens(params, "heading_open", function forToken(token) {
      if (token.tag === tag) {
        if (hasTopLevelHeading) {
          shared.addErrorContext(onError, token.lineNumber,
            token.line.trim());
        } else if (token.lineNumber === 1) {
          hasTopLevelHeading = true;
        }
      }
    });
  }
};

},{"./shared":45}],24:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "MD026", "no-trailing-punctuation" ],
  "description": "Trailing punctuation in heading",
  "tags": [ "headings", "headers" ],
  "function": function MD026(params, onError) {
    const punctuation = params.config.punctuation || ".,;:!?";
    const trailingPunctuationRe = new RegExp("[" + punctuation + "]$");
    shared.forEachHeading(params, function forHeading(heading, content) {
      const match = trailingPunctuationRe.exec(content);
      if (match) {
        shared.addError(onError, heading.lineNumber,
          "Punctuation: '" + match[0] + "'", null,
          shared.rangeFromRegExp(heading.line, trailingPunctuationRe));
      }
    });
  }
};

},{"./shared":45}],25:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

const spaceAfterBlockQuote = /^\s*(?:>\s+)+\S/;

module.exports = {
  "names": [ "MD027", "no-multiple-space-blockquote" ],
  "description": "Multiple spaces after blockquote symbol",
  "tags": [ "blockquote", "whitespace", "indentation" ],
  "function": function MD027(params, onError) {
    let blockquoteNesting = 0;
    let listItemNesting = 0;
    params.tokens.forEach(function forToken(token) {
      if (token.type === "blockquote_open") {
        blockquoteNesting++;
      } else if (token.type === "blockquote_close") {
        blockquoteNesting--;
      } else if (token.type === "list_item_open") {
        listItemNesting++;
      } else if (token.type === "list_item_close") {
        listItemNesting--;
      } else if ((token.type === "inline") && (blockquoteNesting > 0)) {
        const multipleSpaces = listItemNesting ?
          /^(\s*>)+\s\s+>/.test(token.line) :
          /^(\s*>)+\s\s/.test(token.line);
        if (multipleSpaces) {
          shared.addErrorContext(onError, token.lineNumber, token.line, null,
            null, shared.rangeFromRegExp(token.line, spaceAfterBlockQuote));
        }
        token.content.split(shared.newLineRe)
          .forEach(function forLine(line, offset) {
            if (/^\s/.test(line)) {
              shared.addErrorContext(onError, token.lineNumber + offset,
                "> " + line, null, null,
                shared.rangeFromRegExp(line, spaceAfterBlockQuote));
            }
          });
      }
    });
  }
};

},{"./shared":45}],26:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "MD028", "no-blanks-blockquote" ],
  "description": "Blank line inside blockquote",
  "tags": [ "blockquote", "whitespace" ],
  "function": function MD028(params, onError) {
    let prevToken = {};
    params.tokens.forEach(function forToken(token) {
      if ((token.type === "blockquote_open") &&
          (prevToken.type === "blockquote_close")) {
        shared.addError(onError, token.lineNumber - 1);
      }
      prevToken = token;
    });
  }
};

},{"./shared":45}],27:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

const numberRe = /^[\s>]*([^.)]*)[.)]/;

module.exports = {
  "names": [ "MD029", "ol-prefix" ],
  "description": "Ordered list item prefix",
  "tags": [ "ol" ],
  "function": function MD029(params, onError) {
    const style = params.config.style || "one_or_ordered";
    shared.flattenLists().forEach(function forList(list) {
      if (!list.unordered) {
        let listStyle = style;
        if (listStyle === "one_or_ordered") {
          const second = (list.items.length > 1) &&
            numberRe.exec(list.items[1].line);
          listStyle = (second && (second[1] !== "1")) ? "ordered" : "one";
        }
        let number = 1;
        list.items.forEach(function forItem(item) {
          const match = numberRe.exec(item.line);
          shared.addErrorDetailIf(onError, item.lineNumber,
            String(number), !match || match[1],
            "Style: " + (listStyle === "one" ? "1/1/1" : "1/2/3"),
            shared.rangeFromRegExp(item.line, shared.listItemMarkerRe));
          if (listStyle === "ordered") {
            number++;
          }
        });
      }
    });
  }
};

},{"./shared":45}],28:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "MD030", "list-marker-space" ],
  "description": "Spaces after list markers",
  "tags": [ "ol", "ul", "whitespace" ],
  "function": function MD030(params, onError) {
    const ulSingle = params.config.ul_single || 1;
    const olSingle = params.config.ol_single || 1;
    const ulMulti = params.config.ul_multi || 1;
    const olMulti = params.config.ol_multi || 1;
    shared.flattenLists().forEach(function forList(list) {
      const lineCount = list.lastLineIndex - list.open.map[0];
      const allSingle = lineCount === list.items.length;
      const expectedSpaces = list.unordered ?
        (allSingle ? ulSingle : ulMulti) :
        (allSingle ? olSingle : olMulti);
      list.items.forEach(function forItem(item) {
        const match = /^[\s>]*\S+(\s+)/.exec(item.line);
        shared.addErrorDetailIf(onError, item.lineNumber,
          expectedSpaces, (match ? match[1].length : 0), null,
          shared.rangeFromRegExp(item.line, shared.listItemMarkerRe));
      });
    });
  }
};

},{"./shared":45}],29:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "MD031", "blanks-around-fences" ],
  "description": "Fenced code blocks should be surrounded by blank lines",
  "tags": [ "code", "blank_lines" ],
  "function": function MD031(params, onError) {
    const lines = params.lines;
    shared.forEachLine(function forLine(line, i, inCode, onFence) {
      if (((onFence > 0) && (i - 1 >= 0) && lines[i - 1].length) ||
          ((onFence < 0) && (i + 1 < lines.length) && lines[i + 1].length)) {
        shared.addErrorContext(onError, i + 1, lines[i].trim());
      }
    });
  }
};

},{"./shared":45}],30:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

const listItemMarkerInterruptsRe = /^[\s>]*(?:[*+-]|1\.)\s+/;
const blankOrListRe = /^[\s>]*($|\s)/;

module.exports = {
  "names": [ "MD032", "blanks-around-lists" ],
  "description": "Lists should be surrounded by blank lines",
  "tags": [ "bullet", "ul", "ol", "blank_lines" ],
  "function": function MD032(params, onError) {
    let inList = false;
    let prevLine = "";
    shared.forEachLine(
      function forLine(line, lineIndex, inCode, onFence) {
        if (!inCode || onFence) {
          const lineTrim = line.trim();
          let listMarker = shared.listItemMarkerRe.test(lineTrim);
          if (listMarker && !inList && !blankOrListRe.test(prevLine)) {
            // Check whether this list prefix can interrupt a paragraph
            if (listItemMarkerInterruptsRe.test(lineTrim)) {
              shared.addErrorContext(onError, lineIndex + 1, lineTrim);
            } else {
              listMarker = false;
            }
          } else if (!listMarker && inList && !blankOrListRe.test(line)) {
            shared.addErrorContext(onError, lineIndex, lineTrim);
          }
          inList = listMarker;
        }
        prevLine = line;
      }
    );
  }
};

},{"./shared":45}],31:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

const htmlRe = /<[^>]*>/;

module.exports = {
  "names": [ "MD033", "no-inline-html" ],
  "description": "Inline HTML",
  "tags": [ "html" ],
  "function": function MD033(params, onError) {
    const allowedElements = (params.config.allowed_elements || [])
      .map(function forElement(element) {
        return element.toLowerCase();
      });
    function forToken(token) {
      token.content.split(shared.newLineRe)
        .forEach(function forLine(line, offset) {
          const allowed = (line.match(/<[^/\s>!]*/g) || [])
            .filter(function forElement(element) {
              return element.length > 1;
            })
            .map(function forElement(element) {
              return element.slice(1).toLowerCase();
            })
            .filter(function forElement(element) {
              return allowedElements.indexOf(element) === -1;
            });
          if (allowed.length) {
            shared.addError(onError, token.lineNumber + offset,
              "Element: " + allowed[0], null,
              shared.rangeFromRegExp(token.line, htmlRe));
          }
        });
    }
    shared.filterTokens(params, "html_block", forToken);
    shared.forEachInlineChild(params, "html_inline", forToken);
  }
};

},{"./shared":45}],32:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "MD034", "no-bare-urls" ],
  "description": "Bare URL used",
  "tags": [ "links", "url" ],
  "function": function MD034(params, onError) {
    shared.filterTokens(params, "inline", function forToken(token) {
      let inLink = false;
      token.children.forEach(function forChild(child) {
        let match = null;
        if (child.type === "link_open") {
          inLink = true;
        } else if (child.type === "link_close") {
          inLink = false;
        } else if ((child.type === "text") &&
                    !inLink &&
                    (match = shared.bareUrlRe.exec(child.content))) {
          shared.addErrorContext(onError, child.lineNumber, match[0], null,
            null, shared.rangeFromRegExp(child.line, shared.bareUrlRe));
        }
      });
    });
  }
};

},{"./shared":45}],33:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "MD035", "hr-style" ],
  "description": "Horizontal rule style",
  "tags": [ "hr" ],
  "function": function MD035(params, onError) {
    let style = params.config.style || "consistent";
    shared.filterTokens(params, "hr", function forToken(token) {
      const lineTrim = token.line.trim();
      if (style === "consistent") {
        style = lineTrim;
      }
      shared.addErrorDetailIf(onError, token.lineNumber, style, lineTrim);
    });
  }
};

},{"./shared":45}],34:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "MD036", "no-emphasis-as-heading", "no-emphasis-as-header" ],
  "description": "Emphasis used instead of a heading",
  "tags": [ "headings", "headers", "emphasis" ],
  "function": function MD036(params, onError) {
    const punctuation = params.config.punctuation || ".,;:!?";
    const re = new RegExp("[" + punctuation + "]$");
    function base(token) {
      if (token.type === "paragraph_open") {
        return function inParagraph(t) {
          // Always paragraph_open/inline/paragraph_close,
          // omit (t.type === "inline")
          const children = t.children.filter(function notEmptyText(child) {
            return (child.type !== "text") || (child.content !== "");
          });
          if ((children.length === 3) &&
              ((children[0].type === "strong_open") ||
                (children[0].type === "em_open")) &&
              (children[1].type === "text") &&
              !re.test(children[1].content)) {
            shared.addErrorContext(onError, t.lineNumber,
              children[1].content);
          }
          return base;
        };
      } else if (token.type === "blockquote_open") {
        return function inBlockquote(t) {
          if (t.type !== "blockquote_close") {
            return inBlockquote;
          }
          return base;
        };
      } else if (token.type === "list_item_open") {
        return function inListItem(t) {
          if (t.type !== "list_item_close") {
            return inListItem;
          }
          return base;
        };
      }
      return base;
    }
    let state = base;
    params.tokens.forEach(function forToken(token) {
      state = state(token);
    });
  }
};

},{"./shared":45}],35:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "MD037", "no-space-in-emphasis" ],
  "description": "Spaces inside emphasis markers",
  "tags": [ "whitespace", "emphasis" ],
  "function": function MD037(params, onError) {
    shared.forEachInlineChild(params, "text", function forToken(token) {
      let left = true;
      let match = /\s(\*\*?|__?)\s.+\1/.exec(token.content);
      if (!match) {
        left = false;
        match = /(\*\*?|__?).+\s\1\s/.exec(token.content);
      }
      if (match) {
        const text = match[0].trim();
        const line = params.lines[token.lineNumber - 1];
        const column = line.indexOf(text) + 1;
        const length = text.length;
        shared.addErrorContext(onError, token.lineNumber,
          text, left, !left, [ column, length ]);
      }
    });
  }
};

},{"./shared":45}],36:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

const inlineCodeSpansRe = /(?:^|[^\\])((`+)((?:.*?[^`])|)\2(?!`))/g;

module.exports = {
  "names": [ "MD038", "no-space-in-code" ],
  "description": "Spaces inside code span elements",
  "tags": [ "whitespace", "code" ],
  "function": function MD038(params, onError) {
    shared.forEachInlineChild(params, "code_inline",
      function forToken(token) {
        const line = params.lines[token.lineNumber - 1];
        let match = null;
        while ((match = inlineCodeSpansRe.exec(line)) !== null) {
          const inlineCodeSpan = match[1];
          const content = match[3];
          const length = inlineCodeSpan.length;
          const column = match.index + 1 + (match[0].length - length);
          const range = [ column, length ];
          if (/^\s([^`]|$)/.test(content)) {
            shared.addErrorContext(onError, token.lineNumber,
              inlineCodeSpan, true, false, range);
          } else if (/[^`]\s$/.test(content)) {
            shared.addErrorContext(onError, token.lineNumber,
              inlineCodeSpan, false, true, range);
          }
        }
      });
  }
};

},{"./shared":45}],37:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

const spaceInLinkRe = /\[(?:\s+(?:[^\]]*?)\s*|(?:[^\]]*?)\s+)](?=\(\S*\))/;

module.exports = {
  "names": [ "MD039", "no-space-in-links" ],
  "description": "Spaces inside link text",
  "tags": [ "whitespace", "links" ],
  "function": function MD039(params, onError) {
    shared.filterTokens(params, "inline", function forToken(token) {
      let inLink = false;
      let linkText = "";
      token.children.forEach(function forChild(child) {
        if (child.type === "link_open") {
          inLink = true;
          linkText = "";
        } else if (child.type === "link_close") {
          inLink = false;
          const left = shared.trimLeft(linkText).length !== linkText.length;
          const right = shared.trimRight(linkText).length !== linkText.length;
          if (left || right) {
            shared.addErrorContext(onError, token.lineNumber,
              "[" + linkText + "]", left, right,
              shared.rangeFromRegExp(token.line, spaceInLinkRe));
          }
        } else if (inLink) {
          linkText += child.content;
        }
      });
    });
  }
};

},{"./shared":45}],38:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "MD040", "fenced-code-language" ],
  "description": "Fenced code blocks should have a language specified",
  "tags": [ "code", "language" ],
  "function": function MD040(params, onError) {
    shared.filterTokens(params, "fence", function forToken(token) {
      if (!token.info.trim()) {
        shared.addErrorContext(onError, token.lineNumber, token.line);
      }
    });
  }
};

},{"./shared":45}],39:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "MD041", "first-line-h1" ],
  "description": "First line in file should be a top level heading",
  "tags": [ "headings", "headers" ],
  "function": function MD041(params, onError) {
    const level = params.config.level || 1;
    const frontMatterTitle = params.config.front_matter_title;
    const tag = "h" + level;
    const frontMatterTitleRe =
      new RegExp(frontMatterTitle || "^\\s*title\\s*[:=]", "i");
    params.tokens.every(function forToken(token) {
      if (token.type === "html_block") {
        return true;
      } else if (token.type === "heading_open") {
        if (token.tag !== tag) {
          shared.addErrorContext(onError, token.lineNumber, token.line);
        }
      } else if (((frontMatterTitle !== undefined) && !frontMatterTitle) ||
        !params.frontMatterLines.some(function forLine(line) {
          return frontMatterTitleRe.test(line);
        })) {
        shared.addErrorContext(onError, token.lineNumber, token.line);
      }
      return false;
    });
  }
};

},{"./shared":45}],40:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

const emptyLinkRe = /\[[^\]]*](?:\((?:#?|(?:<>))\))/;

module.exports = {
  "names": [ "MD042", "no-empty-links" ],
  "description": "No empty links",
  "tags": [ "links" ],
  "function": function MD042(params, onError) {
    shared.filterTokens(params, "inline", function forToken(token) {
      let inLink = false;
      let linkText = "";
      let emptyLink = false;
      token.children.forEach(function forChild(child) {
        if (child.type === "link_open") {
          inLink = true;
          linkText = "";
          child.attrs.forEach(function forAttr(attr) {
            if (attr[0] === "href" && (!attr[1] || (attr[1] === "#"))) {
              emptyLink = true;
            }
          });
        } else if (child.type === "link_close") {
          inLink = false;
          if (emptyLink) {
            shared.addErrorContext(onError, child.lineNumber,
              "[" + linkText + "]()", null, null,
              shared.rangeFromRegExp(child.line, emptyLinkRe));
          }
        } else if (inLink) {
          linkText += child.content;
        }
      });
    });
  }
};

},{"./shared":45}],41:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "MD043", "required-headings", "required-headers" ],
  "description": "Required heading structure",
  "tags": [ "headings", "headers" ],
  "function": function MD043(params, onError) {
    const requiredHeadings = params.config.headings || params.config.headers;
    if (requiredHeadings) {
      const levels = {};
      [ 1, 2, 3, 4, 5, 6 ].forEach(function forLevel(level) {
        levels["h" + level] = "######".substr(-level);
      });
      let i = 0;
      let optional = false;
      let errorCount = 0;
      shared.forEachHeading(params, function forHeading(heading, content) {
        if (!errorCount) {
          const actual = levels[heading.tag] + " " + content;
          const expected = requiredHeadings[i++] || "[None]";
          if (expected === "*") {
            optional = true;
          } else if (expected.toLowerCase() === actual.toLowerCase()) {
            optional = false;
          } else if (optional) {
            i--;
          } else {
            shared.addErrorDetailIf(onError, heading.lineNumber,
              expected, actual);
            errorCount++;
          }
        }
      });
      if ((i < requiredHeadings.length) && !errorCount) {
        shared.addErrorContext(onError, params.lines.length,
          requiredHeadings[i]);
      }
    }
  }
};

},{"./shared":45}],42:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "MD044", "proper-names" ],
  "description": "Proper names should have the correct capitalization",
  "tags": [ "spelling" ],
  "function": function MD044(params, onError) {
    const names = params.config.names || [];
    const codeBlocks = params.config.code_blocks;
    const includeCodeBlocks = (codeBlocks === undefined) ? true : !!codeBlocks;
    names.forEach(function forName(name) {
      const escapedName = shared.escapeForRegExp(name);
      const namePattern = "\\S*\\b(" + escapedName + ")\\b\\S*";
      const anyNameRe = new RegExp(namePattern, "gi");
      function forToken(token) {
        const fenceOffset = (token.type === "fence") ? 1 : 0;
        token.content.split(shared.newLineRe)
          .forEach(function forLine(line, index) {
            let match = null;
            while ((match = anyNameRe.exec(line)) !== null) {
              const fullMatch = match[0];
              if (!shared.bareUrlRe.test(fullMatch)) {
                const wordMatch = fullMatch
                  .replace(/^\W*/, "").replace(/\W*$/, "");
                if (names.indexOf(wordMatch) === -1) {
                  const lineNumber = token.lineNumber + index + fenceOffset;
                  const range = [ match.index + 1, wordMatch.length ];
                  shared.addErrorDetailIf(onError, lineNumber,
                    name, match[1], null, range);
                }
              }
            }
          });
      }
      shared.forEachInlineChild(params, "text", forToken);
      if (includeCodeBlocks) {
        shared.forEachInlineChild(params, "code_inline", forToken);
        shared.filterTokens(params, "code_block", forToken);
        shared.filterTokens(params, "fence", forToken);
      }
    });
  }
};

},{"./shared":45}],43:[function(require,module,exports){
// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "MD045", "no-alt-text" ],
  "description": "Images should have alternate text (alt text)",
  "tags": [ "accessibility", "images" ],
  "function": function MD045(params, onError) {
    shared.forEachInlineChild(params, "image", function forToken(token) {
      if (token.content === "") {
        shared.addError(onError, token.lineNumber);
      }
    });
  }
};

},{"./shared":45}],44:[function(require,module,exports){
// @ts-check

"use strict";

module.exports = [
  require("./md001"),
  require("./md002"),
  require("./md003"),
  require("./md004"),
  require("./md005"),
  require("./md006"),
  require("./md007"),
  require("./md009"),
  require("./md010"),
  require("./md011"),
  require("./md012"),
  require("./md013"),
  require("./md014"),
  require("./md018"),
  require("./md019"),
  require("./md020"),
  require("./md021"),
  require("./md022"),
  require("./md023"),
  require("./md024"),
  require("./md025"),
  require("./md026"),
  require("./md027"),
  require("./md028"),
  require("./md029"),
  require("./md030"),
  require("./md031"),
  require("./md032"),
  require("./md033"),
  require("./md034"),
  require("./md035"),
  require("./md036"),
  require("./md037"),
  require("./md038"),
  require("./md039"),
  require("./md040"),
  require("./md041"),
  require("./md042"),
  require("./md043"),
  require("./md044"),
  require("./md045")
];

},{"./md001":3,"./md002":4,"./md003":5,"./md004":6,"./md005":7,"./md006":8,"./md007":9,"./md009":10,"./md010":11,"./md011":12,"./md012":13,"./md013":14,"./md014":15,"./md018":16,"./md019":17,"./md020":18,"./md021":19,"./md022":20,"./md023":21,"./md024":22,"./md025":23,"./md026":24,"./md027":25,"./md028":26,"./md029":27,"./md030":28,"./md031":29,"./md032":30,"./md033":31,"./md034":32,"./md035":33,"./md036":34,"./md037":35,"./md038":36,"./md039":37,"./md040":38,"./md041":39,"./md042":40,"./md043":41,"./md044":42,"./md045":43}],45:[function(require,module,exports){
// @ts-check

"use strict";

// Regular expression for matching common newline characters
// See NEWLINES_RE in markdown-it/lib/rules_core/normalize.js
module.exports.newLineRe = /\r[\n\u0085]?|[\n\u2424\u2028\u0085]/;

// Regular expression for matching common front matter (YAML and TOML)
module.exports.frontMatterRe = /^(---|\+\+\+)$[^]*?^\1$(\r\n|\r|\n)/m;

// Regular expression for matching inline disable/enable comments
const inlineCommentRe =
  /<!--\s*markdownlint-(dis|en)able((?:\s+[a-z0-9_-]+)*)\s*-->/ig;
module.exports.inlineCommentRe = inlineCommentRe;

// Regular expressions for range matching
module.exports.atxHeadingSpaceRe = /^#+\s*\S/;
module.exports.bareUrlRe = /(?:http|ftp)s?:\/\/[^\s]*/i;
module.exports.listItemMarkerRe = /^[\s>]*(?:[*+-]|\d+\.)\s+/;

// readFile options for reading with the UTF-8 encoding
module.exports.utf8Encoding = { "encoding": "utf8" };

// Trims whitespace from the left (start) of a string
function trimLeft(str) {
  return str.replace(/^\s*/, "");
}
module.exports.trimLeft = trimLeft;

// Trims whitespace from the right (end) of a string
module.exports.trimRight = function trimRight(str) {
  return str.replace(/\s*$/, "");
};

// Applies key/value pairs from src to dst, returning dst
function assign(dst, src) {
  Object.keys(src).forEach(function forKey(key) {
    dst[key] = src[key];
  });
  return dst;
}
module.exports.assign = assign;

// Clones the key/value pairs of obj, returning the clone
module.exports.clone = function clone(obj) {
  return assign({}, obj);
};

// Returns true iff the input is a number
module.exports.isNumber = function isNumber(obj) {
  return typeof obj === "number";
};

// Returns true iff the input is a string
module.exports.isString = function isString(obj) {
  return typeof obj === "string";
};

// Returns true iff the input string is empty
module.exports.isEmptyString = function isEmptyString(str) {
  return str.length === 0;
};

// Replaces the text of all properly-formatted HTML comments with whitespace
// This preserves the line/column information for the rest of the document
// Trailing whitespace is avoided with a '\' character in the last column
// See https://www.w3.org/TR/html5/syntax.html#comments for details
const htmlCommentBegin = "<!--";
const htmlCommentEnd = "-->";
module.exports.clearHtmlCommentText = function clearHtmlCommentText(text) {
  let i = 0;
  while ((i = text.indexOf(htmlCommentBegin, i)) !== -1) {
    let j = text.indexOf(htmlCommentEnd, i);
    if (j === -1) {
      j = text.length;
      text += "\\";
    }
    const comment = text.slice(i + htmlCommentBegin.length, j);
    if ((comment.length > 0) &&
        (comment[0] !== ">") &&
        (comment[comment.length - 1] !== "-") &&
        (comment.indexOf("--") === -1) &&
        (text.slice(i, j + htmlCommentEnd.length)
          .search(inlineCommentRe) === -1)) {
      const blanks = comment
        .replace(/[^\r\n]/g, " ")
        .replace(/ ([\r\n])/g, "\\$1");
      text = text.slice(0, i + htmlCommentBegin.length) +
        blanks + text.slice(j);
    }
    i = j + htmlCommentEnd.length;
  }
  return text;
};

// Escapes a string for use in a RegExp
module.exports.escapeForRegExp = function escapeForRegExp(str) {
  return str.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
};

// Returns the indent for a token
function indentFor(token) {
  const line = token.line.replace(/^[\s>]*(> |>)/, "");
  return line.length - trimLeft(line).length;
}
module.exports.indentFor = indentFor;

// Returns the heading style for a heading token
module.exports.headingStyleFor = function headingStyleFor(token) {
  if ((token.map[1] - token.map[0]) === 1) {
    if (/[^\\]#\s*$/.test(token.line)) {
      return "atx_closed";
    }
    return "atx";
  }
  return "setext";
};

// Calls the provided function for each matching token
function filterTokens(params, type, callback) {
  params.tokens.forEach(function forToken(token) {
    if (token.type === type) {
      callback(token);
    }
  });
}
module.exports.filterTokens = filterTokens;

let tokenCache = null;
// Caches line metadata and flattened lists for reuse
function makeTokenCache(params) {
  if (!params) {
    tokenCache = null;
    return;
  }

  // Populate line metadata array
  const lineMetadata = new Array(params.lines.length);
  let fenceStart = null;
  let inFence = false;
  // Find fenced code by pattern (parser ignores "``` close fence")
  params.lines.forEach(function forLine(line, lineIndex) {
    let metadata = 0;
    const match = /^[ ]{0,3}(`{3,}|~{3,})/.exec(line);
    const fence = match && match[1];
    if (fence &&
        (!inFence || (fence.substr(0, fenceStart.length) === fenceStart))) {
      metadata = inFence ? 2 : 6;
      fenceStart = inFence ? null : fence;
      inFence = !inFence;
    } else if (inFence) {
      metadata = 1;
    }
    lineMetadata[lineIndex] = metadata;
  });
  // Find code blocks normally
  filterTokens(params, "code_block", function forToken(token) {
    for (let i = token.map[0]; i < token.map[1]; i++) {
      lineMetadata[i] = 1;
    }
  });
  // Find tables normally
  filterTokens(params, "table_open", function forToken(token) {
    for (let i = token.map[0]; i < token.map[1]; i++) {
      lineMetadata[i] += 8;
    }
  });

  // Flatten lists
  const flattenedLists = [];
  const stack = [];
  let current = null;
  let lastWithMap = { "map": [ 0, 1 ] };
  params.tokens.forEach(function forToken(token) {
    if ((token.type === "bullet_list_open") ||
        (token.type === "ordered_list_open")) {
      // Save current context and start a new one
      stack.push(current);
      current = {
        "unordered": (token.type === "bullet_list_open"),
        "parentsUnordered": !current ||
          (current.unordered && current.parentsUnordered),
        "open": token,
        "indent": indentFor(token),
        "parentIndent": (current && current.indent) || 0,
        "items": [],
        "nesting": stack.length - 1,
        "lastLineIndex": -1,
        "insert": flattenedLists.length
      };
    } else if ((token.type === "bullet_list_close") ||
               (token.type === "ordered_list_close")) {
      // Finalize current context and restore previous
      current.lastLineIndex = lastWithMap.map[1];
      flattenedLists.splice(current.insert, 0, current);
      delete current.insert;
      current = stack.pop();
    } else if (token.type === "list_item_open") {
      // Add list item
      current.items.push(token);
    } else if (token.map) {
      // Track last token with map
      lastWithMap = token;
    }
  });

  // Cache results
  tokenCache = {
    "params": params,
    "lineMetadata": lineMetadata,
    "flattenedLists": flattenedLists
  };
}
module.exports.makeTokenCache = makeTokenCache;

// Calls the provided function for each line (with context)
module.exports.forEachLine = function forEachLine(callback) {
  // Invoke callback
  tokenCache.params.lines.forEach(function forLine(line, lineIndex) {
    const metadata = tokenCache.lineMetadata[lineIndex];
    callback(
      line,
      lineIndex,
      !!(metadata & 7),
      (((metadata & 6) >> 1) || 2) - 2,
      !!(metadata & 8));
  });
};

// Calls the provided function for each specified inline child token
module.exports.forEachInlineChild =
function forEachInlineChild(params, type, callback) {
  filterTokens(params, "inline", function forToken(token) {
    token.children.forEach(function forChild(child) {
      if (child.type === type) {
        callback(child);
      }
    });
  });
};

// Calls the provided function for each heading's content
module.exports.forEachHeading = function forEachHeading(params, callback) {
  let heading = null;
  params.tokens.forEach(function forToken(token) {
    if (token.type === "heading_open") {
      heading = token;
    } else if (token.type === "heading_close") {
      heading = null;
    } else if ((token.type === "inline") && heading) {
      callback(heading, token.content);
    }
  });
};

// Returns (nested) lists as a flat array (in order)
module.exports.flattenLists = function flattenLists() {
  return tokenCache.flattenedLists;
};

// Adds a generic error object via the onError callback
function addError(onError, lineNumber, detail, context, range) {
  onError({
    "lineNumber": lineNumber,
    "detail": detail,
    "context": context,
    "range": range
  });
}
module.exports.addError = addError;

// Adds an error object with details conditionally via the onError callback
module.exports.addErrorDetailIf = function addErrorDetailIf(
  onError, lineNumber, expected, actual, detail, range) {
  if (expected !== actual) {
    addError(
      onError,
      lineNumber,
      "Expected: " + expected + "; Actual: " + actual +
        (detail ? "; " + detail : ""),
      null,
      range);
  }
};

// Adds an error object with context via the onError callback
module.exports.addErrorContext =
function addErrorContext(onError, lineNumber, context, left, right, range) {
  if (context.length <= 30) {
    // Nothing to do
  } else if (left && right) {
    context = context.substr(0, 15) + "..." + context.substr(-15);
  } else if (right) {
    context = "..." + context.substr(-30);
  } else {
    context = context.substr(0, 30) + "...";
  }
  addError(onError, lineNumber, null, context, range);
};

// Returns a range object for a line by applying a RegExp
module.exports.rangeFromRegExp = function rangeFromRegExp(line, regexp) {
  let range = null;
  const match = line.match(regexp);
  if (match) {
    let column = match.index + 1;
    let length = match[0].length;
    if (match[2]) {
      column += match[1].length;
      length -= match[1].length;
    }
    range = [ column, length ];
  }
  return range;
};

},{}],46:[function(require,module,exports){

},{}],47:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":48}],48:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[2])(2)
});
