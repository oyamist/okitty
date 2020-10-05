(typeof describe === 'function') && describe("okitty (write)", function() {
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

    const TESTCONFIG = path.join(LOCALDIR, 'test-config.json');
    var {
        tokenRead,          // read-only personal access token
        tokenWrite: auth,   // write-capable personal access token
        owner,
        repo,
    } = fs.existsSync(TESTCONFIG)
        ? JSON.parse(fs.readFileSync(TESTCONFIG))
        : {
            // Provide credentials in local/test-okitty.json
            tokenWrite: undefined, // Github Personal Access Token
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
    const DATE_WRITEFILE = "2020-08-05T08:04:08Z";
    const AUTHOR_WRITEFILE = {
        name: "test-author",
        email: "author@noreply.com",
        date: DATE_WRITEFILE,
    };
    const COMMITTER_WRITEFILE = {
        name: "test-committer",
        email: "committer@noreply.com",
        date: DATE_WRITEFILE,
    };
    const TEXT_HELLO = "hello world\n";
    const TEXT_WRITEFILE = "hello writeFile\n";

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

    var octokit = new Octokit({auth});

    it("TESTTESTUnauthenticated write should fail", async()=>{
        var okitty = await new Okitty({
            owner: "oyamist", 
            repo: "okitty", 
            auth: tokenRead, // read-only personal access token
        }).initialize();
        var eCaught = null;
        try {
            logger.error("EXPECTED ERROR (BEGIN)");
            await okitty.createBlob(TEXT_HELLO);
        } catch(e) {
            eCaught = e;
        } finally {
            logger.error("EXPECTED ERROR (END)");
        }
        should(eCaught.message).match(/Not Found/);
    });
    it("TESTTESTcreateBlob(content) => git blob", async()=>{
        if (auth == null) {
            console.error("Test ignored (no personal access token)");
            return;
        }
        var okitty = await new Okitty({owner, repo, auth}).initialize();
        var octokitCalls = okitty.stats.octokitCalls;
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
        should(okitty.stats.octokitCalls).equal(octokitCalls+1);

        // createBlob is cached
        var res = await okitty.createBlob(content);
        should.deepEqual(res, { sha: BLOB_HELLO, url, });
        should(okitty.stats.octokitCalls).equal(octokitCalls+1);

        // Okitty supports standard Octokit option object
        var res = await okitty.createBlob({
            owner,
            repo,
            content,
            encoding,
        });
        should.deepEqual(res, { sha: BLOB_HELLO, url, });
        should(okitty.stats.octokitCalls).equal(octokitCalls+1);
    });
    it("TESTTESTcreateTree", async()=>{
        if (auth == null) {
            console.error("Test ignored (no personal access token)");
            return;
        }
        var okitty = await new Okitty({owner, repo, auth}).initialize();
        var octokitCalls = okitty.stats.octokitCalls;
        var license = Object.assign({}, LICENSE_ENTRY);
        delete license.url; // (optional)
        delete license.size; // (optional)
        var tree = [ license, README_ENTRY ];

        // Okitty single argument array
        var res = await okitty.createTree(tree);
        should(res.sha).equal(TREE_FIRST);
        should.deepEqual(res.tree, [LICENSE_ENTRY, README_ENTRY]);
        should(okitty.stats.octokitCalls).equal(octokitCalls+1);

        // createTree is cached
        var res = await okitty.createTree(tree);
        should(res.sha).equal(TREE_FIRST);
        should.deepEqual(res.tree, [LICENSE_ENTRY, README_ENTRY]);
        should(okitty.stats.octokitCalls).equal(octokitCalls+1);
                                                 
        // Standard Octokit options
        var res = await okitty.createTree({
            owner,
            repo,
            tree,
        });
        should(res.sha).equal(TREE_FIRST);
        should.deepEqual(res.tree, [LICENSE_ENTRY, README_ENTRY]);
        should(okitty.stats.octokitCalls).equal(octokitCalls+1);
    });
    it("TESTTESTwriteFile(...) writes file to path", async()=>{
        if (auth == null) {
            console.error("Test ignored (no personal access token)");
            return;
        }
        var branch = "test-branch";
        var author = AUTHOR_WRITEFILE;
        var committer = COMMITTER_WRITEFILE;
        var message = "test-message";
        var okitty = new Okitty({
            owner, 
            repo, 
            auth,
            branch,
            author,
            committer,
            message,
        })
        okitty.logLevel = 'info';
        await okitty.initialize();
        var octokitCalls = okitty.stats.octokitCalls;
        var headCommit = await okitty.getHeadCommit();

        // Relative path
        var path = "test/a/b/writefile.txt";
        var content = TEXT_WRITEFILE;
        var resWrite = await okitty.writeFile(path, content);
        var { 
            parents,
        } = resWrite;
        should(okitty.stats.octokitCalls).equal(octokitCalls+15);
        should.deepEqual(parents.map(p=>p.sha), [headCommit.sha]);
        var resRef = await okitty.getRef(`heads/${branch}`);
        should(resRef.object.sha).equal(resWrite.sha);
    });
    it("initialize() => may create branch", async()=>{
        if (auth == null) {
            console.error("Test ignored (no personal access token)");
            return;
        }
        var branch = "test-branch";
        var opts = { owner, repo, auth, branch};
        var okitty = await new Okitty(opts);
        var octokitCalls = okitty.stats.octokitCalls;
        should(okitty.initialized).equal(false);
        should(okitty.stats.octokitCalls).equal(0);
        should(await okitty.initialize()).equal(okitty);
        should(okitty.initialized).equal(true);
        should(okitty.stats.octokitCalls).equal(octokitCalls+1);
    });

})
