(function(exports) {
    const { Octokit } = require("@octokit/rest");
    const { createTokenAuth } = require("@octokit/auth-token");
    const Base64 = require("js-base64");
    
    class Okitty {
        constructor(opts = {}) {
            this.owner = opts.owner;
            this.repo = opts.repo || "okitty";
            this.indent = opts.indent || 2;
            this.branch = opts.branch || "master";
            this.encoding = opts.encoding || "utf-8";
            this.stats = {
                octokitCalls: 0,
            };
            Object.defineProperty(this, "cache", {
                value: {},
            });
            Object.defineProperty(this, "octokit", {
                value: new Octokit({ 
                    auth: opts.auth,
                }),
            });
        }

        getHeadCommit(branch = this.branch) { // okitty only
            var {
                octokit,
                owner,
                repo,
                branch,
                stats,
            } = this;
            var pbody = (resolve, reject) => (async function() { try {
                var resRef = await octokit.git.getRef({
                    owner,
                    repo,
                    ref: `heads/${branch}`,
                });
                stats.octokitCalls++;
                var resCommit = await octokit.git.getCommit({
                    owner,
                    repo,
                    commit_sha: resRef.data.object.sha,
                });
                stats.octokitCalls++;
                resolve(resCommit.data);
            } catch(e) { reject(e);} })();
            return new Promise(pbody);
        }

        getHeadTree(branch = this.branch) { // okitty only
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
            var {
                octokit,
                stats,
                cache,
            } = this;
            var {
                owner,
                repo,
                branch,
                commit_sha,
            } = Object.assign({}, this, 
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
            var pbody = (resolve, reject) => (async function() { try {
                var opts = {
                    owner,
                    repo,
                    commit_sha,
                };
                var key = `getCommit ${JSON.stringify(opts)}`;
                var result = cache[key];
                if (!result) {
                    var res = await octokit.git.getCommit(opts);
                    stats.octokitCalls++;
                    cache[key] = result = res.data;
                }
                resolve(result);
            } catch(e) { reject(e);} })();
            return new Promise(pbody);
        }

        createBlob(arg) {
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
            } = Object.assign({}, this, opts);
            var pbody = (resolve, reject) => (async function() { try {
                var octokitOpts = {
                    owner,
                    repo,
                    content,
                    encoding,
                }
                var key = `createBlob ${JSON.stringify(octokitOpts)}`;
                var result = cache[key];
                if (!result) {
                    var res = await octokit.git.createBlob(octokitOpts);
                    cache[key] = result = res.data;
                    stats.octokitCalls++;

                }
                resolve(result);
            } catch(e) { reject(e);} })();
            return new Promise(pbody);
        }

        getPathTree(path="") {
            var that = this;
            var {
                octokit,
                owner,
                repo,
            } = this;
            var pbody = (resolve, reject) => (async function() { try {
                var curTree = await that.getHeadTree();
                var pathTrees = [ curTree ];
                var pathParts = path.split("/");
                if (pathParts[0].length === 0) {
                    pathParts = slice(1);
                }
                for (var iPart = 0; iPart < pathParts.length; iPart++) {
                    let p = pathParts[iPart];
                    if (curTree == null) {
                        throw new Error(`invalid path:${path}`);
                    }
                    let nextTree = null;
                    for (var iTree=0; iTree<curTree.tree.length; iTree++) {
                        let t = curTree.tree[iTree];
                        if (t.path === p) {
                            if (t.type === 'tree') {
                                nextTree = await that.getTree(t.sha);
                                pathTrees.push(nextTree);
                            } else if (t.type === 'blob') {
                                var blob = await that.getBlob(t.sha);
                                pathTrees.push(blob);
                            } else {
                                var tstr = JSON.stringify(t, null, 2);
                                throw new Error(`unknown tree ${tstr}`);
                            }
                        }
                    }
                    curTree = nextTree;
                }
                resolve(pathTrees);
            } catch(e) { reject(e);} })();
            return new Promise(pbody);
        }

        getBlob(file_sha) {
            var that = this;
            var {
                octokit,
                owner,
                repo,
            } = that;
            var pbody = (resolve, reject) => (async function() { try {
                var res = await octokit.git.getBlob({
                    owner,
                    repo,
                    file_sha,
                });
                var blob = Object.assign({}, res.data);
                blob.content = Base64.decode(blob.content);
                resolve(blob);
            } catch(e) { reject(e);} })();
            return new Promise(pbody);
        }

        getTree(arg) {
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
            } = Object.assign({}, this, argObj);
            var pbody = (resolve, reject) => (async function() { try {
                var octokitOpts = {
                    owner,
                    repo,
                    tree_sha,
                };
                var key = `getTree ${JSON.stringify(octokitOpts)}`;
                var result = cache[key];
                if (!result) {
                    var res = await octokit.git.getTree(octokitOpts);
                    cache[key] = result = res.data;
                    stats.octokitCalls++;
                }
                resolve(result);
            } catch(e) { reject(e);} })();
            return new Promise(pbody);
        }

        createTree(tree) {
            var that = this;
            var {
                octokit,
                owner,
                repo,
            } = that;
            var pbody = (resolve, reject) => (async function() { try {
                var { data } = await octokit.git.createTree({
                    owner,
                    repo,
                    tree: tree.map(t => Object.assign({
                        mode: t.type === 'tree' ? '040000' : '100644',
                    }, t)),
                });
                resolve(data);
            } catch(e) { reject(e);} })();
            return new Promise(pbody);

        }

        writeFile(data, path) {
            var that = this;
            var {
                octokit,
                owner,
                repo,
            } = that;
            if (!path) {
                return Promise.reject(new Error("path is required"));
            }
            var pbody = (resolve, reject) => (async function() { try {
                var blob = await that.createBlob(content);
                var pathParts = path.split("/");
                var pathTree = that.getPathTree(path);
                resolve(res.data);
            } catch(e) { reject(e);} })();
            return new Promise(pbody);
        }
    } 

    module.exports = exports.Okitty = Okitty;
})(typeof exports === "object" ? exports : (exports = {}));

