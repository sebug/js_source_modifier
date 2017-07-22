var esprima = require('esprima');
var fs = require('fs');

function getRequires(program) {
    var res = [];

    if (program.type === 'Program') {
	program.body.forEach(function (statement) {
	    var items = getRequires(statement);
	    if (items) {
		items.forEach(function (item) {
		    res.push(item);
		});
	    }
	});
	return res;
    } else if (program.type === 'ExpressionStatement') {
	return getRequires(program.expression);
    } else if (program.type === 'CallExpression') {
	if (program.arguments && program.arguments.length) {
	    return getRequires(program.arguments[0]);
	}
	return [];
    } else if (program.type === 'ArrayExpression') {
	return program.elements.map(function (item) {
	    return item;
	});
    }
}

fs.readFile('data/test.js', 'utf8', function (err, data) {
    var tree = esprima.parseScript(data, { range: true, tokens: true, comment: true });
    console.log(tree);
    var requires = getRequires(tree);
    console.log(requires);
});
