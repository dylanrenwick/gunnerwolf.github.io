var code;
var output;
var input;
var cell = cellHolder(0, 0);

function cellHolder(cell, line) {
    this.value = cell;
    this.lineNum = line;
}

function getValue(val) {
    if (typeof val === 'number') {
        return val;
    } else if (typeof val === 'string') {
        return val.charCodeAt(0);
    } else {
        var parsed = parseInt(val);
        if (parsed != NaN) {
            return parsed;
        } else {
            return 0;
        }
    }
}

function getParam(valCode, lines, cell) {
    if (valCode == 'v') {
        cell.lineNum += 1;
        return parseLine(lines, cellHolder(cell.value, cell.lineNum));
    } else if (valCode == '^') {
        return parseLine(lines, cellHolder(cell.value, cell.lineNum - 1));
    } else if (typeof valCode === 'int') {
        return valCode;
    } else {
        var parsed = parseInt(valCode);
        if (parsed != NaN) {
            return parsed;
        } else {
            return valCode.charCodeAt(0);
        }
    }
}

function findEnd(lines) {
    forCount = 0;
    for (var i = 0; i < lines.length; i++) {
        if (lines[i] == 'Ed') {
            if (forCount > 0) {
                forCount--;
            } else {
                return {lines: lines.slice(0, x), endIndex: x + 1};
            }
        } else if (lines[x].startsWith('F') && lines[x] != 'F!') {
            forCount++;
        }
    }
}

function fact(x) {
    if(x==0) {
        return 1;
    }
    return x * fact(x-1);
}

function parseLine(lines, cell) {
    if (cell.lineNum < 0 || cell.lineNum >= lines.length) {
        return 0;
    }
    l = lines[cell.lineNum];
    if (l.includes(' ')) {
        l = l.trim();
    }

    if (l == 'Sq') {
        return ((cell.value**.5%1)==0);
    } else if (l == 'F!') {
        var val = [];
        for (var i = 0; i < cell.value; i++) {
            val.push(fact(i));
        }
        return val;
    } else if (l == "HW") {
        return "Hello, World!";
    } else if (l == "In") {
        return 0;
    } else if (l == "Ed") {
        return 0;
    } else if (l.startsWith('+')) {
        if (l.length > 1) {
            var val = getParam(l[1], lines, cell);
            cell.value += val;
        } else {
            cell.value += cell.value;
        }
    } else if (l.startsWith('-')) {
        if (l.length > 1) {
            var val = getParam(l[1], lines, cell);
            cell.value -= val;
        } else {
            cell.value -= cell.value;
        }
    } else if (l.startsWith('*')) {
        if (l.length > 1) {
            var val = getParam(l[1], lines, cell);
            cell.value *= val;
        } else {
            cell.value *= cell.value;
        }
    } else if (l.startsWith('/')) {
        if (l.length > 1) {
            var val = getParam(l[1], lines, cell);
            cell.value /= val;
        } else {
            cell.value /= cell.value;
        }
    } else if (l.startsWith('=')) {
        if (l.length > 1) {
            var val = getParam(l[1], lines, cell);
            cell.value = val;
        }
    } else if (l.startsWith('?')) {
        val = getParam(l[1], lines, cell);
        if (!val) {
            cell.lineNum += 1;
        }
    } else if (l.startsWith('!')) {
        val = getParam(l[1], lines, cell);
        if (val) {
            cell.lineNum += 1;
        }
    } else if (l.startsWith('$')) {
        val = getParam(l[1], lines, cell);
        return val.includes(cell.value);
    } else if (l.startsWith('#')) {
        if (l.length > 1) {
            val = getParam(l[1], lines, cell);
            output += val + "\n";
            return val;
        } else {
            output += cell.value + "\n";
        }
    } else if (l.startsWith('d')) {
        var val;
        if (l.length > 1) {
            val = getParam(l[1], lines, cell);
        } else {
            val = cell.value;
        }
        rand = (Math.floor(Math.random() * val)) + 1;
        output += rand + "\n";
        return rand;
    } else if (l.startsWith('D')) {
        var val;
        if (l.length > 1) {
            val = getParam(l[1], lines, cell);
        } else {
            val = cell.value;
        }
        var ret = Array(val).keys().reverse();
        return ret;
    } else if (l.startsWith('A')) {
        var val;
        if (l.length > 1) {
            val = getParam(l[1], lines, cell);
        } else {
            val = cell.value;
        }
        var ret = Array(val).keys();
        return ret;
    } else if (l.startsWith('F')) {
        var val;
        if (l.length > 1) {
            val = getParam(l[1], lines, cell);
        } else {
            val = cell.value;
        }
        end = findEnd(lines.slice(cell.lineNum + 1));
        if (val instanceof Array) {
            for (var i = 0; i < val.length; i++) {
                parse(end.lines, cellHolder(i, 0));
            }
        } else {
            for (var i = 0; i < val; i++) {
                parse(end.lines, cellHolder(i, 0));
            }
        }
        cell.lineNum += end.endIndex;
    } else if (l.startsWith('^')) {
        var val = parseLine(lines, cellHolder(cell.value, cell.lineNum - 1));
        return val;
    } else if (l.startsWith('v')) {
        cell.lineNum++;
        var val = parseLine(lines, cell);
        return val;
    } else {
        var parsed = parseInt(l);
        if (parsed != NaN) {
            return parsed;
        } else {
            return l.charCodeAt(0);
        }
    }

    return cell.value;
}

function parse(code, cell) {
    retval = 0;
    while cell.lineNum < len(code) {
        retval = parseLine(code, cell);
        cell.lineNum++;
    }
    output += retval;
}

function interpreter() {
    code = document.getElementById("code").value;
    code = code.split('\n');
    for (var i = 0; i < code.length; i++) {
        if (code[i].length != 2) {
            output += "Invalid code!\n";
            output += "Line " + i + " contains invalid 2Col code!\n";
            output += code[i];
            document.getElementById("output").value = output;
            return;
        }
    }

    input = document.getElementById("input").value;

    cell.value = getValue(input);

    parse(code, cell);

    document.getElementByid("output").value = output;
}
