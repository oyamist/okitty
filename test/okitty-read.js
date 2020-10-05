(typeof describe === 'function') && describe("okitty (read)", function() {
    const fs = require('fs');
    const path = require('path');
    const should = require("should");
    const { logger } = require('log-instance');
    const { Octokit } = require("@octokit/rest");
    const { createTokenAuth } = require("@octokit/auth-token");
    const {
        Okitty,
    } = require("../index.js");
    const Base64 = require("js-base64");
    const JSON5 = require('json5');
    const LOCALDIR = path.join(__dirname, '..', 'local');

    // Unauthenticated tests will fail due to API throttling
    // Provide credentials in local/test-okitty.json
    const TESTCONFIG = path.join(LOCALDIR, 'test-config.json');
    var {
        tokenRead: auth,
        owner,
        repo,
    } = fs.existsSync(TESTCONFIG)
        ? JSON.parse(fs.readFileSync(TESTCONFIG))
        : {
            tokenRead: undefined, // Github Personal Access Token
            owner: "oyamist",
            repo: "okitty",
        };

    const APIPATH = `https://api.github.com/repos/${owner}/${repo}`;
    const BLOBS = `${APIPATH}/git/blobs`;
    const TREES = `${APIPATH}/git/trees`;

    const AUTHOR = date => ({
        "name": "Karl Lew",
        "email": "karl@firepick.org",
        date,
    });
    const COMMIT_OYATAG_HELLO = "4da37b59952f9c7b66312708423f24a74416de10";
    const TREE_OYATAG_HELLO = "b3af669a11f8aedcab16bf5dbd0b5f3b85bc5188";
    const MESSAGE_OYATAG_HELLO = "oyatag hello";
    const DATE_OYATAG_HELLO = "2020-08-04T08:04:08Z";
    const AUTHOR_OYATAG_HELLO = AUTHOR(DATE_OYATAG_HELLO);

    const COMMIT_TEST_HELLO = "a238d38570238ebdc1ad1b97edcc83d147875978";

    const BLOB_HELLO = "3b18e512dba79e4c8300dd08aeb37f8e728b8dad";
    const TEXT_HELLO = "hello world\n";

    const COMMIT_FIRST = "bdfd559ae91a75fc69c5a580f4da24069ff931e6";
    const TREE_FIRST = "56f0af3e3b1f281019ce997a4c7482c6d753c157";
    const MESSAGE_FIRST = "Initial commit";
    const PARENTS_FIRST = [];
    const BLOB_README = "96476f9356795dfa1f0fe3a84868bd960ab1ff7c";
    const BLOB_LICENSE = "b35e0b003161eed2cfa0f03652fcb7a652bed20f";
    const LICENSE_ENTRY = {
        path: 'LICENSE',
        mode: '100644',
        type: 'blob',
        sha: BLOB_LICENSE,
        size: 1076,
        url: `${BLOBS}/${BLOB_LICENSE}`,
    };
    const README_ENTRY = {
        path: 'README.md',
        mode: '100644',
        type: 'blob',
        sha: BLOB_README,
        size: 42,
        url: `${BLOBS}/${BLOB_README}`,
    };

    logger.logLevel = 'warn';
    this.timeout(10*1000);

    var octokit = new Octokit({auth});

    it("default ctor", done=>{
        (async function() { try {
            var okitty = new Okitty();
            var eCaught;
            should(okitty.auth).equal(undefined);
            should(okitty).properties({
                owner: undefined,
                repo: "okitty",
                branch: "master",
                indent: 2,
                stats: {
                    octokitCalls: 0,
                },
            });

            done();
        } catch (e) { done(e); } })(); 
    });
    it("custom ctor", done=>{
        (async function() { try {
            var owner = "test-owner";
            var repo = "test-repo";
            var branch = "test-branch";
            var auth = "test-auth";
            var indent = 3;
            var okitty = await new Okitty({
                owner,
                repo,
                branch,
                auth,
                indent,
            });
            should(okitty).properties({
                owner,
                repo,
                branch,
                indent,
                auth,
                stats: {
                    octokitCalls: 0,
                },
            });
            done();
        } catch (e) { done(e); } })(); 
    });
    it("initialize(...) is required", async()=>{
        var okitty = new Okitty({
            owner,
            repo,
        });

        // use without initialization throws Error
        logger.error("EXPECTED ERROR (BEGIN)");
        var eCaught;
        try {
            await okitty.getHeadCommit();
        } catch(e) { eCaught = e; };
        logger.error("EXPECTED ERROR (END)");
        should(eCaught).instanceOf(Error);
        should(eCaught.message).match(/initialize.. is required/iu);

        var res = await okitty.initialize({auth});
        should(res).equal(okitty);
        eCaught = undefined;
        try {
            var res = await okitty.getHeadCommit();
        } catch(e) { eCaught = e; };
        should(eCaught).equal(undefined);
        should(res.parents).instanceOf(Array);
    });
    it("TESTESTauthentication is required",done=>{
        (async function() { try {
            var eExpected;

            // no auth
            var auth = undefined;
            try {
                var okitty = await new Okitty({owner, repo, auth})
                    .initialize();
            } catch(e) {
                eExpected = e;
            }
            //should(eExpected).instanceOf(Error);
            //should(eExpected.message).match(/auth is required/);

            // bad Auth
            var badAuth = {};
            try {
                var opts = {owner, repo, auth: badAuth};
                var okitty = await new Okitty(opts).initialize();
            } catch(e) {
                eExpected = e;
            }
            should(eExpected).instanceOf(Error);
            should(eExpected.message)
                .match(/Token passed to createTokenAuth is not a string/);
            done();
        } catch (e) { done(e); } })(); 
    });
    it("getHeadCommit() => git head commit",done=>{
        (async function() { try {
            var okitty = await new Okitty({owner, repo, auth}).initialize();
            var octokitCalls = okitty.stats.octokitCalls;
            var headCommit = await okitty.getHeadCommit();
            should.deepEqual(Object.keys(headCommit).sort(), [
                "sha", "node_id", "url", "html_url",
                "author", "committer", "tree", "message",
                "parents", "verification",
            ].sort());
            should(okitty.stats.octokitCalls).equal(octokitCalls+2);
            done();
        } catch (e) { done(e); } })(); 
    });
    it("getHeadTree(...) => git head tree",done=>{
        (async function() { try {
            var okitty = await new Okitty({owner, repo, auth}).initialize();
            var octokitCalls = okitty.stats.octokitCalls;
            var headTree = await okitty.getHeadTree();
            should(headTree).properties([ "sha", "url", "tree", ]);
            should.deepEqual(headTree.tree.map(t=>t.path), [
                ".gitignore",
                "LICENSE", 
                "README.md", 
                "index.js",
                "package-lock.json",
                "package.json",
                "scripts",
                "src",
                "test",
            ]);
            should(okitty.stats.octokitCalls).equal(octokitCalls+3);
            done();
        } catch (e) { done(e); } })(); 
    });
    it("getCommit(sha) => git commit", done=>{
        (async function() { try {
            var commitProps = {
                sha: COMMIT_FIRST,
                message: MESSAGE_FIRST,
                parents: PARENTS_FIRST,
            };
            var committer = {
                name: 'GitHub',
                email: 'noreply@github.com',
                date: '2020-08-06T11:33:12Z',
            };
            var commit_sha = COMMIT_FIRST;
            
            // Okitty extension takes a commit sha
            var okitty = await new Okitty({owner, repo, auth}).initialize();
            var octokitCalls = okitty.stats.octokitCalls;
            var commit = await okitty.getCommit(COMMIT_FIRST);
            should(commit).properties(commitProps);
            should(commit.author).properties(["name", "email", "date"]);
            should.deepEqual(commit.committer, committer);
            should(commit.tree).properties({ sha: TREE_FIRST, });
            should(okitty.stats.octokitCalls).equal(octokitCalls+1);

            // Okitty supports Octokit standard options object
            var commit = await okitty.getCommit({owner, repo, commit_sha});
            should(commit).properties(commitProps);
            should(commit.author).properties(["name", "email", "date"]);
            should.deepEqual(commit.committer, committer);
            should(commit.tree).properties({ sha: TREE_FIRST, });
            should(okitty.stats.octokitCalls).equal(octokitCalls+1);

            // getCommit is cached
            var commit = await okitty.getCommit({owner, repo, commit_sha});
            should(commit).properties(commitProps);
            should(commit.author).properties(["name", "email", "date"]);
            should.deepEqual(commit.committer, committer);
            should(commit.tree).properties({ sha: TREE_FIRST, });
            should(okitty.stats.octokitCalls).equal(octokitCalls+1);

            done();
        } catch (e) { done(e); } })(); 
    });
    it("getTree", done=>{
        (async function() { try {
            var okitty = await new Okitty({owner, repo, auth}).initialize();
            var octokitCalls = okitty.stats.octokitCalls;
            var resProps = {
                sha: TREE_FIRST,
                url: `${TREES}/${TREE_FIRST}`,
            };

            // Okitty extension takes tree SHA
            var res = await okitty.getTree(TREE_FIRST);
            should(res).properties(resProps);
            var iTree = 0;
            should(res.tree[iTree++]).properties(LICENSE_ENTRY);
            should(res.tree[iTree++]).properties(README_ENTRY);
            should(res.tree.length).equal(iTree);
            should(okitty.stats.octokitCalls).equal(octokitCalls+1);

            // getTree is cached
            var res = await okitty.getTree(TREE_FIRST);
            should(res).properties(resProps);
            var iTree = 0;
            should(res.tree[iTree++]).properties(LICENSE_ENTRY);
            should(res.tree[iTree++]).properties(README_ENTRY);
            should(res.tree.length).equal(iTree);
            should(okitty.stats.octokitCalls).equal(octokitCalls+1);

            // Okitty supports Octokit options
            var res = await okitty.getTree({
                owner,
                repo,
                tree_sha: TREE_FIRST,
            });
            should(res).properties(resProps);
            var iTree = 0;
            should(res.tree[iTree++]).properties(LICENSE_ENTRY);
            should(res.tree[iTree++]).properties(README_ENTRY);
            should(res.tree.length).equal(iTree);
            should(okitty.stats.octokitCalls).equal(octokitCalls+1);

            done();
        } catch (e) { done(e); } })(); 
    });
    it("getBlob", done=>{
        (async function() { try {
            var okitty = await new Okitty({owner, repo, auth}).initialize();
            var octokitCalls = okitty.stats.octokitCalls;
            var blobProps = {
                sha: BLOB_HELLO,
                size: TEXT_HELLO.length,
                url: `${BLOBS}/${BLOB_HELLO}`,
                content: TEXT_HELLO,
                encoding: `utf-8`,
            };

            // Okitty supports single file_sha argument
            var res = await okitty.getBlob(BLOB_HELLO);
            should(res).properties(blobProps);
            should(okitty.stats.octokitCalls).equal(octokitCalls+1);

            // getBlob is cached
            var res = await okitty.getBlob(BLOB_HELLO);
            should(res).properties(blobProps);
            should(okitty.stats.octokitCalls).equal(octokitCalls+1);

            done();
        } catch (e) { done(e); } })(); 
    });
    it("getPathExisting(path) => [git existing trees]", done=>{
        (async function() { try {
            var okitty = await new Okitty({owner, repo, auth}).initialize();
            var octokitCalls = okitty.stats.octokitCalls;
            var headTree = await okitty.getHeadTree();
            should(okitty.stats.octokitCalls).equal(octokitCalls+3);
            var testSha = headTree.tree.reduce((a,t)=> {
                return t.path == 'test' ? t.sha : a;
            }, null);
            var testTree = await okitty.getTree(testSha);
            should(okitty.stats.octokitCalls).equal(octokitCalls+4);

            // return array of tree/blob objects for each path segment
            var res = await okitty.getPathExisting("test/a/b/c");
            should(res.length).equal(2);
            var iTree = 0;
            should.deepEqual(res[iTree++], headTree);
            should.deepEqual(res[iTree++], testTree);
            should(res.length).equal(iTree);
            should(okitty.stats.octokitCalls).equal(octokitCalls+5);
            done();
        } catch (e) { done(e); } })(); 
    });
    it("getPath(path) => [git trees]", done=>{
        (async function() { try {
            var okitty = await new Okitty({owner, repo, auth}).initialize();
            var octokitCalls = okitty.stats.octokitCalls;
            var headTree = await okitty.getHeadTree();
            should(okitty.stats.octokitCalls).equal(octokitCalls+3);
            var testSha = headTree.tree.reduce((a,t)=> {
                return t.path == 'test' ? t.sha : a;
            }, null);
            var testTree = await okitty.getTree(testSha);
            should(okitty.stats.octokitCalls).equal(octokitCalls+4);

            // return array of tree/blob objects for each path segment
            var res = await okitty.getPath("test/hello.txt");
            should(res.length).equal(3);
            var iTree = 0;
            should.deepEqual(res[iTree++], headTree);
            should.deepEqual(res[iTree++], testTree);
            should(res[iTree++]).properties({
                encoding: "utf-8",
                content: TEXT_HELLO,
            });
            should(res.length).equal(iTree);
            should(okitty.stats.octokitCalls).equal(octokitCalls+6);
            done();
        } catch (e) { done(e); } })(); 
    });
    it("getPath(path) => handles bad path", done=>{
        (async function() { try {
            var okitty = await new Okitty({owner, repo, auth}).initialize();
            var octokitCalls = okitty.stats.octokitCalls;
            var headTree = await okitty.getHeadTree();
            should(okitty.stats.octokitCalls).equal(octokitCalls+3);
            var testSha = headTree.tree.reduce((a,t)=> {
                return t.path == 'test' ? t.sha : a;
            }, null);
            var testTree = await okitty.getTree(testSha);
            should(okitty.stats.octokitCalls).equal(octokitCalls+4);

            // return array of tree/blob objects for each path segment
            var eCaught;
            try {
                console.log(`IGNORE EXPECTED ERROR BEGIN------`);
                var res = await okitty.getPath("test/hello.txtbad");
            } catch (e) {
                eCaught = e;
            }
            console.log(`IGNORE EXPECTED ERROR END------`);
            should(eCaught).instanceOf(Error);
            done();
        } catch (e) { done(e); } })(); 
    });
    it("readFile(path) => content", done=>{
        (async function() { try {
            var okitty = await new Okitty({owner, repo, auth}).initialize();

            // Relative path
            var content = await okitty.readFile("test/hello.txt");
            should(content).equal(TEXT_HELLO);

            // Absolute path
            var content = await okitty.readFile("/test/hello.txt");
            should(content).equal(TEXT_HELLO);

            // Nonsense path
            var eCaught = null;
            var content = undefined;
            try {
                console.log(`IGNORE EXPECTED ERROR BEGIN-------`);
                content = await okitty.readFile("/test/nonsense");
            } catch(e) { eCaught = e; }
            console.log(`IGNORE EXPECTED ERROR END-------`);
            should(content).equal(undefined);
            should(eCaught).instanceOf(Error);

            done();
        } catch (e) { done(e); } })(); 
    });
    it("TESTTESTgetRef(branch) => branch HEAD commit", async()=>{
        var branch = "test-branch";
        var opts = { owner, repo, auth, branch, };
        var okitty = await new Okitty(opts).initialize();
        var octokitCalls = okitty.stats.octokitCalls;
        var octokitOpts = {
            owner,
            repo,
            ref: `heads/${branch}`,
        };

        // Okitty extends ocktokit with branch string argument
        var resRef = await okitty.getRef(`heads/${branch}`);
        should(resRef).properties(["ref", "node_id", "url", "object"]);
        var octokitRes = await octokit.git.getRef(octokitOpts);
        should.deepEqual( resRef, octokitRes.data,);
        should(okitty.stats.octokitCalls).equal(octokitCalls+1);

        // Okitty supports standard Octokit options
        should.deepEqual( await okitty.getRef(octokitOpts), resRef,);
        should(okitty.stats.octokitCalls).equal(octokitCalls+2);
    });
    it("TESTTESTtbd", async()=>{
        var okitty = new Okitty();
        var eCaught;
    });

})
