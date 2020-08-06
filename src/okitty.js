(function(exports) {
    const { Octokit } = require("@octokit/rest");
    const { createTokenAuth } = require("@octokit/auth-token");
    const Base64 = require("js-base64");
    
    class Okitty {
        constructor(opts = {}) {
            this.owner = opts.owner || "oyamist";
            this.repo = opts.repo || "okitty";
            this.path = opts.path || "test/test.json";
            this.indent = opts.indent || 2;
            this.branch = opts.branch || "master";
            Object.defineProperty(this, "octokit", {
                value: new Octokit({ 
                    auth: opts.auth,
                }),
            });
        }

        getHeadCommit(branch = this.branch) {
            var {
                octokit,
                owner,
                repo,
                branch,
            } = this;
            var pbody = (resolve, reject) => (async function() { try {
                var resRef = await octokit.git.getRef({
                    owner,
                    repo,
                    ref: `heads/${branch}`,
                });
                var resCommit = await octokit.git.getCommit({
                    owner,
                    repo,
                    commit_sha: resRef.data.object.sha,
                });
                resolve(resCommit.data);
            } catch(e) { reject(e);} })();
            return new Promise(pbody);
        }

        getHeadTree(branch = this.branch) {
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

        getCommit(commit_sha) {
            var {
                octokit,
                owner,
                repo,
                branch,
            } = this;
            var pbody = (resolve, reject) => (async function() { try {
                var res = await octokit.git.getCommit({
                    owner,
                    repo,
                    commit_sha,
                  });
                resolve(res.data);
            } catch(e) { reject(e);} })();
            return new Promise(pbody);
        }

        createBlob(data) {
            var {
                octokit,
                owner,
                repo,
            } = this;
            var pbody = (resolve, reject) => (async function() { try {
                var content = typeof data === 'string'
                    ? data
                    : JSON.stringify(data, null, this.indent);
                var encoding = "utf-8";
                var res = await octokit.git.createBlob({
                    owner,
                    repo,
                    content,
                    encoding,
                });
                resolve({
                    sha: res.data.sha,
                    type: "blob",
                    content,
                    encoding,
                });
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

        getTree(tree_sha) {
            var that = this;
            var {
                octokit,
                owner,
                repo,
            } = that;
            var pbody = (resolve, reject) => (async function() { try {
                var res = await octokit.git.getTree({
                    owner,
                    repo,
                    tree_sha,
                });
                resolve(res.data);
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

        save(data, path=this.path) {
            var that = this;
            var {
                octokit,
                owner,
                repo,
            } = that;
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

