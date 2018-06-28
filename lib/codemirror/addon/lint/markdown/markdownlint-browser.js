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
// Lints a single file
function selectRules(rulearr) {
    var ruleArray = rulearr || [];
    var ruleList = new Array();
    if (rulearr == "basic") {
        var arr = [5, 12, 40];
        arr.forEach(function (rule, index) {
            console.log(rules);
            ruleList.push(rules[rule - 1]);
        });
        return ruleList;
    }
    if (rulearr == "simple") {
        var arr = [5, 12];
        arr.forEach(function (rule, index) {
            ruleList.push(rules[rule - 1]);
        });
        return ruleList;
    }
    if (rulearr == "full") {
        return rules;
    }
    if (ruleArray.length) {
        ruleArray.forEach(function forRule(rule, index) {
            ruleList.push(rules[rule - 1]);
        });
        return ruleList;
    }
    else {
        return rules;
    }
}
// Lints files and strings
function lintInput(options, synchronous, callback) {
    // Normalize inputs
    options = options || {};
    callback = callback || function noop() { };
    var ruleList = selectRules(options.selectRules);
    console.log(ruleList);
    var ruleList = ruleList.concat(options.customRules || []);
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

},{"./rules":48,"./shared":49,"fs":50,"markdown-it":1,"path":51}],3:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
module.exports = {
    "names": ["MD001", "heading-increment", "header-increment"],
    "description": "Heading levels should only increment by one level at a time",
    "tags": ["headings", "headers"],
    "function": function MD001(params, onError) {
        var prevLevel = 0;
        shared.filterTokens(params, "heading_open", function forToken(token) {
            var level = parseInt(token.tag.slice(1), 10);
            if (prevLevel && (level > prevLevel)) {
                shared.addErrorDetailIf(onError, token.lineNumber, "h" + (prevLevel + 1), "h" + level);
            }
            prevLevel = level;
        });
    }
};

},{"./shared":49}],4:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
module.exports = {
    "names": ["MD002", "first-heading-h1", "first-header-h1"],
    "description": "First heading should be a top level heading",
    "tags": ["headings", "headers"],
    "function": function MD002(params, onError) {
        var level = params.config.level || 1;
        var tag = "h" + level;
        params.tokens.every(function forToken(token) {
            if (token.type === "heading_open") {
                shared.addErrorDetailIf(onError, token.lineNumber, tag, token.tag);
                return false;
            }
            return true;
        });
    }
};

},{"./shared":49}],5:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
module.exports = {
    "names": ["MD003", "heading-style", "header-style"],
    "description": "Heading style",
    "tags": ["headings", "headers"],
    "function": function MD003(params, onError) {
        var style = params.config.style || "consistent";
        shared.filterTokens(params, "heading_open", function forToken(token) {
            var styleForToken = shared.headingStyleFor(token);
            if (style === "consistent") {
                style = styleForToken;
            }
            if (styleForToken !== style) {
                var h12 = /h[12]/.test(token.tag);
                var setextWithAtx = (style === "setext_with_atx") &&
                    ((h12 && (styleForToken === "setext")) ||
                        (!h12 && (styleForToken === "atx")));
                var setextWithAtxClosed = (style === "setext_with_atx_closed") &&
                    ((h12 && (styleForToken === "setext")) ||
                        (!h12 && (styleForToken === "atx_closed")));
                if (!setextWithAtx && !setextWithAtxClosed) {
                    var expected = style;
                    if (style === "setext_with_atx") {
                        expected = h12 ? "setext" : "atx";
                    }
                    else if (style === "setext_with_atx_closed") {
                        expected = h12 ? "setext" : "atx_closed";
                    }
                    shared.addErrorDetailIf(onError, token.lineNumber, expected, styleForToken);
                }
            }
        });
    }
};

},{"./shared":49}],6:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
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
    "names": ["MD004", "ul-style"],
    "description": "Unordered list style",
    "tags": ["bullet", "ul"],
    "function": function MD004(params, onError) {
        var style = params.config.style || "consistent";
        var expectedStyle = style;
        var nestingStyles = [];
        shared.flattenLists().forEach(function forList(list) {
            if (list.unordered) {
                if (expectedStyle === "consistent") {
                    expectedStyle = unorderedListStyleFor(list.items[0]);
                }
                list.items.forEach(function forItem(item) {
                    var itemStyle = unorderedListStyleFor(item);
                    if (style === "sublist") {
                        var nesting = list.nesting;
                        if (!nestingStyles[nesting] &&
                            (itemStyle !== nestingStyles[nesting - 1])) {
                            nestingStyles[nesting] = itemStyle;
                        }
                        else {
                            shared.addErrorDetailIf(onError, item.lineNumber, nestingStyles[nesting], itemStyle, null, shared.rangeFromRegExp(item.line, shared.listItemMarkerRe));
                        }
                    }
                    else {
                        shared.addErrorDetailIf(onError, item.lineNumber, expectedStyle, itemStyle, null, shared.rangeFromRegExp(item.line, shared.listItemMarkerRe));
                    }
                });
            }
        });
    }
};

},{"./shared":49}],7:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
module.exports = {
    "names": ["MD005", "list-indent"],
    "description": "Inconsistent indentation for list items at the same level",
    "tags": ["bullet", "ul", "indentation"],
    "function": function MD005(params, onError) {
        shared.flattenLists().forEach(function forList(list) {
            list.items.forEach(function forItem(item) {
                shared.addErrorDetailIf(onError, item.lineNumber, list.indent, shared.indentFor(item), null, shared.rangeFromRegExp(item.line, shared.listItemMarkerRe));
            });
        });
    }
};

},{"./shared":49}],8:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
module.exports = {
    "names": ["MD006", "ul-start-left"],
    "description": "Consider starting bulleted lists at the beginning of the line",
    "tags": ["bullet", "ul", "indentation"],
    "function": function MD006(params, onError) {
        shared.flattenLists().forEach(function forList(list) {
            if (list.unordered && !list.nesting) {
                shared.addErrorDetailIf(onError, list.open.lineNumber, 0, list.indent, null, shared.rangeFromRegExp(list.open.line, shared.listItemMarkerRe));
            }
        });
    }
};

},{"./shared":49}],9:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
module.exports = {
    "names": ["MD007", "ul-indent"],
    "description": "Unordered list indentation",
    "tags": ["bullet", "ul", "indentation"],
    "function": function MD007(params, onError) {
        var optionsIndent = params.config.indent || 2;
        shared.flattenLists().forEach(function forList(list) {
            if (list.unordered && list.parentsUnordered && list.indent) {
                shared.addErrorDetailIf(onError, list.open.lineNumber, list.parentIndent + optionsIndent, list.indent, null, shared.rangeFromRegExp(list.open.line, shared.listItemMarkerRe));
            }
        });
    }
};

},{"./shared":49}],10:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
//const numRe = /\d+/g;
//const symbal = /^[^\u4e00-\u9fa5a-zA-Z\d]+$/;///\W/;  
var numReL = /[\d][\u4e00-\u9fa5]/g; ///\W/;  
var numReR = /[\u4e00-\u9fa5][\d]/g;
module.exports = {
    "names": ["MD008", "num_space"],
    "description": "中文与数字之间需要增加空格",
    "tags": ["space", "number"],
    "function": function MD008(params, onError) {
        var listItemEmptyLines = params.config.list_item_empty_lines;
        var allowListItemEmptyLines = (listItemEmptyLines === undefined) ? false : !!listItemEmptyLines;
        var listItemLineNumbers = [];
        if (allowListItemEmptyLines) {
            shared.filterTokens(params, "list_item_open", function forToken(token) {
                for (var i = token.map[0]; i < token.map[1]; i++) {
                    listItemLineNumbers.push(i + 1);
                }
            });
        }
        shared.forEachLine(function forLine(line, lineIndex) {
            var lineNumber = lineIndex + 1;
            var reL = line.match(numReL);
            var reR = line.match(numReR);
            //console.log(re);
            if ((reL || reR) && (listItemLineNumbers.indexOf(lineNumber) === -1)) {
                console.log(reL);
                console.log(reR);
                var check = false;
                /*let templine = line;
                re.forEach(function(num,index){
                  console.log(templine);
                    let str = templine.split(num);
                    //console.log(str);
                    str.forEach(function(s,index){
                      if(s.length){
                      let first = s.charAt(0);
                      let last = s.charAt(s.length-1);
                      if(chwordRe.test(first) && index != 0){
                        //console.log("first enter");
                        check = false;
                      }
                      if(chwordRe.test(last) && index != str.length-1){
                        //console.log("last enter");
                        //console.log(last.search(symbal));
                        //console.log(index);
                        //console.log(str.length-1);
                        check = false;
                      }
                      }
                    });
                    templine = str.join('');
                });*/
                var actual = line.length - shared.trimRight(line).length;
                if (!check) {
                    shared.addError(onError, lineNumber, "Expected: 增加空格", null, shared.rangeFromRegExp(line, check));
                }
            }
        });
    }
};

},{"./shared":49}],11:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
var trailingSpaceRe = /\s+$/;
module.exports = {
    "names": ["MD009", "no-trailing-spaces"],
    "description": "Trailing spaces",
    "tags": ["whitespace"],
    "function": function MD009(params, onError) {
        var brSpaces = params.config.br_spaces;
        if (brSpaces === undefined) {
            brSpaces = 2;
        }
        var listItemEmptyLines = params.config.list_item_empty_lines;
        var allowListItemEmptyLines = (listItemEmptyLines === undefined) ? false : !!listItemEmptyLines;
        var listItemLineNumbers = [];
        if (allowListItemEmptyLines) {
            shared.filterTokens(params, "list_item_open", function forToken(token) {
                for (var i = token.map[0]; i < token.map[1]; i++) {
                    listItemLineNumbers.push(i + 1);
                }
            });
        }
        var expected = (brSpaces < 2) ? 0 : brSpaces;
        shared.forEachLine(function forLine(line, lineIndex) {
            var lineNumber = lineIndex + 1;
            if (trailingSpaceRe.test(line) &&
                (listItemLineNumbers.indexOf(lineNumber) === -1)) {
                var actual = line.length - shared.trimRight(line).length;
                if (expected !== actual) {
                    shared.addError(onError, lineNumber, "Expected: " + (expected === 0 ? "" : "0 or ") +
                        expected + "; Actual: " + actual, null, shared.rangeFromRegExp(line, trailingSpaceRe));
                }
            }
        });
    }
};

},{"./shared":49}],12:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
var tabRe = /\t+/;
module.exports = {
    "names": ["MD010", "no-hard-tabs"],
    "description": "Hard tabs",
    "tags": ["whitespace", "hard_tab"],
    "function": function MD010(params, onError) {
        var codeBlocks = params.config.code_blocks;
        var includeCodeBlocks = (codeBlocks === undefined) ? true : !!codeBlocks;
        shared.forEachLine(function forLine(line, lineIndex, inCode) {
            if (tabRe.test(line) && (!inCode || includeCodeBlocks)) {
                shared.addError(onError, lineIndex + 1, "Column: " + (line.indexOf("\t") + 1), null, shared.rangeFromRegExp(line, tabRe));
            }
        });
    }
};

},{"./shared":49}],13:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
var reversedLinkRe = /\([^)]+\)\[[^\]^][^\]]*]/;
module.exports = {
    "names": ["MD011", "no-reversed-links"],
    "description": "Reversed link syntax",
    "tags": ["links"],
    "function": function MD011(params, onError) {
        shared.forEachInlineChild(params, "text", function forToken(token) {
            var match = reversedLinkRe.exec(token.content);
            if (match) {
                shared.addError(onError, token.lineNumber, match[0], null, shared.rangeFromRegExp(token.line, reversedLinkRe));
            }
        });
    }
};

},{"./shared":49}],14:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
module.exports = {
    "names": ["MD012", "no-multiple-blanks"],
    "description": "Multiple consecutive blank lines",
    "tags": ["whitespace", "blank_lines"],
    "function": function MD012(params, onError) {
        var maximum = params.config.maximum || 1;
        var count = 0;
        shared.forEachLine(function forLine(line, lineIndex, inCode) {
            count = (inCode || line.trim().length) ? 0 : count + 1;
            if (maximum < count) {
                shared.addErrorDetailIf(onError, lineIndex + 1, maximum, count);
            }
        });
    }
};

},{"./shared":49}],15:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
var labelRe = /^\s*\[.*[^\\]]:/;
module.exports = {
    "names": ["MD013", "line-length"],
    "description": "Line length",
    "tags": ["line_length"],
    "function": function MD013(params, onError) {
        var lineLength = params.config.line_length || 80;
        var codeBlocks = params.config.code_blocks;
        var includeCodeBlocks = (codeBlocks === undefined) ? true : !!codeBlocks;
        var tables = params.config.tables;
        var includeTables = (tables === undefined) ? true : !!tables;
        var headings = params.config.headings;
        if (headings === undefined) {
            headings = params.config.headers;
        }
        var includeHeadings = (headings === undefined) ? true : !!headings;
        var headingLineNumbers = [];
        if (!includeHeadings) {
            shared.forEachHeading(params, function forHeading(heading) {
                headingLineNumbers.push(heading.lineNumber);
            });
        }
        var tokenTypeMap = {
            "em_open": "e",
            "em_close": "E",
            "link_open": "l",
            "link_close": "L",
            "strong_open": "s",
            "strong_close": "S",
            "text": "T"
        };
        var linkOnlyLineNumbers = [];
        shared.filterTokens(params, "inline", function forToken(token) {
            var childTokenTypes = "";
            token.children.forEach(function forChild(child) {
                if (child.type !== "text" || child.content !== "") {
                    childTokenTypes += tokenTypeMap[child.type] || "x";
                }
            });
            if (/^[es]*lT?L[ES]*$/.test(childTokenTypes)) {
                linkOnlyLineNumbers.push(token.lineNumber);
            }
        });
        var longLineRe = new RegExp("^(.{" + lineLength + "})(.*\\s.*)$");
        shared.forEachLine(function forLine(line, lineIndex, inCode, onFence, inTable) {
            var lineNumber = lineIndex + 1;
            if ((includeCodeBlocks || !inCode) &&
                (includeTables || !inTable) &&
                (includeHeadings || (headingLineNumbers.indexOf(lineNumber)) < 0) &&
                (linkOnlyLineNumbers.indexOf(lineNumber) < 0) &&
                longLineRe.test(line) &&
                !labelRe.test(line)) {
                shared.addErrorDetailIf(onError, lineNumber, lineLength, line.length, null, shared.rangeFromRegExp(line, longLineRe));
            }
        });
    }
};

},{"./shared":49}],16:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
var dollarCommandRe = /^(\s*)(\$\s)/;
module.exports = {
    "names": ["MD014", "commands-show-output"],
    "description": "Dollar signs used before commands without showing output",
    "tags": ["code"],
    "function": function MD014(params, onError) {
        ["code_block", "fence"].forEach(function forType(type) {
            shared.filterTokens(params, type, function forToken(token) {
                var allBlank = true;
                if (token.content && token.content.split(shared.newLineRe)
                    .every(function forLine(line) {
                    return !line || (allBlank = false) || dollarCommandRe.test(line);
                }) && !allBlank) {
                    shared.addErrorContext(onError, token.lineNumber, token.content.split(shared.newLineRe)[0].trim(), null, null, shared.rangeFromRegExp(token.line, dollarCommandRe));
                }
            });
        });
    }
};

},{"./shared":49}],17:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
var enwordReL = /[a-zA-Z][\u4e00-\u9fa5]/g; ///\W/;  
var enwordReR = /[\u4e00-\u9fa5][a-zA-Z]/g;
module.exports = {
    "names": ["MD015", "word_space"],
    "description": "中英文之间需要增加空格",
    "tags": ["space", "word"],
    "function": function MD008(params, onError) {
        var brSpaces = params.config.br_spaces;
        if (brSpaces === undefined) {
            brSpaces = 2;
        }
        var listItemEmptyLines = params.config.list_item_empty_lines;
        var allowListItemEmptyLines = (listItemEmptyLines === undefined) ? false : !!listItemEmptyLines;
        var listItemLineNumbers = [];
        if (allowListItemEmptyLines) {
            shared.filterTokens(params, "list_item_open", function forToken(token) {
                for (var i = token.map[0]; i < token.map[1]; i++) {
                    listItemLineNumbers.push(i + 1);
                }
            });
        }
        var expected = (brSpaces < 2) ? 0 : brSpaces;
        shared.forEachLine(function forLine(line, lineIndex) {
            var lineNumber = lineIndex + 1;
            var reL = line.match(enwordReL);
            var reR = line.match(enwordReR);
            //console.log(re);
            if ((reL || reR) && (listItemLineNumbers.indexOf(lineNumber) === -1)) {
                console.log(reL);
                console.log(reR);
                var check = false;
                /*let templine = line;
                re.forEach(function(num,index){
                  console.log(templine);
                    let str = templine.split(num);
                    //console.log(str);
                    str.forEach(function(s,index){
                      if(s.length){
                      let first = s.charAt(0);
                      let last = s.charAt(s.length-1);
                      if(chwordRe.test(first) && index != 0){
                        //console.log("first enter");
                        check = false;
                      }
                      if(chwordRe.test(last) && index != str.length-1){
                        //console.log("last enter");
                        //console.log(last.search(symbal));
                        //console.log(index);
                        //console.log(str.length-1);
                        check = false;
                      }
                      }
                    });
                    templine = str.join('');
                });*/
                var actual = line.length - shared.trimRight(line).length;
                if (!check) {
                    shared.addError(onError, lineNumber, "Expected: " + (expected === 0 ? "" : "0 or ") +
                        expected + "; Actual: " + actual, null, shared.rangeFromRegExp(line, check));
                }
            }
        });
    }
};

},{"./shared":49}],18:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
var unitRe = /[\d][a-zA-Z]/g; ///\W/; 
var specialunitRe1 = /[\d] %/g;
var specialunitRe2 = /[\d] °/g;
module.exports = {
    "names": ["MD016", "unit_space"],
    "description": "数字与单位之间需要增加空格,%/°除外",
    "tags": ["space", "num", "unit"],
    "function": function MD008(params, onError) {
        var brSpaces = params.config.br_spaces;
        if (brSpaces === undefined) {
            brSpaces = 2;
        }
        var listItemEmptyLines = params.config.list_item_empty_lines;
        var allowListItemEmptyLines = (listItemEmptyLines === undefined) ? false : !!listItemEmptyLines;
        var listItemLineNumbers = [];
        if (allowListItemEmptyLines) {
            shared.filterTokens(params, "list_item_open", function forToken(token) {
                for (var i = token.map[0]; i < token.map[1]; i++) {
                    listItemLineNumbers.push(i + 1);
                }
            });
        }
        var expected = (brSpaces < 2) ? 0 : brSpaces;
        shared.forEachLine(function forLine(line, lineIndex) {
            var lineNumber = lineIndex + 1;
            var re = line.match(unitRe);
            var re1 = line.match(specialunitRe1);
            var re2 = line.match(specialunitRe2);
            //console.log(re);
            if ((re || re1 || re2) && (listItemLineNumbers.indexOf(lineNumber) === -1)) {
                console.log(re);
                var check = false;
                /*let templine = line;
                re.forEach(function(num,index){
                  console.log(templine);
                    let str = templine.split(num);
                    //console.log(str);
                    str.forEach(function(s,index){
                      if(s.length){
                      let first = s.charAt(0);
                      let last = s.charAt(s.length-1);
                      if(chwordRe.test(first) && index != 0){
                        //console.log("first enter");
                        check = false;
                      }
                      if(chwordRe.test(last) && index != str.length-1){
                        //console.log("last enter");
                        //console.log(last.search(symbal));
                        //console.log(index);
                        //console.log(str.length-1);
                        check = false;
                      }
                      }
                    });
                    templine = str.join('');
                });*/
                var actual = line.length - shared.trimRight(line).length;
                if (!check) {
                    shared.addError(onError, lineNumber, "Expected: " + (expected === 0 ? "" : "0 or ") +
                        expected + "; Actual: " + actual, null, shared.rangeFromRegExp(line, check));
                }
            }
        });
    }
};

},{"./shared":49}],19:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
var halfsymbolRe = /[!"#$%&'()*+,-./:;<=>?@[\]^_{|}~]/g; ///\W/; 
var fullsymbolRe = /[\u3002|\uff1f|\uff01|\uff0c|\u3001|\uff1b|\uff1a|\u201c|\u201d|\u2018|\u2019|\uff08|\uff09|\u300a|\u300b|\u3008|\u3009|\u3010|\u3011|\u300e|\u300f|\u300c|\u300d|\ufe43|\ufe44|\u3014|\u3015|\u2026|\u2014|\uff5e|\ufe4f|\uffe5]/g;
var fullsymbolReL = /[\u3002|\uff1f|\uff01|\uff0c|\u3001|\uff1b|\uff1a|\u201c|\u201d|\u2018|\u2019|\uff08|\uff09|\u300a|\u300b|\u3008|\u3009|\u3010|\u3011|\u300e|\u300f|\u300c|\u300d|\ufe43|\ufe44|\u3014|\u3015|\u2026|\u2014|\uff5e|\ufe4f|\uffe5] /g;
var fullsymbolReR = / [\u3002|\uff1f|\uff01|\uff0c|\u3001|\uff1b|\uff1a|\u201c|\u201d|\u2018|\u2019|\uff08|\uff09|\u300a|\u300b|\u3008|\u3009|\u3010|\u3011|\u300e|\u300f|\u300c|\u300d|\ufe43|\ufe44|\u3014|\u3015|\u2026|\u2014|\uff5e|\ufe4f|\uffe5]/g;
var chineseRe = /[\u4e00-\u9fa5]/g;
//const specialunitRe1 = /[\d] %/g
//const specialunitRe2 = /[\d] °/g
module.exports = {
    "names": ["MD017", "symbol_space"],
    "description": "中文请使用全角标点且与其他字符之间没有空格,英文请使用半角",
    "tags": ["space", "symbol"],
    "function": function MD008(params, onError) {
        var brSpaces = params.config.br_spaces;
        if (brSpaces === undefined) {
            brSpaces = 2;
        }
        var listItemEmptyLines = params.config.list_item_empty_lines;
        var allowListItemEmptyLines = (listItemEmptyLines === undefined) ? false : !!listItemEmptyLines;
        var listItemLineNumbers = [];
        if (allowListItemEmptyLines) {
            shared.filterTokens(params, "list_item_open", function forToken(token) {
                for (var i = token.map[0]; i < token.map[1]; i++) {
                    listItemLineNumbers.push(i + 1);
                }
            });
        }
        var expected = (brSpaces < 2) ? 0 : brSpaces;
        shared.forEachLine(function forLine(line, lineIndex) {
            var lineNumber = lineIndex + 1;
            //let re = line.match(halfsymbolRe);
            var re1 = line.match(fullsymbolReL);
            var re2 = line.match(fullsymbolReR);
            //console.log(re);
            if (line.match(chineseRe)) {
                if ((re1 || re2) && (listItemLineNumbers.indexOf(lineNumber) === -1)) {
                    var check = false;
                    /*let templine = line;
                    re.forEach(function(num,index){
                      console.log(templine);
                        let str = templine.split(num);
                        //console.log(str);
                        str.forEach(function(s,index){
                          if(s.length){
                          let first = s.charAt(0);
                          let last = s.charAt(s.length-1);
                          if(chwordRe.test(first) && index != 0){
                            //console.log("first enter");
                            check = false;
                          }
                          if(chwordRe.test(last) && index != str.length-1){
                            //console.log("last enter");
                            //console.log(last.search(symbal));
                            //console.log(index);
                            //console.log(str.length-1);
                            check = false;
                          }
                          }
                        });
                        templine = str.join('');
                    });*/
                    var actual = line.length - shared.trimRight(line).length;
                    if (!check) {
                        shared.addError(onError, lineNumber, "Expected: " + (expected === 0 ? "" : "0 or ") +
                            expected + "; Actual: " + actual, null, shared.rangeFromRegExp(line, check));
                    }
                }
            }
            else {
                if (line.match(fullsymbolRe)) {
                    var check = false;
                    var actual = line.length - shared.trimRight(line).length;
                    if (!check) {
                        shared.addError(onError, lineNumber, "Expected: " + (expected === 0 ? "" : "0 or ") +
                            expected + "; Actual: " + actual, null, shared.rangeFromRegExp(line, check));
                    }
                }
            }
        });
    }
};

},{"./shared":49}],20:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
module.exports = {
    "names": ["MD018", "no-missing-space-atx"],
    "description": "No space after hash on atx style heading",
    "tags": ["headings", "headers", "atx", "spaces"],
    "function": function MD018(params, onError) {
        shared.forEachLine(function forLine(line, lineIndex, inCode) {
            if (!inCode && /^#+[^#\s]/.test(line) && !/#$/.test(line)) {
                shared.addErrorContext(onError, lineIndex + 1, line.trim(), null, null, shared.rangeFromRegExp(line, shared.atxHeadingSpaceRe));
            }
        });
    }
};

},{"./shared":49}],21:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
module.exports = {
    "names": ["MD019", "no-multiple-space-atx"],
    "description": "Multiple spaces after hash on atx style heading",
    "tags": ["headings", "headers", "atx", "spaces"],
    "function": function MD019(params, onError) {
        shared.filterTokens(params, "heading_open", function forToken(token) {
            if ((shared.headingStyleFor(token) === "atx") &&
                /^#+\s\s/.test(token.line)) {
                shared.addErrorContext(onError, token.lineNumber, token.line.trim(), null, null, shared.rangeFromRegExp(token.line, shared.atxHeadingSpaceRe));
            }
        });
    }
};

},{"./shared":49}],22:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
var atxClosedHeadingNoSpaceRe = /(?:^#+[^#\s])|(?:[^#\s]#+\s*$)/;
module.exports = {
    "names": ["MD020", "no-missing-space-closed-atx"],
    "description": "No space inside hashes on closed atx style heading",
    "tags": ["headings", "headers", "atx_closed", "spaces"],
    "function": function MD020(params, onError) {
        shared.forEachLine(function forLine(line, lineIndex, inCode) {
            if (!inCode && /^#+[^#]*[^\\]#+$/.test(line)) {
                var left = /^#+[^#\s]/.test(line);
                var right = /[^#\s]#+$/.test(line);
                if (left || right) {
                    shared.addErrorContext(onError, lineIndex + 1, line.trim(), left, right, shared.rangeFromRegExp(line, atxClosedHeadingNoSpaceRe));
                }
            }
        });
    }
};

},{"./shared":49}],23:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
var atxClosedHeadingSpaceRe = /(?:^#+\s\s+?\S)|(?:\S\s\s+?#+\s*$)/;
module.exports = {
    "names": ["MD021", "no-multiple-space-closed-atx"],
    "description": "Multiple spaces inside hashes on closed atx style heading",
    "tags": ["headings", "headers", "atx_closed", "spaces"],
    "function": function MD021(params, onError) {
        shared.filterTokens(params, "heading_open", function forToken(token) {
            if (shared.headingStyleFor(token) === "atx_closed") {
                var left = /^#+\s\s/.test(token.line);
                var right = /\s\s#+$/.test(token.line);
                if (left || right) {
                    shared.addErrorContext(onError, token.lineNumber, token.line.trim(), left, right, shared.rangeFromRegExp(token.line, atxClosedHeadingSpaceRe));
                }
            }
        });
    }
};

},{"./shared":49}],24:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
module.exports = {
    "names": ["MD022", "blanks-around-headings", "blanks-around-headers"],
    "description": "Headings should be surrounded by blank lines",
    "tags": ["headings", "headers", "blank_lines"],
    "function": function MD022(params, onError) {
        var prevHeadingLineNumber = 0;
        var prevMaxLineIndex = -1;
        var needBlankLine = false;
        params.tokens.forEach(function forToken(token) {
            if (token.type === "heading_open") {
                if ((token.map[0] - prevMaxLineIndex) === 0) {
                    shared.addErrorContext(onError, token.lineNumber, token.line.trim());
                }
            }
            else if (token.type === "heading_close") {
                needBlankLine = true;
            }
            if (token.map) {
                if (needBlankLine) {
                    if ((token.map[0] - prevMaxLineIndex) === 0) {
                        shared.addErrorContext(onError, prevHeadingLineNumber, params.lines[prevHeadingLineNumber - 1].trim());
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

},{"./shared":49}],25:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
var spaceBeforeHeadingRe = /^\s+\S/;
module.exports = {
    "names": ["MD023", "heading-start-left", "header-start-left"],
    "description": "Headings must start at the beginning of the line",
    "tags": ["headings", "headers", "spaces"],
    "function": function MD023(params, onError) {
        shared.filterTokens(params, "heading_open", function forToken(token) {
            if (spaceBeforeHeadingRe.test(token.line)) {
                shared.addErrorContext(onError, token.lineNumber, token.line, null, null, shared.rangeFromRegExp(token.line, spaceBeforeHeadingRe));
            }
        });
    }
};

},{"./shared":49}],26:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
module.exports = {
    "names": ["MD024", "no-duplicate-heading", "no-duplicate-header"],
    "description": "Multiple headings with the same content",
    "tags": ["headings", "headers"],
    "function": function MD024(params, onError) {
        var knownContent = [];
        shared.forEachHeading(params, function forHeading(heading, content) {
            if (knownContent.indexOf(content) === -1) {
                knownContent.push(content);
            }
            else {
                shared.addErrorContext(onError, heading.lineNumber, heading.line.trim());
            }
        });
    }
};

},{"./shared":49}],27:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
module.exports = {
    "names": ["MD025", "single-h1"],
    "description": "Multiple top level headings in the same document",
    "tags": ["headings", "headers"],
    "function": function MD025(params, onError) {
        var level = params.config.level || 1;
        var tag = "h" + level;
        var hasTopLevelHeading = false;
        shared.filterTokens(params, "heading_open", function forToken(token) {
            if (token.tag === tag) {
                if (hasTopLevelHeading) {
                    shared.addErrorContext(onError, token.lineNumber, token.line.trim());
                }
                else if (token.lineNumber === 1) {
                    hasTopLevelHeading = true;
                }
            }
        });
    }
};

},{"./shared":49}],28:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
module.exports = {
    "names": ["MD026", "no-trailing-punctuation"],
    "description": "Trailing punctuation in heading",
    "tags": ["headings", "headers"],
    "function": function MD026(params, onError) {
        var punctuation = params.config.punctuation || ".,;:!?";
        var trailingPunctuationRe = new RegExp("[" + punctuation + "]$");
        shared.forEachHeading(params, function forHeading(heading, content) {
            var match = trailingPunctuationRe.exec(content);
            if (match) {
                shared.addError(onError, heading.lineNumber, "Punctuation: '" + match[0] + "'", null, shared.rangeFromRegExp(heading.line, trailingPunctuationRe));
            }
        });
    }
};

},{"./shared":49}],29:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
var spaceAfterBlockQuote = /^\s*(?:>\s+)+\S/;
module.exports = {
    "names": ["MD027", "no-multiple-space-blockquote"],
    "description": "Multiple spaces after blockquote symbol",
    "tags": ["blockquote", "whitespace", "indentation"],
    "function": function MD027(params, onError) {
        var blockquoteNesting = 0;
        var listItemNesting = 0;
        params.tokens.forEach(function forToken(token) {
            if (token.type === "blockquote_open") {
                blockquoteNesting++;
            }
            else if (token.type === "blockquote_close") {
                blockquoteNesting--;
            }
            else if (token.type === "list_item_open") {
                listItemNesting++;
            }
            else if (token.type === "list_item_close") {
                listItemNesting--;
            }
            else if ((token.type === "inline") && (blockquoteNesting > 0)) {
                var multipleSpaces = listItemNesting ?
                    /^(\s*>)+\s\s+>/.test(token.line) :
                    /^(\s*>)+\s\s/.test(token.line);
                if (multipleSpaces) {
                    shared.addErrorContext(onError, token.lineNumber, token.line, null, null, shared.rangeFromRegExp(token.line, spaceAfterBlockQuote));
                }
                token.content.split(shared.newLineRe)
                    .forEach(function forLine(line, offset) {
                    if (/^\s/.test(line)) {
                        shared.addErrorContext(onError, token.lineNumber + offset, "> " + line, null, null, shared.rangeFromRegExp(line, spaceAfterBlockQuote));
                    }
                });
            }
        });
    }
};

},{"./shared":49}],30:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
module.exports = {
    "names": ["MD028", "no-blanks-blockquote"],
    "description": "Blank line inside blockquote",
    "tags": ["blockquote", "whitespace"],
    "function": function MD028(params, onError) {
        var prevToken = {};
        params.tokens.forEach(function forToken(token) {
            if ((token.type === "blockquote_open") &&
                (prevToken.type === "blockquote_close")) {
                shared.addError(onError, token.lineNumber - 1);
            }
            prevToken = token;
        });
    }
};

},{"./shared":49}],31:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
var numberRe = /^[\s>]*([^.)]*)[.)]/;
module.exports = {
    "names": ["MD029", "ol-prefix"],
    "description": "Ordered list item prefix",
    "tags": ["ol"],
    "function": function MD029(params, onError) {
        var style = params.config.style || "one_or_ordered";
        shared.flattenLists().forEach(function forList(list) {
            if (!list.unordered) {
                var listStyle_1 = style;
                if (listStyle_1 === "one_or_ordered") {
                    var second = (list.items.length > 1) &&
                        numberRe.exec(list.items[1].line);
                    listStyle_1 = (second && (second[1] !== "1")) ? "ordered" : "one";
                }
                var number_1 = 1;
                list.items.forEach(function forItem(item) {
                    var match = numberRe.exec(item.line);
                    shared.addErrorDetailIf(onError, item.lineNumber, String(number_1), !match || match[1], "Style: " + (listStyle_1 === "one" ? "1/1/1" : "1/2/3"), shared.rangeFromRegExp(item.line, shared.listItemMarkerRe));
                    if (listStyle_1 === "ordered") {
                        number_1++;
                    }
                });
            }
        });
    }
};

},{"./shared":49}],32:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
module.exports = {
    "names": ["MD030", "list-marker-space"],
    "description": "Spaces after list markers",
    "tags": ["ol", "ul", "whitespace"],
    "function": function MD030(params, onError) {
        var ulSingle = params.config.ul_single || 1;
        var olSingle = params.config.ol_single || 1;
        var ulMulti = params.config.ul_multi || 1;
        var olMulti = params.config.ol_multi || 1;
        shared.flattenLists().forEach(function forList(list) {
            var lineCount = list.lastLineIndex - list.open.map[0];
            var allSingle = lineCount === list.items.length;
            var expectedSpaces = list.unordered ?
                (allSingle ? ulSingle : ulMulti) :
                (allSingle ? olSingle : olMulti);
            list.items.forEach(function forItem(item) {
                var match = /^[\s>]*\S+(\s+)/.exec(item.line);
                shared.addErrorDetailIf(onError, item.lineNumber, expectedSpaces, (match ? match[1].length : 0), null, shared.rangeFromRegExp(item.line, shared.listItemMarkerRe));
            });
        });
    }
};

},{"./shared":49}],33:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
module.exports = {
    "names": ["MD031", "blanks-around-fences"],
    "description": "Fenced code blocks should be surrounded by blank lines",
    "tags": ["code", "blank_lines"],
    "function": function MD031(params, onError) {
        var lines = params.lines;
        shared.forEachLine(function forLine(line, i, inCode, onFence) {
            if (((onFence > 0) && (i - 1 >= 0) && lines[i - 1].length) ||
                ((onFence < 0) && (i + 1 < lines.length) && lines[i + 1].length)) {
                shared.addErrorContext(onError, i + 1, lines[i].trim());
            }
        });
    }
};

},{"./shared":49}],34:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
var listItemMarkerInterruptsRe = /^[\s>]*(?:[*+-]|1\.)\s+/;
var blankOrListRe = /^[\s>]*($|\s)/;
module.exports = {
    "names": ["MD032", "blanks-around-lists"],
    "description": "Lists should be surrounded by blank lines",
    "tags": ["bullet", "ul", "ol", "blank_lines"],
    "function": function MD032(params, onError) {
        var inList = false;
        var prevLine = "";
        shared.forEachLine(function forLine(line, lineIndex, inCode, onFence) {
            if (!inCode || onFence) {
                var lineTrim = line.trim();
                var listMarker = shared.listItemMarkerRe.test(lineTrim);
                if (listMarker && !inList && !blankOrListRe.test(prevLine)) {
                    // Check whether this list prefix can interrupt a paragraph
                    if (listItemMarkerInterruptsRe.test(lineTrim)) {
                        shared.addErrorContext(onError, lineIndex + 1, lineTrim);
                    }
                    else {
                        listMarker = false;
                    }
                }
                else if (!listMarker && inList && !blankOrListRe.test(line)) {
                    shared.addErrorContext(onError, lineIndex, lineTrim);
                }
                inList = listMarker;
            }
            prevLine = line;
        });
    }
};

},{"./shared":49}],35:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
var htmlRe = /<[^>]*>/;
module.exports = {
    "names": ["MD033", "no-inline-html"],
    "description": "Inline HTML",
    "tags": ["html"],
    "function": function MD033(params, onError) {
        var allowedElements = (params.config.allowed_elements || [])
            .map(function forElement(element) {
            return element.toLowerCase();
        });
        function forToken(token) {
            token.content.split(shared.newLineRe)
                .forEach(function forLine(line, offset) {
                var allowed = (line.match(/<[^/\s>!]*/g) || [])
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
                    shared.addError(onError, token.lineNumber + offset, "Element: " + allowed[0], null, shared.rangeFromRegExp(token.line, htmlRe));
                }
            });
        }
        shared.filterTokens(params, "html_block", forToken);
        shared.forEachInlineChild(params, "html_inline", forToken);
    }
};

},{"./shared":49}],36:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
module.exports = {
    "names": ["MD034", "no-bare-urls"],
    "description": "Bare URL used",
    "tags": ["links", "url"],
    "function": function MD034(params, onError) {
        shared.filterTokens(params, "inline", function forToken(token) {
            var inLink = false;
            token.children.forEach(function forChild(child) {
                var match = null;
                if (child.type === "link_open") {
                    inLink = true;
                }
                else if (child.type === "link_close") {
                    inLink = false;
                }
                else if ((child.type === "text") &&
                    !inLink &&
                    (match = shared.bareUrlRe.exec(child.content))) {
                    shared.addErrorContext(onError, child.lineNumber, match[0], null, null, shared.rangeFromRegExp(child.line, shared.bareUrlRe));
                }
            });
        });
    }
};

},{"./shared":49}],37:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
module.exports = {
    "names": ["MD035", "hr-style"],
    "description": "Horizontal rule style",
    "tags": ["hr"],
    "function": function MD035(params, onError) {
        var style = params.config.style || "consistent";
        shared.filterTokens(params, "hr", function forToken(token) {
            var lineTrim = token.line.trim();
            if (style === "consistent") {
                style = lineTrim;
            }
            shared.addErrorDetailIf(onError, token.lineNumber, style, lineTrim);
        });
    }
};

},{"./shared":49}],38:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
module.exports = {
    "names": ["MD036", "no-emphasis-as-heading", "no-emphasis-as-header"],
    "description": "Emphasis used instead of a heading",
    "tags": ["headings", "headers", "emphasis"],
    "function": function MD036(params, onError) {
        var punctuation = params.config.punctuation || ".,;:!?";
        var re = new RegExp("[" + punctuation + "]$");
        function base(token) {
            if (token.type === "paragraph_open") {
                return function inParagraph(t) {
                    // Always paragraph_open/inline/paragraph_close,
                    // omit (t.type === "inline")
                    var children = t.children.filter(function notEmptyText(child) {
                        return (child.type !== "text") || (child.content !== "");
                    });
                    if ((children.length === 3) &&
                        ((children[0].type === "strong_open") ||
                            (children[0].type === "em_open")) &&
                        (children[1].type === "text") &&
                        !re.test(children[1].content)) {
                        shared.addErrorContext(onError, t.lineNumber, children[1].content);
                    }
                    return base;
                };
            }
            else if (token.type === "blockquote_open") {
                return function inBlockquote(t) {
                    if (t.type !== "blockquote_close") {
                        return inBlockquote;
                    }
                    return base;
                };
            }
            else if (token.type === "list_item_open") {
                return function inListItem(t) {
                    if (t.type !== "list_item_close") {
                        return inListItem;
                    }
                    return base;
                };
            }
            return base;
        }
        var state = base;
        params.tokens.forEach(function forToken(token) {
            state = state(token);
        });
    }
};

},{"./shared":49}],39:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
module.exports = {
    "names": ["MD037", "no-space-in-emphasis"],
    "description": "Spaces inside emphasis markers",
    "tags": ["whitespace", "emphasis"],
    "function": function MD037(params, onError) {
        shared.forEachInlineChild(params, "text", function forToken(token) {
            var left = true;
            var match = /\s(\*\*?|__?)\s.+\1/.exec(token.content);
            if (!match) {
                left = false;
                match = /(\*\*?|__?).+\s\1\s/.exec(token.content);
            }
            if (match) {
                var text = match[0].trim();
                var line = params.lines[token.lineNumber - 1];
                var column = line.indexOf(text) + 1;
                var length_1 = text.length;
                shared.addErrorContext(onError, token.lineNumber, text, left, !left, [column, length_1]);
            }
        });
    }
};

},{"./shared":49}],40:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
var inlineCodeSpansRe = /(?:^|[^\\])((`+)((?:.*?[^`])|)\2(?!`))/g;
module.exports = {
    "names": ["MD038", "no-space-in-code"],
    "description": "Spaces inside code span elements",
    "tags": ["whitespace", "code"],
    "function": function MD038(params, onError) {
        shared.forEachInlineChild(params, "code_inline", function forToken(token) {
            var line = params.lines[token.lineNumber - 1];
            var match = null;
            while ((match = inlineCodeSpansRe.exec(line)) !== null) {
                var inlineCodeSpan = match[1];
                var content = match[3];
                var length_1 = inlineCodeSpan.length;
                var column = match.index + 1 + (match[0].length - length_1);
                var range = [column, length_1];
                if (/^\s([^`]|$)/.test(content)) {
                    shared.addErrorContext(onError, token.lineNumber, inlineCodeSpan, true, false, range);
                }
                else if (/[^`]\s$/.test(content)) {
                    shared.addErrorContext(onError, token.lineNumber, inlineCodeSpan, false, true, range);
                }
            }
        });
    }
};

},{"./shared":49}],41:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
var spaceInLinkRe = /\[(?:\s+(?:[^\]]*?)\s*|(?:[^\]]*?)\s+)](?=\(\S*\))/;
module.exports = {
    "names": ["MD039", "no-space-in-links"],
    "description": "Spaces inside link text",
    "tags": ["whitespace", "links"],
    "function": function MD039(params, onError) {
        shared.filterTokens(params, "inline", function forToken(token) {
            var inLink = false;
            var linkText = "";
            token.children.forEach(function forChild(child) {
                if (child.type === "link_open") {
                    inLink = true;
                    linkText = "";
                }
                else if (child.type === "link_close") {
                    inLink = false;
                    var left = shared.trimLeft(linkText).length !== linkText.length;
                    var right = shared.trimRight(linkText).length !== linkText.length;
                    if (left || right) {
                        shared.addErrorContext(onError, token.lineNumber, "[" + linkText + "]", left, right, shared.rangeFromRegExp(token.line, spaceInLinkRe));
                    }
                }
                else if (inLink) {
                    linkText += child.content;
                }
            });
        });
    }
};

},{"./shared":49}],42:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
module.exports = {
    "names": ["MD040", "fenced-code-language"],
    "description": "Fenced code blocks should have a language specified",
    "tags": ["code", "language"],
    "function": function MD040(params, onError) {
        shared.filterTokens(params, "fence", function forToken(token) {
            if (!token.info.trim()) {
                shared.addErrorContext(onError, token.lineNumber, token.line);
            }
        });
    }
};

},{"./shared":49}],43:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
module.exports = {
    "names": ["MD041", "first-line-h1"],
    "description": "First line in file should be a top level heading",
    "tags": ["headings", "headers"],
    "function": function MD041(params, onError) {
        var level = params.config.level || 1;
        var frontMatterTitle = params.config.front_matter_title;
        var tag = "h" + level;
        var frontMatterTitleRe = new RegExp(frontMatterTitle || "^\\s*title\\s*[:=]", "i");
        params.tokens.every(function forToken(token) {
            if (token.type === "html_block") {
                return true;
            }
            else if (token.type === "heading_open") {
                if (token.tag !== tag) {
                    shared.addErrorContext(onError, token.lineNumber, token.line);
                }
            }
            else if (((frontMatterTitle !== undefined) && !frontMatterTitle) ||
                !params.frontMatterLines.some(function forLine(line) {
                    return frontMatterTitleRe.test(line);
                })) {
                shared.addErrorContext(onError, token.lineNumber, token.line);
            }
            return false;
        });
    }
};

},{"./shared":49}],44:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
var emptyLinkRe = /\[[^\]]*](?:\((?:#?|(?:<>))\))/;
module.exports = {
    "names": ["MD042", "no-empty-links"],
    "description": "No empty links",
    "tags": ["links"],
    "function": function MD042(params, onError) {
        shared.filterTokens(params, "inline", function forToken(token) {
            var inLink = false;
            var linkText = "";
            var emptyLink = false;
            token.children.forEach(function forChild(child) {
                if (child.type === "link_open") {
                    inLink = true;
                    linkText = "";
                    child.attrs.forEach(function forAttr(attr) {
                        if (attr[0] === "href" && (!attr[1] || (attr[1] === "#"))) {
                            emptyLink = true;
                        }
                    });
                }
                else if (child.type === "link_close") {
                    inLink = false;
                    if (emptyLink) {
                        shared.addErrorContext(onError, child.lineNumber, "[" + linkText + "]()", null, null, shared.rangeFromRegExp(child.line, emptyLinkRe));
                    }
                }
                else if (inLink) {
                    linkText += child.content;
                }
            });
        });
    }
};

},{"./shared":49}],45:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
module.exports = {
    "names": ["MD043", "required-headings", "required-headers"],
    "description": "Required heading structure",
    "tags": ["headings", "headers"],
    "function": function MD043(params, onError) {
        var requiredHeadings = params.config.headings || params.config.headers;
        if (requiredHeadings) {
            var levels_1 = {};
            [1, 2, 3, 4, 5, 6].forEach(function forLevel(level) {
                levels_1["h" + level] = "######".substr(-level);
            });
            var i_1 = 0;
            var optional_1 = false;
            var errorCount_1 = 0;
            shared.forEachHeading(params, function forHeading(heading, content) {
                if (!errorCount_1) {
                    var actual = levels_1[heading.tag] + " " + content;
                    var expected = requiredHeadings[i_1++] || "[None]";
                    if (expected === "*") {
                        optional_1 = true;
                    }
                    else if (expected.toLowerCase() === actual.toLowerCase()) {
                        optional_1 = false;
                    }
                    else if (optional_1) {
                        i_1--;
                    }
                    else {
                        shared.addErrorDetailIf(onError, heading.lineNumber, expected, actual);
                        errorCount_1++;
                    }
                }
            });
            if ((i_1 < requiredHeadings.length) && !errorCount_1) {
                shared.addErrorContext(onError, params.lines.length, requiredHeadings[i_1]);
            }
        }
    }
};

},{"./shared":49}],46:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
module.exports = {
    "names": ["MD044", "proper-names"],
    "description": "Proper names should have the correct capitalization",
    "tags": ["spelling"],
    "function": function MD044(params, onError) {
        var names = params.config.names || [];
        var codeBlocks = params.config.code_blocks;
        var includeCodeBlocks = (codeBlocks === undefined) ? true : !!codeBlocks;
        names.forEach(function forName(name) {
            var escapedName = shared.escapeForRegExp(name);
            var namePattern = "\\S*\\b(" + escapedName + ")\\b\\S*";
            var anyNameRe = new RegExp(namePattern, "gi");
            function forToken(token) {
                var fenceOffset = (token.type === "fence") ? 1 : 0;
                token.content.split(shared.newLineRe)
                    .forEach(function forLine(line, index) {
                    var match = null;
                    while ((match = anyNameRe.exec(line)) !== null) {
                        var fullMatch = match[0];
                        if (!shared.bareUrlRe.test(fullMatch)) {
                            var wordMatch = fullMatch
                                .replace(/^\W*/, "").replace(/\W*$/, "");
                            if (names.indexOf(wordMatch) === -1) {
                                var lineNumber = token.lineNumber + index + fenceOffset;
                                var range = [match.index + 1, wordMatch.length];
                                shared.addErrorDetailIf(onError, lineNumber, name, match[1], null, range);
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

},{"./shared":49}],47:[function(require,module,exports){
// @ts-check
"use strict";
var shared = require("./shared");
module.exports = {
    "names": ["MD045", "no-alt-text"],
    "description": "Images should have alternate text (alt text)",
    "tags": ["accessibility", "images"],
    "function": function MD045(params, onError) {
        shared.forEachInlineChild(params, "image", function forToken(token) {
            if (token.content === "") {
                shared.addError(onError, token.lineNumber);
            }
        });
    }
};

},{"./shared":49}],48:[function(require,module,exports){
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
    require("./md008"),
    require("./md009"),
    require("./md010"),
    require("./md011"),
    require("./md012"),
    require("./md013"),
    require("./md014"),
    require("./md015"),
    require("./md016"),
    require("./md017"),
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

},{"./md001":3,"./md002":4,"./md003":5,"./md004":6,"./md005":7,"./md006":8,"./md007":9,"./md008":10,"./md009":11,"./md010":12,"./md011":13,"./md012":14,"./md013":15,"./md014":16,"./md015":17,"./md016":18,"./md017":19,"./md018":20,"./md019":21,"./md020":22,"./md021":23,"./md022":24,"./md023":25,"./md024":26,"./md025":27,"./md026":28,"./md027":29,"./md028":30,"./md029":31,"./md030":32,"./md031":33,"./md032":34,"./md033":35,"./md034":36,"./md035":37,"./md036":38,"./md037":39,"./md038":40,"./md039":41,"./md040":42,"./md041":43,"./md042":44,"./md043":45,"./md044":46,"./md045":47}],49:[function(require,module,exports){
// @ts-check
"use strict";
// Regular expression for matching common newline characters
// See NEWLINES_RE in markdown-it/lib/rules_core/normalize.js
module.exports.newLineRe = /\r[\n\u0085]?|[\n\u2424\u2028\u0085]/;
// Regular expression for matching common front matter (YAML and TOML)
module.exports.frontMatterRe = /^(---|\+\+\+)$[^]*?^\1$(\r\n|\r|\n)/m;
// Regular expression for matching inline disable/enable comments
var inlineCommentRe = /<!--\s*markdownlint-(dis|en)able((?:\s+[a-z0-9_-]+)*)\s*-->/ig;
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
var htmlCommentBegin = "<!--";
var htmlCommentEnd = "-->";
module.exports.clearHtmlCommentText = function clearHtmlCommentText(text) {
    var i = 0;
    while ((i = text.indexOf(htmlCommentBegin, i)) !== -1) {
        var j = text.indexOf(htmlCommentEnd, i);
        if (j === -1) {
            j = text.length;
            text += "\\";
        }
        var comment = text.slice(i + htmlCommentBegin.length, j);
        if ((comment.length > 0) &&
            (comment[0] !== ">") &&
            (comment[comment.length - 1] !== "-") &&
            (comment.indexOf("--") === -1) &&
            (text.slice(i, j + htmlCommentEnd.length)
                .search(inlineCommentRe) === -1)) {
            var blanks = comment
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
    var line = token.line.replace(/^[\s>]*(> |>)/, "");
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
var tokenCache = null;
// Caches line metadata and flattened lists for reuse
function makeTokenCache(params) {
    if (!params) {
        tokenCache = null;
        return;
    }
    // Populate line metadata array
    var lineMetadata = new Array(params.lines.length);
    var fenceStart = null;
    var inFence = false;
    // Find fenced code by pattern (parser ignores "``` close fence")
    params.lines.forEach(function forLine(line, lineIndex) {
        var metadata = 0;
        var match = /^[ ]{0,3}(`{3,}|~{3,})/.exec(line);
        var fence = match && match[1];
        if (fence &&
            (!inFence || (fence.substr(0, fenceStart.length) === fenceStart))) {
            metadata = inFence ? 2 : 6;
            fenceStart = inFence ? null : fence;
            inFence = !inFence;
        }
        else if (inFence) {
            metadata = 1;
        }
        lineMetadata[lineIndex] = metadata;
    });
    // Find code blocks normally
    filterTokens(params, "code_block", function forToken(token) {
        for (var i = token.map[0]; i < token.map[1]; i++) {
            lineMetadata[i] = 1;
        }
    });
    // Find tables normally
    filterTokens(params, "table_open", function forToken(token) {
        for (var i = token.map[0]; i < token.map[1]; i++) {
            lineMetadata[i] += 8;
        }
    });
    // Flatten lists
    var flattenedLists = [];
    var stack = [];
    var current = null;
    var lastWithMap = { "map": [0, 1] };
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
        }
        else if ((token.type === "bullet_list_close") ||
            (token.type === "ordered_list_close")) {
            // Finalize current context and restore previous
            current.lastLineIndex = lastWithMap.map[1];
            flattenedLists.splice(current.insert, 0, current);
            delete current.insert;
            current = stack.pop();
        }
        else if (token.type === "list_item_open") {
            // Add list item
            current.items.push(token);
        }
        else if (token.map) {
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
        var metadata = tokenCache.lineMetadata[lineIndex];
        callback(line, lineIndex, !!(metadata & 7), (((metadata & 6) >> 1) || 2) - 2, !!(metadata & 8));
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
    var heading = null;
    params.tokens.forEach(function forToken(token) {
        if (token.type === "heading_open") {
            heading = token;
        }
        else if (token.type === "heading_close") {
            heading = null;
        }
        else if ((token.type === "inline") && heading) {
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
module.exports.addErrorDetailIf = function addErrorDetailIf(onError, lineNumber, expected, actual, detail, range) {
    if (expected !== actual) {
        addError(onError, lineNumber, "Expected: " + expected + "; Actual: " + actual +
            (detail ? "; " + detail : ""), null, range);
    }
};
// Adds an error object with context via the onError callback
module.exports.addErrorContext =
    function addErrorContext(onError, lineNumber, context, left, right, range) {
        if (context.length <= 30) {
            // Nothing to do
        }
        else if (left && right) {
            context = context.substr(0, 15) + "..." + context.substr(-15);
        }
        else if (right) {
            context = "..." + context.substr(-30);
        }
        else {
            context = context.substr(0, 30) + "...";
        }
        addError(onError, lineNumber, null, context, range);
    };
// Returns a range object for a line by applying a RegExp
module.exports.rangeFromRegExp = function rangeFromRegExp(line, regexp) {
    var range = null;
    var match = line.match(regexp);
    if (match) {
        var column = match.index + 1;
        var length_1 = match[0].length;
        if (match[2]) {
            column += match[1].length;
            length_1 -= match[1].length;
        }
        range = [column, length_1];
    }
    return range;
};

},{}],50:[function(require,module,exports){

},{}],51:[function(require,module,exports){
(function (process){
// .dirname, .basename, and .extname methods are extracted from Node.js v8.11.1,
// backported and transplited with Babel, with backwards-compat fixes

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

exports.dirname = function (path) {
  if (typeof path !== 'string') path = path + '';
  if (path.length === 0) return '.';
  var code = path.charCodeAt(0);
  var hasRoot = code === 47 /*/*/;
  var end = -1;
  var matchedSlash = true;
  for (var i = path.length - 1; i >= 1; --i) {
    code = path.charCodeAt(i);
    if (code === 47 /*/*/) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
      // We saw the first non-path separator
      matchedSlash = false;
    }
  }

  if (end === -1) return hasRoot ? '/' : '.';
  if (hasRoot && end === 1) {
    // return '//';
    // Backwards-compat fix:
    return '/';
  }
  return path.slice(0, end);
};

function basename(path) {
  if (typeof path !== 'string') path = path + '';

  var start = 0;
  var end = -1;
  var matchedSlash = true;
  var i;

  for (i = path.length - 1; i >= 0; --i) {
    if (path.charCodeAt(i) === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // path component
      matchedSlash = false;
      end = i + 1;
    }
  }

  if (end === -1) return '';
  return path.slice(start, end);
}

// Uses a mixed approach for backwards-compatibility, as ext behavior changed
// in new Node.js versions, so only basename() above is backported here
exports.basename = function (path, ext) {
  var f = basename(path);
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};

exports.extname = function (path) {
  if (typeof path !== 'string') path = path + '';
  var startDot = -1;
  var startPart = 0;
  var end = -1;
  var matchedSlash = true;
  // Track the state of characters (if any) we see before our first dot and
  // after any path separator we find
  var preDotState = 0;
  for (var i = path.length - 1; i >= 0; --i) {
    var code = path.charCodeAt(i);
    if (code === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
    if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // extension
      matchedSlash = false;
      end = i + 1;
    }
    if (code === 46 /*.*/) {
        // If this is our first dot, mark it as the start of our extension
        if (startDot === -1)
          startDot = i;
        else if (preDotState !== 1)
          preDotState = 1;
    } else if (startDot !== -1) {
      // We saw a non-dot and non-path separator before our dot, so we should
      // have a good chance at having a non-empty extension
      preDotState = -1;
    }
  }

  if (startDot === -1 || end === -1 ||
      // We saw a non-dot character immediately before the dot
      preDotState === 0 ||
      // The (right-most) trimmed path component is exactly '..'
      preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
    return '';
  }
  return path.slice(startDot, end);
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
},{"_process":52}],52:[function(require,module,exports){
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
