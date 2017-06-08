function findMatchingClose(src, index) {
	index += 1;
	count = 1;
	code = "(";
	while (index < src.length) {
		c = src[index];
		code += c;
		if (c == '(') {
			count++;
		} else if (c == ')') {
			count--;
		}
		if (count == 0) {
			return code;
		}
		index++;
	}
	code += ')'.repeat(count);
	return code;
}

function extractTerm(code, index) {
	ret = "";
	parenCount = 0;
	quote = false;
	while (index < code.length) {
		c = code[index];
		if (c == '(') {
			parenCount += 1;
		} else if (c == ')') {
			if (parenCount > 0) {
				parenCount--;
			} else {
				return {term: ret, endIndex: index + 1};
			}
		} else if (c == '"') {
			if (quote && (index > 0 && code[index-1] != '\\')) {
				quote = false;
			} else if (!quote) {
				quote = true;
			}
		} else if (c == ' ' && parenCount == 0 && !quote) {
			return {term: ret, endIndex: index + 1};
		}
		ret += c;
		index++;
	}
	if (!quote && parenCount == 0) {
		return {term: ret, endIndex: -1};
	} else {
		console.log('Error parsing!');
		process.exit(-1);
	}
}

function parseVal(val) {
	if (val[0] == '"') {
		return {type: 'string', value: val.substring(1, val.length - 2)};
	} else if (!isNaN(val)) {
		return {type: 'num', value: parseFloat(val)};
	} else if (val.constructor === Array) {
		return {type: 'list', value: val};
	} else {
		return {type: 'varname', value: val};
	}
}

function parseExpr(expr) {
	var funcTerm = extractTerm(expr, 1);
	var func = funcTerm.term;
	var argIndex = funcTerm.endIndex;
	if (argIndex > 0) {
		var args = [];
		while (argIndex >= 0) {
			var term = extractTerm(expr, argIndex);
			var nextArg = term.term;
			argIndex = term.endIndex;
			if (nextArg) {
				if (nextArg[0] == '(') {
					var nextExpr = parseExpr(nextArg);
					nextArg = nextExpr.func;
				} else {
					nextArg = parseVal(nextArg);
				}
				args.push(nextArg);
			}
		}
	}
	var ret = {func: {func: func, args: args}, skip: expr.length};
	return ret;
}

function parse(code) {
	index = 0;
	ast = [];
	while (index < code.length) {
		c = code[index];
		if (c == '(') {
			parsed = parseExpr(findMatchingClose(code, index));
			ast.push(parsed.func);
			index += parsed.skip;
		} else {
			index++;
		}
	}
	//console.log(JSON.stringify(ast, null, 2));
	return ast;
}

function throwError(msg, env) {
	console.log(msg);
	console.log("At:");
	for(var i = 0; i < stackTrace.length; i++) {
		console.log("  " + stackTrace[i]);
	}
	console.log(JSON.stringify(env, null, 2));
	process.exit();
}

function throwReferenceError(name, env) {
	throwError("Referenced env variable before assignment: " + name, env);
}

function throwTypeError(name, type, expected, env) {
	throwError("Expected type " + expected + " but was given type " + type + " in " + name, env);
}

function refCheck(arg, env) {
	if (arg.value == undefined) {
		throwReferenceError(arg.varname, env);
	}
}

