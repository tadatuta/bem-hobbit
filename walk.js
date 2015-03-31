//TODO: Write unit tests
//TODO: Rewrite Architecture
    //TODO: Add logger
    //TODO: Error propagination
    //TODO: Add walker
    //TODO: Add JSDocs
    //TODO: Add Linters 
//TODO: Server


module.exports = function (target, options) {


var walk = require('bem-walk'),
    Stream = require('stream'),
    vm = require('vm'),
    fs = require('fs');

//TODO: HardCore Levels
var LEVELS = ['common.blocks', 'desktop.blocks', 'touch.blocks', 'touch-phone.blocks', 'touch-pad.blocks']
LEVELS = ['common.blocks'];
var DEPS_TYPES = ['mustDeps', 'shouldDeps'];

var walker = walk(LEVELS);


var blockName = target;

var i = 0, j = 0;

var n = 0, p = 0;

var blocks = {};


function isBlock(bemObject) {
    return bemObject.block && !bemObject.elem && !bemObject.modName;
}

function isBlockDep(bemDep) {
    return bemDep.block && !bemDep.elem;
}


//Look at deps-normalizer by @floatdrop
function expandDeps(blockName, dep) {
    //TODO: elem
    //TODO: mod
    //TODO: elems -> []
    //TODO: mods -> []
    if (typeof dep == typeof '') return {block: dep};
    //if (dep.block) {
    //} else {
    //    dep.block = blockName;
    //}
    return dep;
}


function back(bemObject) {
    var list = {},
        bemObjs = [bemObject];
    while(bemObject = bemObjs.pop()) {
        //bemObject = blocks[bemObject.block]
        list[bemObject.block] = bemObject;
        Object.keys(blocks).forEach(function(block) {
            block = blocks[block];
            DEPS_TYPES.forEach(function(depType) {
                [].concat(block[depType]).forEach(function(dep) {
                    dep = expandDeps(block.block, dep);
                    if (dep.block === bemObject.block) {
                        bemObjs.push(block);
                        list[block.block] = block;
                    }
                });
            });
        });
    }
    return list;
}

function there(tree) {

    traverse(tree, function(dep) {
        dep = expandDeps(dep.block, dep);
        if (isBlockDep(dep)) {
            if (!dep.bemObject) {
                dep.bemObject = blocks[dep.block];
            }
        }

        return dep;
    });
}

function traverse(tree, callback) {
    function proceedDeps(blockDeps) {
        return blockDeps.map(function(dep) {
            dep = callback(dep) || dep;
            if (dep.bemObject) {
                traverse(dep.bemObject, callback);
            }
            return dep;
        });
    }

    DEPS_TYPES.forEach(function(depType) {
        tree[depType] = proceedDeps(tree[depType]);
    });
}

function flat(tree) {
    var list = {}
    traverse(tree, function(dep) {
        //only blocks now
        dep.block && (list[dep.block] = dep);
    });

    return list;
}

function shouldResponse() {
    if (n === p) {
        ((blockName && [blockName]) || Object.keys(blocks)).forEach(function(blockName) {
            block = blocks[blockName];
            if (!block) {
                console.log('No such block\n')
            } else {
                there(block);
                var all = flat(block);
                var allb = back(block);

                console.log('\n==========\n');
                var gothere = options && options.there;
                var goback = options && options.back;
                !gothere && !goback && (gothere = goback = true);
                gothere && console.log('There: ' + Object.keys(all).join(', ') + '\n');
                goback && console.log('Back: ' + Object.keys(allb).join(', ') + '\n');
                console.log('\n==========\n');
            }
        });
        //res.end('\t^_^\n');
    }
}

function collectBemObject(bemObject) {
    //put in hash blockName --> blockObj
    blocks[bemObject.block] = blocks[bemObject.block] || bemObject;

    DEPS_TYPES.forEach(function(depType) {
        blocks[bemObject.block][depType] = [];
    });
}

function collectDeps(bemObject, deps) {
    //TODO: Only tech:bemhml now
    //TODO: Forgot about levels =(
    [].concat(deps).forEach(function(dep) {
        if (dep.tech) {
            //tech: js, tmpl-spec.js
            console.log('Unresolved tech: ' + dep.tech);
            return;
        }

        //TODO: noDeps: []
        DEPS_TYPES.forEach(function(depType) {
            [].concat(dep[depType]).forEach(function(dep) {
                dep && blocks[bemObject.block][depType].push(dep);
            });
        });
    });
}

var stream = new Stream.Writable({objectMode: true});
stream._write = function(chunk, encoding, next) {
    console.dir(chunk);
    next();
};

var depsMapper = new Stream.Transform({objectMode: true});
depsMapper._transform = function(bemObject, encoding, next) {
    if (bemObject.tech === 'deps.js') {
        var data = fs.readFileSync(bemObject.path, 'utf8'),
            deps = vm.runInThisContext(data);
        //this.push(deps);
        bemObject.deps = deps;
        this.push(bemObject);
    }
    //this.push(bemObject);
    next();
};

var onlyBlocks = new Stream.Transform({objectMode: true});
onlyBlocks._transform = function(bemObject, encoding, next) {
    isBlock(bemObject) && this.push(bemObject);
    next();
};

walker
    .on('error', function(error) {
        console.log('Error');
    })
    .pipe(onlyBlocks)
    .pipe(depsMapper)
    .pipe(stream);

//walker.on('data', function (bemObject) {
//    //TODO: Only blocks now
//    if (!isBlock(bemObject)) return;
//
//    collectBemObject(bemObject);
//
//    if (bemObject.tech === 'deps.js') {
//
//        n++;
//        fs.readFile(bemObject.path, 'utf8', function(err, data) {
//            if (err) throw err;
//
//            //TODO: JSON.parse or vm.runInThisContext
//            var deps = eval(data);
//
//            collectDeps(bemObject, deps);
//
//            p++;
//            shouldResponse();
//        });
//    };
//}).on('end', function() {
//    //res.writeHead(200, {'Content-Type': 'text/plain'});
//    console.log('end');
//}).on('error', function(error) {
//    //res.writeHead(200, {'Content-Type': 'text/plain'});
//    //res.end('Error ! >_<');
//    console.log('Error' + error);
//});

};
