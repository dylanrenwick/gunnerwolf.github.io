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
        return {type: 'string', value: eval(val)};
    } else if (!isNaN(val)) {
        return {type: 'num', value: parseFloat(val)};
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

function throwReferenceError(name, env) {
    console.log("Referenced env variable before assignment: " + name);
    console.log("At:");
    for(var i = 0; i < stackTrace.length; i++) {
        console.log("  " + stackTrace[i]);
    }
    console.log(env);
    process.exit();
}

function refCheck(arg, env) {
    if (arg.value == undefined) {
        throwReferenceError(arg.varname, env);
    }
}

function initEnv() {
    var env = {};
    env[':'] = {type: 'func', value: function(e, x, y){refCheck(y,e);e[x.varname] = y.value; return y.value}};
    env['set'] = env[':'];
    env['p'] = {type: 'func', value: function(e, x){refCheck(x,e);console.log(x.value); return x.value}};
    env['print'] = env['p'];
    env['+'] = {type: 'func', value: function(e, x, y){refCheck(x,e);refCheck(y,e); return x.value + y.value}};
    env['sum'] = env['+'];
    env['-'] = {type: 'func', value: function(e, x, y){refCheck(x,e);refCheck(y,e); return x.value - y.value}};
    env['sub'] = env['-'];
    return env;
}

function runFunc(func, env) {
    if (func.func in env) {
        var envFunc = env[func.func];
        if (envFunc.type = 'func') {
            var funcArgs = [env];
            for(var i = 0; i < func.args.length; i++) {
                if (func.args[i].type != undefined) {
                    if (func.args[i].type == 'string' || func.args[i].type == 'num') {
                        funcArgs.push({type: func.args[i].type, value: func.args[i].value});
                    } else if (func.args[i].type == 'varname') {
                        if (func.args[i].value in env) {
                            funcArgs.push({type: 'varname', varname: func.args[i].value, value: env[func.args[i].value]});
                        } else {
                            funcArgs.push({type: 'varname', varname: func.args[i].value, value: undefined});
                        }
                    }
                } else {
                    //console.log(func.args[i]);
                    funcArgs.push(runFunc(func.args[i], env));
                }
            }
            //console.log(funcArgs);
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
