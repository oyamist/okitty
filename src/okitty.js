(function(exports) {
    const { Octokit } = require("@octokit/rest");
    const { createTokenAuth } = require("@octokit/auth-token");
    const Base64 = require("js-base64");
    const { logger } = require("log-instance");
    const MSG_INITIALIZE = "initialize() is required";
    
    class Okitty {
        constructor(opts = {}) {
            (opts.logger || logger).logInstance(this);
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
            Object.defineProperty(this, "cache", {
                value: {},
            });
            this.auth = opts.auth;
        }

        async initialize(opts) {
            if (this.initialized) {
                return this;
            }
            var {
                octokit,
                owner,
                repo,
                branch,
                stats,
                verbose,
                auth,
            } = Object.assign(Object.assign({}, this), opts);
            if (!auth) {
                //throw new Error("auth is required");
            }
            this.info("creating Octokit instance");
            Object.defineProperty(this, "octokit", {
                value: new Octokit({ auth, }),
            });
            var ref = `heads/${branch}`;
            var octokitOpts = { owner, repo, ref, };
            var stack = new Error().stack;
            try {
                this.initialized = true;
                var branchExists = true;
                try {
                    var res = await this.getRef(ref);
                } catch (e) {
                    branchExists = false;
                }
                if (res) {
                    this.log(`Okitty.initialize:`, {owner, repo, branch});
                } else { // clone branch from master
                    var res = await this.getRef("heads/master");
                    this.info(`Okitty.initialize:`,
                        `branch master => ${branch}`);
                    octokitOpts.ref = `refs/heads/${branch}`;
                    octokitOpts.sha = res.data.object.sha;
                    stats.octokitCalls++;
                    var res = await octokit.git.createRef(octokitOpts);
                    this.log(`Okitty.initialize new branch:`, 
                        {owner, repo, branch});
                }
                return this;
            } catch(e) { 
                this.error(e.message, stack);
                throw e;
            } 
        }

        async getRef(optsOrRef) { try {
            if (!this.initialized) {
                throw new Error(MSG_INITIALIZE);
            }
            var {
                octokit,
                stats,
            } = this;
            var {
                owner,
                repo,
                ref,
            } = Object.assign(Object.assign({}, this), 
                typeof optsOrRef === 'string'
                    ? { ref: optsOrRef }
                    : optsOrRef);
            var octokitOpts = {
                owner,
                repo,
                ref,
            };
            var stack = new Error().stack;
            stats.octokitCalls++;
            var res = await octokit.git.getRef(octokitOpts);
            return res.data;
        } catch(e) { 
            this.error(JSON.stringify(octokitOpts), e.message, stack);
            throw e;
        }}

        // okitty only
        async getHeadCommit(optsOrBranch) { try { 
            if (!this.initialized) {
                throw new Error(MSG_INITIALIZE);
            }
            var {
                octokit,
                owner,
                repo,
                branch,
                stats,
            } = Object.assign(Object.assign({}, this), 
                typeof optsOrBranch === 'string'
                    ? { branch: optsOrBranch }
                    : optsOrBranch);
            var octokitOpts;
            var stack = new Error().stack;
            var ref = `heads/${branch}`;
            octokitOpts = {
                owner,
                repo,
                ref,
            };
            var resRef = await this.getRef(octokitOpts);
            octokitOpts = {
                owner,
                repo,
                commit_sha: resRef.object.sha,
            };
            var result = await this.getCommit(octokitOpts);
            return result;
        } catch(e) { 
            this.error(`getHeadCommit`, JSON.stringify(octokitOpts), 
                e.message, e.stack);
            throw e;
        }}

        // okitty only
        async getHeadTree(branch = this.branch) { try {
            if (!this.initialized) {
                throw new Error(MSG_INITIALIZE);
            }
            var {
                octokit,
                owner,
                repo,
                branch,
            } = this;
            var commit = await this.getHeadCommit(branch);
            var tree = await this.getTree(commit.tree.sha);
            return tree;
        } catch(e) { 
            this.error(`getHeadTree(${branch})`, e);
            throw e;
        }}

        // octokit extension
        async getCommit(arg) { try {
            if (!this.initialized) {
                throw new Error(MSG_INITIALIZE);
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
                throw new Error("owner is required");
            }
            if (!repo) {
                throw new Error("repo is required");
            }
            if (!commit_sha) {
                throw new Error("commit_sha is required");
            }
            var octokitOpts = {
                owner,
                repo,
                commit_sha,
            };
            var key = `getCommit ${JSON.stringify(octokitOpts)}`;
            var result = cache[key];
            if (!result) {
                stats.octokitCalls++;
                var res = await octokit.git.getCommit(octokitOpts);
                cache[key] = result = res.data;
            }
            return result;
        } catch(e) { 
            this.error(`${key} => ${e.message}`, stack);
            throw e;
        }}

        async createBlob(arg) { try {
            if (!this.initialized) {
                throw new Error(MSG_INITIALIZE);
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
            var result = cache[key];
            if (!result) {
                stats.octokitCalls++;
                var res = await octokit.git.createBlob(octokitOpts);
                cache[key] = result = res.data;

            }
            return result;
        } catch(e) { 
            this.error(`${key} => ${e.message}`);
            throw e;
        }}

        pathParts(path="") {
            var pathParts = path.split("/");
            var iPathLast = pathParts.length - 1;
            if (pathParts[0].length === 0) {
                pathParts = pathParts.slice(1);
            }
            return pathParts;
        }

        // okitty only
        async getPathExisting(pathOrOpts) { try {
            if (!this.initialized) {
                throw new Error(MSG_INITIALIZE);
            }
            var path = typeof pathOrOpts === 'string' 
                ? pathOrOpts
                : pathOrOpts && pathOrOpts.path;
            var {
                octokit,
                owner,
                repo,
            } = this;
            var stack = new Error().stack;
            var curTree = await this.getHeadTree();
            var pathTrees = [ curTree ];
            var pathParts = this.pathParts(path);
            var iPathLast = pathParts.length - 1;
            for (var iPart=0; curTree && iPart<=iPathLast; iPart++) {
                let p = pathParts[iPart];
                let dir = curTree.tree;
                let nextTree = null;
                for (var iTree=0; iTree<dir.length; iTree++) {
                    let t = dir[iTree];
                    if (t.path === p) {
                        if (t.type === 'tree') {
                            nextTree = await this.getTree(t.sha);
                            pathTrees.push(nextTree);
                            break;
                        } else if (t.type === 'blob') {
                            var blob = await this.getBlob(t.sha);
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
            return pathTrees;
        } catch(e) { 
            this.error(JSON.stringify(pathOrOpts), e.message, stack);
            throw e;
        }}

        // okitty only
        async getPath(pathOrOpts) { try {
            if (!this.initialized) {
                throw new Error(MSG_INITIALIZE);
            }
            var path = typeof pathOrOpts === 'string' 
                ? pathOrOpts
                : pathOrOpts && pathOrOpts.path;
            var stack = new Error().stack;
            var pathParts = this.pathParts(path);
            var pathTrees = await this.getPathExisting(pathOrOpts);
            if (pathTrees.length !== pathParts.length+1) {
                var badPart = pathParts[pathTrees.length-1];
                throw new Error(`${badPart} not found in ${path}`);
            }
            return pathTrees;
        } catch(e) { 
            this.error(JSON.stringify(pathOrOpts), e.message, stack);
            throw e;
        }}

        async getBlob(arg) { try {
            if (!this.initialized) {
                throw new Error(MSG_INITIALIZE);
            }
            var {
                octokit,
                cache,
                stats,
            } = this;
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
            return blob;
        } catch(e) { 
            this.error(`${key} => ${e.message}`);
            throw e;
        }}

        async getTree(arg) { try {
            if (!this.initialized) {
                throw new Error(MSG_INITIALIZE);
            }
            var {
                octokit,
                stats,
                cache,
            } = this;
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
            var result = cache[key];
            if (!result) {
                stats.octokitCalls++;
                var res = await octokit.git.getTree(octokitOpts);
                cache[key] = result = res.data;
            }
            return result;
        } catch(e) { 
            this.error(`${key} => ${e.message}`);
            throw e;
        }}

        async createTree(arg) { try {
            if (!this.initialized) {
                throw new Error(MSG_INITIALIZE);
            }
            var {
                octokit,
                cache,
                stats,
            } = this;
            var {
                owner,
                repo,
                tree,
            } = Object.assign(Object.assign({}, this), 
                arg instanceof Array ? { tree: arg } : arg);
            if (!(tree instanceof Array)) {
                throw new Error(`expected array for tree`);
            }
            var octokitOpts = {
                owner,
                repo,
                tree: tree.map(t => Object.assign({
                    mode: t.type === 'tree' ? '040000' : '100644',
                }, t)),
            };
            var key = `createTree ${JSON.stringify(octokitOpts)}`;
            var result = cache[key];
            if (!result) {
                stats.octokitCalls++;
                var res = await octokit.git.createTree(octokitOpts);
                cache[key] = result = res.data;
            }
            return result;
        } catch(e) {
            this.error(`${key} => ` ,e.message);
            throw e;
        }}

        async createCommit(arg) { try {
            if (!this.initialized) {
                throw new Error(MSG_INITIALIZE);
            }
            var {
                octokit,
                cache,
                stats,
            } = this;
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
                throw new Error(`message is required`);
            }
            if (!parents) {
                let headCommit = this.getHeadCommit();
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
            return res.data;
        } catch(e) { 
            this.error(JSON.stringify(octokitOpts), e.message);
            throw e;
        }}

        async readFile(pathInRepo) { try {
            if (!this.initialized) {
                throw new Error(MSG_INITIALIZE);
            }
            var {
                octokit,
                owner,
                repo,
            } = this;
            var pathObjs = await this.getPath(pathInRepo);
            return (pathObjs && pathObjs.length
                ? pathObjs.pop().content
                : undefined);
        } catch(e) { 
            this.error(`readFile(${pathInRepo}`, e);
            throw e;
        }}

        async updateRef(opts) { try {
            var {
                octokit,
                stats,
            } = this;
            var {
                owner,
                repo,
                ref,
                sha,
            } = Object.assign(Object.assign({}, this), opts);
            var octokitOpts = {
                owner,
                repo,
                ref,
                sha,
            };
            stats.octokitCalls++;
            var res = await octokit.git.updateRef(octokitOpts);
            return res.data;
        } catch(e) { 
            this.error(JSON.stringify(octokitOpts), e.message);
            throw e;
        }}

        async writeFile(pathOrArgs, content) { try {
            if (!this.initialized) {
                throw new Error(MSG_INITIALIZE);
            }
            var {
                octokit,
                stats,
            } = this;
            var {
                owner,
                repo,
                path,
                message,
                author,
                branch,
                committer,
                parents,
            } = Object.assign(Object.assign({}, this), 
                typeof pathOrArgs === 'string'
                    ? { path: pathOrArgs }
                    : pathOrArgs);
            if (!path) {
                throw new Error("path is required");
            }
            var headCommit = await this.getHeadCommit();
            var pathParts = this.pathParts(path);
            var pathLen = pathParts.length;
            var pathTrees = await this.getPathExisting(path);
            var blob = await this.createBlob(content);
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
                var res = await this.createTree(objects);
                sha = res.sha;
                type = 'tree';
                mode = '040000';
            }
            var result = headCommit;
            if (headCommit.tree === sha) {
                this.log(`no change commit:`, headCommit.sha);
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
                let newCommit = await this.createCommit(commitArgs);
                this.log(`writeFile commit:${newCommit.sha}`);
                let ref = `heads/${branch}`;
                let res = await this.updateRef({
                    ref,
                    sha: newCommit.sha,
                });
                result = newCommit;
            }
            return result;
        } catch(e) { 
            this.error(trace, e);
            throw e;
        }}
    } 

    module.exports = exports.Okitty = Okitty;
})(typeof exports === "object" ? exports : (exports = {}));

