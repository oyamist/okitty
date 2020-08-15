(function(exports) {
    const { Octokit } = require("@octokit/rest");
    const { createTokenAuth } = require("@octokit/auth-token");
    const IConsole = require("./iconsole");
    const Base64 = require("js-base64");
    const MSG_INITIALIZE = "initialize() is required";
    
    class Okitty {
        constructor(opts = {}) {
            this.owner = opts.owner;
            this.repo = opts.repo || "okitty";
            this.indent = opts.indent || 2;
            this.branch = opts.branch || "master";
            this.message = opts.message;
            this.author = opts.author;
            this.committer = opts.committer;
            this.encoding = opts.encoding || "utf-8";
            this.stats = {
                octokitCalls: 0,
            };
            this.initialized = false;
            IConsole.inject(this, opts.logger);
            Object.defineProperty(this, "cache", {
                value: {},
            });
            this.auth = opts.auth;
        }

        initialize(opts) {
            var that = this;
            if (that.initialized) {
                return Promise.resolve(this);
            }
            var {
                octokit,
                owner,
                repo,
                branch,
                stats,
                verbose,
                auth,
            } = Object.assign(Object.assign({}, that), opts);
            if (!auth) {
                return Promise.reject(new Error("auth is required"));
            }
            Object.defineProperty(this, "octokit", {
                value: new Octokit({ auth, }),
            });
            var ref = `heads/${branch}`;
            var octokitOpts = { owner, repo, ref, };
            var stack = new Error().stack;
            var pbody = (resolve, reject) => (async function() { try {
                that.initialized = true;
                var branchExists = true;
                try {
                    var res = await that.getRef(ref);
                } catch (e) {
                    branchExists = false;
                }
                if (res) {
                    that.log(`Okitty.initialize:`, {owner, repo, branch});
                } else { // clone branch from master
                    var res = await that.getRef("heads/master");
                    that.log(`Okitty.initialize:`,
                        `branch master => ${branch}`);
                    octokitOpts.ref = `refs/heads/${branch}`;
                    octokitOpts.sha = res.data.object.sha;
                    stats.octokitCalls++;
                    var res = await octokit.git.createRef(octokitOpts);
                    that.log(`Okitty.initialize new branch:`, 
                        {owner, repo, branch});
                }
                resolve(that);
            } catch(e) { 
                that.error(e.message, stack);
                reject(e); 
            } })();
            return new Promise(pbody);
        }

        getRef(optsOrRef) {
            if (!this.initialized) {
                return Promise.reject(new Error(MSG_INITIALIZE));
            }
            var that = this;
            var {
                octokit,
                stats,
            } = that;
            var {
                owner,
                repo,
                ref,
            } = Object.assign(Object.assign({}, that), 
                typeof optsOrRef === 'string'
                    ? { ref: optsOrRef }
                    : optsOrRef);
            var octokitOpts = {
                owner,
                repo,
                ref,
            };
            var stack = new Error().stack;
            var pbody = (resolve, reject) => (async function() { try {
                stats.octokitCalls++;
                var res = await octokit.git.getRef(octokitOpts);
                resolve(res.data);
            } catch(e) { 
                that.error(JSON.stringify(octokitOpts), e.message, stack);
                reject(e); 
            } })();
            return new Promise(pbody);
        }

        getHeadCommit(optsOrBranch) { // okitty only
            if (!this.initialized) {
                return Promise.reject(new Error(MSG_INITIALIZE));
            }
            var that = this;
            var {
                octokit,
                owner,
                repo,
                branch,
                stats,
            } = Object.assign(Object.assign({}, that), 
                typeof optsOrBranch === 'string'
                    ? { branch: optsOrBranch }
                    : optsOrBranch);
            var octokitOpts;
            var stack = new Error().stack;
            var pbody = (resolve, reject) => (async function() { try {
                var ref = `heads/${branch}`;
                octokitOpts = {
                    owner,
                    repo,
                    ref,
                };
                var resRef = await that.getRef(octokitOpts);
                octokitOpts = {
                    owner,
                    repo,
                    commit_sha: resRef.object.sha,
                };
                var result = await that.getCommit(octokitOpts);
                resolve(result);
            } catch(e) { 
                that.error(`getHeadCommit`, JSON.stringify(octokitOpts), 
                    e.message, e.stack);
                reject(e);
            } })();
            return new Promise(pbody);
        }

        getHeadTree(branch = this.branch) { // okitty only
            if (!this.initialized) {
                return Promise.reject(new Error(MSG_INITIALIZE));
            }
            var that = this;
            var {
                octokit,
                owner,
                repo,
                branch,
            } = this;
            var pbody = (resolve, reject) => (async function() { try {
                var commit = await that.getHeadCommit(branch);
                var tree = await that.getTree(commit.tree.sha);
                resolve(tree);
            } catch(e) { reject(e);} })();
            return new Promise(pbody);
        }

        getCommit(arg) { // octokit extension
            if (!this.initialized) {
                return Promise.reject(new Error(MSG_INITIALIZE));
            }
            var {
                octokit,
                stats,
                cache,
            } = this;
            var stack = new Error().stack;
            var {
                owner,
                repo,
                branch,
                commit_sha,
            } = Object.assign(Object.assign({}, this), 
                typeof arg === 'object'
                    ? arg
                    : { commit_sha: arg }); 
            if (!owner) {
                return Promise.reject(new Error("owner is required"));
            }
            if (!repo) {
                return Promise.reject(new Error("repo is required"));
            }
            if (!commit_sha) {
                return Promise.reject(new Error("commit_sha is required"));
            }
            var octokitOpts = {
                owner,
                repo,
                commit_sha,
            };
            var key = `getCommit ${JSON.stringify(octokitOpts)}`;
            var pbody = (resolve, reject) => (async function() { try {
                var result = cache[key];
                if (!result) {
                    stats.octokitCalls++;
                    var res = await octokit.git.getCommit(octokitOpts);
                    cache[key] = result = res.data;
                }
                resolve(result);
            } catch(e) { 
                that.error(`${key} => ${e.message}`, stack);
                reject(e);
            } })();
            return new Promise(pbody);
        }

        createBlob(arg) {
            if (!this.initialized) {
                return Promise.reject(new Error(MSG_INITIALIZE));
            }
            var {
                octokit,
                cache,
                stats,
            } = this;
            var opts = typeof arg === 'string' 
                ? { content: arg } 
                : arg;
            var {
                owner,
                repo,
                content,
                encoding,
            } = Object.assign(Object.assign({}, this), opts);
            var octokitOpts = {
                owner,
                repo,
                content,
                encoding,
            }
            var key = `createBlob ${JSON.stringify(octokitOpts)}`;
            var pbody = (resolve, reject) => (async function() { try {
                var result = cache[key];
                if (!result) {
                    stats.octokitCalls++;
                    var res = await octokit.git.createBlob(octokitOpts);
                    cache[key] = result = res.data;

                }
                resolve(result);
            } catch(e) { 
                that.error(`${key} => ${e.message}`);
                reject(e);
            } })();
            return new Promise(pbody);
        }

        pathParts(path="") {
            var pathParts = path.split("/");
            var iPathLast = pathParts.length - 1;
            if (pathParts[0].length === 0) {
                pathParts = pathParts.slice(1);
            }
            return pathParts;
        }

        getPathExisting(pathOrOpts) { // okitty only
            if (!this.initialized) {
                return Promise.reject(new Error(MSG_INITIALIZE));
            }
            var that = this;
            var path = typeof pathOrOpts === 'string' 
                ? pathOrOpts
                : pathOrOpts && pathOrOpts.path;
            var {
                octokit,
                owner,
                repo,
            } = that;
            var stack = new Error().stack;
            var pbody = (resolve, reject) => (async function() { try {
                var curTree = await that.getHeadTree();
                var pathTrees = [ curTree ];
                var pathParts = that.pathParts(path);
                var iPathLast = pathParts.length - 1;
                for (var iPart=0; curTree && iPart<=iPathLast; iPart++) {
                    let p = pathParts[iPart];
                    let dir = curTree.tree;
                    let nextTree = null;
                    for (var iTree=0; iTree<dir.length; iTree++) {
                        let t = dir[iTree];
                        if (t.path === p) {
                            if (t.type === 'tree') {
                                nextTree = await that.getTree(t.sha);
                                pathTrees.push(nextTree);
                                break;
                            } else if (t.type === 'blob') {
                                var blob = await that.getBlob(t.sha);
                                pathTrees.push(blob);
                                break;
                            } else {
                                var tstr = JSON.stringify(t, null, 2);
                                throw new Error(`unknown tree ${tstr}`);
                            }
                        }
                    }
                    curTree = nextTree;
                }
                resolve(pathTrees);
            } catch(e) { 
                that.error(JSON.stringify(pathOrOpts), e.message, stack);
                reject(e);
            } })();
            return new Promise(pbody);
        }

        getPath(pathOrOpts) { // okitty only
            if (!this.initialized) {
                return Promise.reject(new Error(MSG_INITIALIZE));
            }
            var that = this;
            var path = typeof pathOrOpts === 'string' 
                ? pathOrOpts
                : pathOrOpts && pathOrOpts.path;
            var stack = new Error().stack;
            var pbody = (resolve, reject) => (async function() { try {
                var pathParts = that.pathParts(path);
                var pathTrees = await that.getPathExisting(pathOrOpts);
                if (pathTrees.length !== pathParts.length+1) {
                    var badPart = pathParts[pathTrees.length-1];
                    throw new Error(`${badPart} not found in ${path}`);
                }
                resolve(pathTrees);
            } catch(e) { 
                that.error(JSON.stringify(pathOrOpts), e.message, stack);
                reject(e);
            } })();
            return new Promise(pbody);
        }

        getBlob(arg) {
            if (!this.initialized) {
                return Promise.reject(new Error(MSG_INITIALIZE));
            }
            var that = this;
            var {
                octokit,
                cache,
                stats,
            } = that;
            var opts = Object.assign(Object.assign({}, this),
                typeof arg === 'string' ? { file_sha: arg } : arg);
            var {
                owner,
                repo,
                encoding,
                file_sha,
            } = opts;
            encoding = encoding || this.encoding;
            var octokitOpts = {
                owner,
                repo,
                file_sha,
            };
            var key = `getBlob ${JSON.stringify(octokitOpts)}`;
            var pbody = (resolve, reject) => (async function() { try {
                var cached = cache[key];
                if (!cached) {
                    stats.octokitCalls++;
                    var res = await octokit.git.getBlob(octokitOpts);
                    cache[key] = cached = res.data;
                }
                var blob = Object.assign({}, cached);
                if (encoding === "utf-8") {
                    blob.content = Base64.decode(blob.content);
                    blob.encoding = encoding;
                }
                resolve(blob);
            } catch(e) { 
                that.error(`${key} => ${e.message}`);
                reject(e);
            } })();
            return new Promise(pbody);
        }

        getTree(arg) {
            if (!this.initialized) {
                return Promise.reject(new Error(MSG_INITIALIZE));
            }
            var that = this;
            var {
                octokit,
                stats,
                cache,
            } = that;
            var argObj = typeof arg === 'string' ? { tree_sha: arg } : arg;
            var {
                owner,
                repo,
                tree_sha,
            } = Object.assign(Object.assign({}, this), argObj);
            var octokitOpts = {
                owner,
                repo,
                tree_sha,
            };
            var key = `getTree ${JSON.stringify(octokitOpts)}`;
            var pbody = (resolve, reject) => (async function() { try {
                var result = cache[key];
                if (!result) {
                    stats.octokitCalls++;
                    var res = await octokit.git.getTree(octokitOpts);
                    cache[key] = result = res.data;
                }
                resolve(result);
            } catch(e) { 
                that.error(`${key} => ${e.message}`);
                reject(e);
            } })();
            return new Promise(pbody);
        }

        createTree(arg) {
            if (!this.initialized) {
                return Promise.reject(new Error(MSG_INITIALIZE));
            }
            var that = this;
            var {
                octokit,
                cache,
                stats,
            } = that;
            var {
                owner,
                repo,
                tree,
            } = Object.assign(Object.assign({}, this), 
                arg instanceof Array ? { tree: arg } : arg);
            if (!(tree instanceof Array)) {
                return Promise.reject(new Error(
                    `expected array for tree`));
            }
            var octokitOpts = {
                owner,
                repo,
                tree: tree.map(t => Object.assign({
                    mode: t.type === 'tree' ? '040000' : '100644',
                }, t)),
            };
            var key = `createTree ${JSON.stringify(octokitOpts)}`;
            var pbody = (resolve, reject) => (async function() { try {
                var result = cache[key];
                if (!result) {
                    stats.octokitCalls++;
                    var res = await octokit.git.createTree(octokitOpts);
                    cache[key] = result = res.data;
                }
                resolve(result);
            } catch(e) { 
                that.error(`${key} => ${e.message}`);
                reject(e);
            } })();
            return new Promise(pbody);
        }

        createCommit(arg) {
            if (!this.initialized) {
                return Promise.reject(new Error(MSG_INITIALIZE));
            }
            var that = this;
            var {
                octokit,
                cache,
                stats,
            } = that;
            var {
                owner,
                repo,
                message,
                tree,
                author,
                committer,
                parents,
            } = Object.assign(Object.assign({}, this), 
                arg instanceof Array ? { tree: arg } : arg);
            if (!message) {
                return Promise.reject(new Error(`message is required`));
            }
            var pbody = (resolve,reject)=>(async function() { try {
                if (!parents) {
                    let headCommit = that.getHeadCommit();
                    parents = [headCommit.sha];
                }
                var octokitOpts = {
                    owner,
                    repo,
                    tree,
                    message,
                    author,
                    committer,
                    parents,
                };
                var res = await octokit.git.createCommit(octokitOpts);
                resolve(res.data);
            } catch(e) { 
                that.error(JSON.stringify(octokitOpts), e.message);
                reject(e);
            } })();
            return new Promise(pbody);
        }

        readFile(path) {
            if (!this.initialized) {
                return Promise.reject(new Error(MSG_INITIALIZE));
            }
            var that = this;
            var {
                octokit,
                owner,
                repo,
            } = this;
            var pbody = (resolve, reject) => (async function() { try {
                var pathObjs = await that.getPath(path);
                resolve(pathObjs && pathObjs.length
                    ? pathObjs.pop().content
                    : undefined);
            } catch(e) { reject(e);} })();
            return new Promise(pbody);
        }


        updateRef(opts) {
            var that = this;
            var {
                octokit,
                stats,
            } = that;
            var {
                owner,
                repo,
                ref,
                sha,
            } = Object.assign(Object.assign({}, that), opts);
            var pbody = (resolve, reject) => (async function() { try {
                var octokitOpts = {
                    owner,
                    repo,
                    ref,
                    sha,
                };
                stats.octokitCalls++;
                var res = await octokit.git.updateRef(octokitOpts);
                resolve(res.data);
            } catch(e) { 
                that.error(JSON.stringify(octokitOpts), e.message);
                reject(e);
            } })();
            return new Promise(pbody);
          }

        writeFile(pathOrArgs, content) {
            if (!this.initialized) {
                return Promise.reject(new Error(MSG_INITIALIZE));
            }
            var that = this;
            var {
                octokit,
                stats,
            } = that;
            var {
                owner,
                repo,
                path,
                message,
                author,
                branch,
                committer,
                parents,
            } = Object.assign(Object.assign({}, that), 
                typeof pathOrArgs === 'string'
                    ? { path: pathOrArgs }
                    : pathOrArgs);
            if (!path) {
                return Promise.reject(new Error("path is required"));
            }
            var pbody = (resolve, reject) => (async function() { try {
                var headCommit = await that.getHeadCommit();
                var pathParts = that.pathParts(path);
                var pathLen = pathParts.length;
                var pathTrees = await that.getPathExisting(path);
                var blob = await that.createBlob(content);
                var sha = blob.sha;
                var type = 'blob';
                var mode = '100644';
                var trace;
                for (var iPath=pathLen; iPath-- > 0; ){
                    let objectPath = pathParts[iPath];
                    let pathTree = pathTrees[iPath];
                    let objects = pathTree && pathTree.tree || [];
                    let found = objects.reduce((a,o)=>{
                        return o.path === objectPath
                            ? ((o.sha = sha), a+1)
                            : a;
                    }, 0);
                    if (!found) {
                        objects.push({ 
                            path: objectPath, 
                            type, 
                            mode, 
                            sha, 
                        });
                    }
                    trace = `createTree ${objectPath}`;
                    var res = await that.createTree(objects);
                    sha = res.sha;
                    type = 'tree';
                    mode = '040000';
                }
                var result = headCommit;
                if (headCommit.tree === sha) {
                    that.log(`no change commit:`, headCommit.sha);
                } else {
                    let commitArgs = {
                        owner,
                        repo,
                        path,
                        message,
                        author,
                        committer,
                        parents: [headCommit.sha],
                        tree: sha,
                    };
                    let newCommit = await that.createCommit(commitArgs);
                    that.log(`writeFile commit:${newCommit.sha}`);
                    let ref = `heads/${branch}`;
                    let res = await that.updateRef({
                        ref,
                        sha: newCommit.sha,
                    });
                    result = newCommit;
                }
                resolve(result);
            } catch(e) { 
                that.error(trace, e.message);
                reject(e);
            } })();
            return new Promise(pbody);
        }
    } 

    module.exports = exports.Okitty = Okitty;
})(typeof exports === "object" ? exports : (exports = {}));