function initEnv() {
	var env = {};
	env[':'] = {type: 'func', value: function(e, x, y){e[x.value] = {type: y.type, value: y.value}; return y.value}, retVal: 'value', args: ['varname', 'value']};
	env['set'] = env[':'];
	env['p'] = {type: 'func', value: function(e, x){console.log(x.value); return x.value}, retVal: 'value', args: ['value']};
	env['print'] = env['p'];
	env['+'] = {type: 'func', value: function(e, x, y){return x.value + y.value}, retVal: 'value', args: ['value', 'value']};
	env['sum'] = env['+'];
	env['-'] = {type: 'func', value: function(e, x, y){return x.value - y.value}, retVal: 'num',   args: ['num', 'num']};
	env['sub'] = env['-'];
	env['*'] = {type: 'func', value: function(e, x, y){return x.value * y.value}, retVal: 'value', args: ['value', 'num']};
	env['mul'] = env['*'];
	env['/'] = {type: 'func', value: function(e, x, y){return x.value / y.value}, retVal: 'num',  args: ['num', 'num']};
	env['div'] = env['/'];
	env['@'] = {type: 'func', value: function(e, x, y){while(runFunc(x.value, e).value){var ret = runFunc(y.value, e)}return ret.value}, retVal: 'value', args: ['func', 'func']};
	env['while'] = env['@'];
	env['list'] = {type: 'func', value: function(e){return ([].slice.call(arguments)).slice(1)}, retVal: 'list', args: ['many']};
    env['i'] = {type: 'func', value: function(e, x, y){if (y.value >= 0 && y.value < x.value.length) return x.value[y.value]; else if (y.value < 0) return x.value[x.value.length - y.value]; else throwError('Index out of range!', e)}, retVal: 'value', args: ['list', 'num']};
	env['append'] = {type: 'func', value: function(e, x, y){return x.value.push(y.value)}, retVal: 'list', args: ['list', 'num']};
	return env;
}

function castArg(arg, type, env) {
	if (type == 'many' || type == undefined) type = 'value';
	if (arg.type != undefined) {
		if (arg.type == 'string' || arg.type == 'num' || arg.type == 'bool' || arg.type == 'list') {
			if (type == 'value' || type == 'all' || type == arg.type) {
				return {type: arg.type, value: arg.value};
			} else {
				throwTypeError(arg.value, arg.type, type, env);
			}
		} else if (arg.type == 'varname') {
			if (type == 'varname') {
				return {type: type, value: arg.value};
			} else {
				if (arg.value in env) {
					if (env[arg.value].type == type || (type == 'value' || type == 'all')) {
						return {type: env[arg.value].type, value: env[arg.value].value};
					} else {
						throwTypeError(arg.value, env[arg.value].type, type, env);
					}
				} else {
					throwReferenceError(arg.value, env);
				}
			}
		}
	} else {
		if (type == 'func' || type == 'all') {
			return {type: 'func', value: arg};
		} else {
			return runFunc(arg, env);
		}
	}
}

function runFunc(func, env) {
	if (func.func in env) {
		var envFunc = env[func.func];
		if (envFunc.type = 'func') {
			var funcArgs = [env];
			console.log('Args: ' + JSON.stringify(func.args));
			var max = (envFunc.args.length > 0 && envFunc.args[0] == 'many') ? func.args.length : Math.min(func.args.length, envFunc.args.length);
			for(var i = 0; i < max; i++) {
				console.log('I: ' + i + '  len: ' + func.args.length + '  max: ' + max);
				var newArg = castArg(func.args[i], envFunc.args[i], env);
				funcArgs.push(newArg);
			}
			var argStr = "";
			for(var i = 1; i < funcArgs.length; i++) {
				arg = funcArgs[i];
				if (arg.type == 'string' || arg.type == 'num') {
					argStr += arg.value;
				} else {
					argStr += arg.varname;
				}
				arg += ", ";
			}
			argStr = argStr.slice(0, -2);
			stackTrace.push(func.func + "(" + argStr + ")");
			var ret = envFunc.value.apply(this, funcArgs);
			return parseVal(ret);
		}
	}
}

var stackTrace = []

function interpret(ast) {
	var env = initEnv();
	for (var i = 0; i < ast.length; i++) {
		runFunc(ast[i], env);
	}
}

/*var args = process.argv.slice(2);
var source;
if (args.length == 0) {
	//TODO: REPL
	console.log('REPL not yet implemented');
	process.exit();
} else if (args.length == 1) {
	source = args[0];
} else {
	if (args[0] == '-f') {
		//TODO: File reading
	} else {
		console.log('Invalid args');
		process.exit();
	}
}

console.log(source);
interpret(parse(source));
*/
