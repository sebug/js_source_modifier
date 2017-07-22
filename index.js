var esprima = require('esprima');
var es = require('escodegen');
var fs = require('fs');

if (process.argv.length < 4) {
    console.log("Usage: node index.js sourceFile requireToAdd");
    return -1;
}

var sourceFile = process.argv[2];
var search = process.argv[3];

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

function addRequire(tree, r) {
    var res;
    if (tree.type === 'Program') {
	res = {};
	Object.keys(tree).forEach(function (k) {
	    if (k === 'body') {
		res[k] = tree[k].map(function (b) {
		    return addRequire(b, r);
		});
	    } else {
		res[k] = tree[k];
	    }
	});
	return res;
    } else if (tree.type === 'ExpressionStatement') {
	res = {};
	Object.keys(tree).forEach(function (k) {
	    if (k === 'expression') {
		res[k] = addRequire(tree[k], r);
	    } else {
		res[k] = tree[k];
	    }
	});
	return res;
    } else if (tree.type === 'CallExpression') {
	res = {};
	Object.keys(tree).forEach(function (k) {
	    if (k === 'arguments') {
		res[k] = tree[k].map(function (arg) {
		    return addRequire(arg, r);
		});
	    } else {
		res[k] = tree[k];
	    }
	});
	return res;
    } else if (tree.type === 'ArrayExpression') {
	// Found the array expression
		res = {};
	Object.keys(tree).forEach(function (k) {
	    if (k === 'elements') {
		res[k] = insertRequire(tree[k], r);
	    } else {
		res[k] = tree[k];
	    }
	});
	return res;
    } else {
	return tree;
    }
}

function insertRequire(elements, r) {
    var result = [];
    var i;
    for (i = 0; i < elements.length && elements[i].value < r; i += 1) {
	result.push(elements[i]);
    }
    result.push({
	type: 'Literal',
	value: r,
	raw: '\'' + r + '\''
    });
    for (;i < elements.length; i += 1) {
	result.push(elements[i]);
    }
    return result;
}

fs.readFile(sourceFile, 'utf8', function (err, data) {
    var tree = esprima.parseScript(data, { range: true, tokens: true, comment: true });
    var enriched = es.attachComments(tree, tree.comments, tree.tokens);
    
    var requires = getRequires(tree);

    var found = requires.filter(function (item) {
	return item.value === search;
    }).length;
    if (found) {
	console.log(data);
    } else {
	var transformed = addRequire(
	    tree,
	    search
	);
	console.log(es.generate(transformed, { comment: true }));
    }
});
