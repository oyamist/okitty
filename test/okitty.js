(typeof describe === 'function') && describe("okitty", function() {
    const fs = require('fs');
    const path = require('path');
    const winston = require('winston');
    const should = require("should");
    const { Octokit } = require("@octokit/rest");
    const { createTokenAuth } = require("@octokit/auth-token");
    const {
        Okitty,
    } = require("../index.js");
    const Base64 = require("js-base64");
    const JSON5 = require('json5');
    const LOCALDIR = path.join(__dirname, '..', 'local');
    const CONFIGPATH = path.join(LOCALDIR, 'test-config.json');
    var {
        token: auth,
        owner,
        repo,
    } = fs.existsSync(CONFIGPATH)
        ? JSON.parse(fs.readFileSync(CONFIGPATH))
        : {};
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


    this.timeout(10*1000);

    var okittyDefault = new Okitty({auth});

    it("default ctor", ()=>{
        var okitty = okittyDefault;
        should(okitty.hasOwnProperty("auth")).equal(false);
        should(okitty).properties({
            owner: undefined,
            repo: "okitty",
            branch: "master",
            indent: 2,
            stats: {
                octokitCalls: 0,
            },
        });

        // Okitty uses octokit
        should(okitty.octokit).instanceOf(Octokit);
    });
    it("custom ctor", ()=>{
        var owner = "test-owner";
        var repo = "test-repo";
        var branch = "test-branch";
        var auth = "test-auth";
        var indent = 3;
        var okitty = new Okitty({
            owner,
            repo,
            branch,
            auth,
            indent,
        });
        should(okitty.hasOwnProperty("auth")).equal(false);
        should(okitty).properties({
            owner,
            repo,
            branch,
            indent,
            stats: {
                octokitCalls: 0,
            },
        });
    });
    it("getHeadCommit() => git head commit",done=>{
        (async function() { try {
            var okitty = new Okitty({owner, repo, auth});
            var headCommit = await okitty.getHeadCommit();
            should.deepEqual(Object.keys(headCommit).sort(), [
                "sha", "node_id", "url", "html_url",
                "author", "committer", "tree", "message",
                "parents", "verification",
            ].sort());
            should(okitty.stats.octokitCalls).equal(2);
            done();
        } catch (e) { done(e); } })(); 
    });
    it("getHeadTree(...) => git head tree",done=>{
        (async function() { try {
            var okitty = new Okitty({owner, repo, auth});
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
            should(okitty.stats.octokitCalls).equal(3);
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
            var okitty = new Okitty({owner, repo, auth});
            var commit = await okitty.getCommit(COMMIT_FIRST);
            should(commit).properties(commitProps);
            should(commit.author).properties(["name", "email", "date"]);
            should.deepEqual(commit.committer, committer);
            should(commit.tree).properties({ sha: TREE_FIRST, });
            should(okitty.stats.octokitCalls).equal(1);

            // Okitty supports Octokit standard options object
            var okitty = new Okitty({auth});
            var commit = await okitty.getCommit({owner, repo, commit_sha});
            should(commit).properties(commitProps);
            should(commit.author).properties(["name", "email", "date"]);
            should.deepEqual(commit.committer, committer);
            should(commit.tree).properties({ sha: TREE_FIRST, });
            should(okitty.stats.octokitCalls).equal(1);

            // getCommit is cached
            var commit = await okitty.getCommit({owner, repo, commit_sha});
            should(commit).properties(commitProps);
            should(commit.author).properties(["name", "email", "date"]);
            should.deepEqual(commit.committer, committer);
            should(commit.tree).properties({ sha: TREE_FIRST, });
            should(okitty.stats.octokitCalls).equal(1);

            done();
        } catch (e) { done(e); } })(); 
    });
    it("TESTTESTcreateBlob(content) => git blob", done=>{
        (async function() { try {
            var okitty = new Okitty({owner, repo, auth});
            var content = TEXT_HELLO;
            var encoding = "utf-8";
            var url = [
                "https://api.github.com/repos",
                owner,
                repo,
                "git/blobs",
                BLOB_HELLO,
            ].join("/");
            var res = await okitty.createBlob(content);
            should.deepEqual(res, { sha: BLOB_HELLO, url, });
            should(okitty.stats.octokitCalls).equal(1);

            // createBlob is cached
            var res = await okitty.createBlob(content);
            should.deepEqual(res, { sha: BLOB_HELLO, url, });
            should(okitty.stats.octokitCalls).equal(1);

            // Okitty supports standard Octokit option object
            var res = await okitty.createBlob({
                owner,
                repo,
                content,
                encoding,
            });
            should.deepEqual(res, { sha: BLOB_HELLO, url, });
            should(okitty.stats.octokitCalls).equal(1);
                
            done();
        } catch (e) { done(e); } })(); 
    });
    it("getTree", done=>{
        (async function() { try {
            var okitty = new Okitty({owner, repo, auth});
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
            should(okitty.stats.octokitCalls).equal(1);

            // getTree is cached
            var res = await okitty.getTree(TREE_FIRST);
            should(res).properties(resProps);
            var iTree = 0;
            should(res.tree[iTree++]).properties(LICENSE_ENTRY);
            should(res.tree[iTree++]).properties(README_ENTRY);
            should(res.tree.length).equal(iTree);
            should(okitty.stats.octokitCalls).equal(1);

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
            should(okitty.stats.octokitCalls).equal(1);

            done();
        } catch (e) { done(e); } })(); 
    });
    it("TESTTESTgetBlob", done=>{
        (async function() { try {
            var okitty = new Okitty({owner, repo, auth});
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
            should(okitty.stats.octokitCalls).equal(1);

            // getBlob is cached
            var res = await okitty.getBlob(BLOB_HELLO);
            should(res).properties(blobProps);
            should(okitty.stats.octokitCalls).equal(1);

            done();
        } catch (e) { done(e); } })(); 
    });
    it("createTree", done=>{
        //done(); return; // TODO
        (async function() { try {
            var okitty = new Okitty({owner, repo, auth});
            var tree = [ LICENSE_ENTRY, README_ENTRY ];

            // Okitty single argument array
            var res = await okitty.createTree(tree);
            should(res.sha).equal(TREE_FIRST);
            should.deepEqual(res.tree, tree);
            should(okitty.stats.octokitCalls).equal(1);

            // createTree is cached
            var res = await okitty.createTree(tree);
            should(res.sha).equal(TREE_FIRST);
            should.deepEqual(res.tree, tree);
            should(okitty.stats.octokitCalls).equal(1);
                                                     
            // Standard Octokit options
            var res = await okitty.createTree({
                owner,
                repo,
                tree,
            });
            should(res.sha).equal(TREE_FIRST);
            should.deepEqual(res.tree, tree);
            should(okitty.stats.octokitCalls).equal(1);
                                                     
            done();
        } catch (e) { done(e); } })(); 
    });
    it("TESTTESTgetPathObjects(path) => [git trees]", done=>{
        (async function() { try {
            var okitty = new Okitty({owner, repo, auth});
            var headTree = await okitty.getHeadTree();
            should(okitty.stats.octokitCalls).equal(3);
            var testSha = headTree.tree.reduce((a,t)=> {
                return t.path == 'test' ? t.sha : a;
            }, null);
            var testTree = await okitty.getTree(testSha);
            should(okitty.stats.octokitCalls).equal(4);

            // return array of tree/blob objects for each path segment
            var res = await okitty.getPathObjects("test/hello.txt");
            should(res.length).equal(3);
            var iTree = 0;
            should.deepEqual(res[iTree++], headTree);
            should.deepEqual(res[iTree++], testTree);
            should(res[iTree++]).properties({
                encoding: "utf-8",
                content: TEXT_HELLO,
            });
            should(res.length).equal(iTree);
            should(okitty.stats.octokitCalls).equal(6);
            done();
        } catch (e) { done(e); } })(); 
    });
    it("TESTTESTreadFile(path) => blob or tree object", done=>{
        (async function() { try {
            var okitty = new Okitty({ owner, repo, auth });
            var res = await okitty.readFile('test/hello.txt');
            should(res).properties({
                content: TEXT_HELLO,
                size: TEXT_HELLO.length,
                sha: BLOB_HELLO,
                url: `${BLOBS}/${BLOB_HELLO}`,
                encoding: `utf-8`,
            });
            should(res).properties(['node_id']);
            should(okitty.stats.octokitCalls).equal(5);
            done();
        } catch (e) { done(e); } })(); 
    });

    // TODO 
    it("updateRef", done=>{
        done(); return; // TODO
        (async function() { try {
            var octokit = new Octokit({ auth });
            var sha = COMMIT_OYATAG_HELLO;

            var res = await octokit.git.updateRef({
                owner,
                repo,
                ref: "heads/master",
                sha,
              });
            should(res.data).properties({
                ref: 'refs/heads/master',
            });
            should(res.data.object).properties({
                sha,
                type: `commit`,
            });
            done();
        } catch (e) { done(e); } })(); 
    });
    it("createCommit", done=>{
        done(); return; // TODO
        (async function() { try {
            var octokit = new Octokit({ auth });
            var message = MESSAGE_OYATAG_HELLO;
            var tree = TREE_OYATAG_HELLO;
            var author = AUTHOR_OYATAG_HELLO;
            var committer = author;

            // recreating the same commit changes nothing
            var res = await octokit.git.createCommit({
                owner,
                repo,
                message,
                tree,
                author,
                committer,
                parents: [ COMMIT_TEST_HELLO ],
              });
            //console.log(`dbg createCommit`, res.data);
            should(res.data).properties({
                sha: COMMIT_OYATAG_HELLO,
                message,
            });
            should(res.data.tree).properties({
                sha: TREE_OYATAG_HELLO,
            });
            done();
        } catch (e) { done(e); } })(); 
    });
})
