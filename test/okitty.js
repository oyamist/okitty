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
    const GARDEN = "https://api.github.com/repos/oyamist/oya-tag-garden";
    const BLOBS = `${GARDEN}/git/blobs`;
    const TREES = `${GARDEN}/git/trees`;

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
    const TREE_TEST_HELLO = "f4eaf8fdbf3adb94a85e05a5851b0c09236b07ec";
    const DATE_TEST_HELLO = "2020-08-02T16:08:22Z";
    const AUTHOR_TEST_HELLO = AUTHOR(DATE_TEST_HELLO);

    const COMMIT_HELLO = "cb3c6d44aa99620835ef17fc77710142507252ec";
    const TREE_HELLO = "e87b8a34cd6a967febe71a57ddacd855b9c78108";
    const TREE_BLOB_HELLO = "68aba62e560c0ebc3396e8ae9335232cd93a3f60";
    const DATE_HELLO = "2020-08-02T12:12:52Z";
    const AUTHOR_HELLO = AUTHOR(DATE_HELLO);
    const MESSAGE_HELLO = "hello";
    const BLOB_HELLO = "95d09f2b10159347eece71399a7e2e907ea3df4f";
    const TEXT_HELLO = "hello world";

    const COMMIT_FIRST = "ef9381c6d777d273b5c00055539179811be903df";
    const TREE_FIRST = "b260dd3f61d604bc0e8ce0a89d74d6e128877649";
    const MESSAGE_FIRST = "first commit";
    const PARENTS_FIRST = [];
    const DATE_FIRST = "2020-08-02T10:47:22Z";
    const AUTHOR_FIRST = AUTHOR(DATE_FIRST);
    const BLOB_README = "c08a4dd9c66b74c1c25b58e91a296f9845475746";

    this.timeout(10*1000);

    var {
        token: auth,
        owner,
        repo,
    } = fs.existsSync(CONFIGPATH)
        ? JSON.parse(fs.readFileSync(CONFIGPATH))
        : {};
    function warnAuth(test) {
        console.log([
            ``,
            `NOTE: ${test} test will fail without a Github`,
            `Personal Access Token for oyamist:`,
            `     ${CONFIGPATH}`,
        ].join('\n'));
    }

    it("TESTTESTdefault ctor", ()=>{
        var okitty = new Okitty();
        should(okitty).properties({
            owner: "oyamist",
            repo: "okitty",
            path: "test/test.json",
            branch: "master",
            indent: 2,
        });
        should(okitty.hasOwnProperty("auth")).equal(false);
    });
    it("TESTTESTcustom ctor", ()=>{
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
        });
    });
    it("TESTTESTgetHeadCommit() => git head commit",done=>{
        (async function() { try {
            var okitty = new Okitty({owner, repo, auth});
            var headCommit = await okitty.getHeadCommit();
            should.deepEqual(Object.keys(headCommit).sort(), [
                "sha", "node_id", "url", "html_url",
                "author", "committer", "tree", "message",
                "parents", "verification",
            ].sort());
            done();
        } catch (e) { done(e); } })(); 
    });
    it("TESTTESTgetHeadTree(...) => git head tree",done=>{
        (async function() { try {
            var okitty = new Okitty({auth});
            var headTree = await okitty.getHeadTree();
            should(headTree).properties([ "sha", "url", "tree", ]);
            should.deepEqual(headTree.tree.map(t=>t.path), [
                "LICENSE", "README.md", 
            ]);
            done();
        } catch (e) { done(e); } })(); 
    });
    it("getCommit(sha) => git commit", done=>{
        (async function() { try {
            var okitty = new Okitty({auth});
            var commit = await okitty.getCommit(COMMIT_HELLO);
            should(commit).properties({
                sha: COMMIT_HELLO,
                message: 'hello',
            });
            should(commit.tree).properties({
                sha: TREE_HELLO,
            });
            done();
        } catch (e) { done(e); } })(); 
    });
    it("createBlob(data) => git blob", done=>{
        (async function() { try {
            var okitty = new Okitty({auth});

            var content = "hello world";
            warnAuth('createBlob');
            var blob = await okitty.createBlob(content);
            should(blob).properties([
                "sha", "type", "content", "encoding",
            ]);
            should(blob).properties({
                sha: BLOB_HELLO,
                type: "blob",
                content,
                encoding: "utf-8",
            });
                
            done();
        } catch (e) { done(e); } })(); 
    });
    it("getPathTree(path) => [git trees]", done=>{
        (async function() { try {
            var okitty = new Okitty({auth});
            var pathTree = await okitty.getPathTree("oyatag/hello.txt");
            should(pathTree.length).equal(3);
            should.deepEqual(pathTree[0].tree.map(t=>t.path), [
                "README.md", "oyatag",
            ]);
            should.deepEqual(pathTree[1].tree.map(t=>t.path), [
                "hello.txt",
            ]);
            should(pathTree[2].content).match(/hello world/);
            done();
        } catch (e) { done(e); } })(); 
    });
    it("getTree", done=>{
        (async function() { try {
            var okitty = new Okitty({owner, repo, auth});
            var tree = await okitty.getTree(TREE_HELLO);
            var {
                files,
            } = tree;
            //console.log(`dbg getTree`, tree);
            should(tree.tree[0]).properties({
                path: 'README.md',
                mode: '100644',
                type: 'blob',
                sha: BLOB_README,
                size: 17,
                url: `${BLOBS}/${BLOB_README}`,
            });
            should(tree.tree[1]).properties({
                path: 'test',
                mode: '040000',
                type: 'tree',
                sha: TREE_BLOB_HELLO,
                url: `${TREES}/${TREE_BLOB_HELLO}`,
            });
            done();
        } catch (e) { done(e); } })(); 
    });
    it("createTree", done=>{
        (async function() { try {
            var okitty = new Okitty({owner, repo, auth});
            var tree = [{
                "path": "README.md",
                "type": "blob",
                "sha": BLOB_README,
            },{
                path: 'oyatag',
                type: 'tree',
                sha: TREE_BLOB_HELLO,
            }];

            warnAuth('createTree');
            var res = await okitty.createTree(tree);
            should(res.sha).equal(TREE_OYATAG_HELLO);
            should.deepEqual(res.tree[0], {
                path: 'README.md',
                mode: '100644', // default blob mode
                type: 'blob',
                sha: BLOB_README,
                size: 17,
                url: `${GARDEN}/git/blobs/${BLOB_README}`,
            });
            should.deepEqual(res.tree[1], { 
                path: 'oyatag',
                mode: '040000',
                type: 'tree', // default tree mode
                sha: TREE_BLOB_HELLO,
                url: `${GARDEN}/git/trees/${TREE_BLOB_HELLO}`,
            });
                                                     
            done();
        } catch (e) { done(e); } })(); 
    });
    it("getBlob", done=>{
        (async function() { try {
            var okitty = new Okitty({owner, repo, auth});
            var blob = await okitty.getBlob(BLOB_HELLO);
            should(blob.content).equal(TEXT_HELLO);
            done();
        } catch (e) { done(e); } })(); 
    });

    it("updateRef", done=>{
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
