# Okitty
Okitty is a minimalist file CRUD wrapper for octokit, which
is the huge official client API for accessing Github.
Okitty will also let you get, update and create Github blobs,
commits, trees and references. Okitty supports octokit 
method parameters while providing convenient extensions for 
common use cases:

```
var okitty = await new Okitty({
  owner,
  repo,
  branch,
  auth,
}).initialize();

// Okitty short form
var commit = await okitty.getCommit(commit_sha); 

// Okitty supports full octokit parameters
var commit = await okitty.getCommit({
  owner, 
  repo, 
  commit_sha,
}); // octokit
  
```

Each Okitty instance caches calls so you don't have to.

### Installation (Library)
To use Okitty in an npm project:
```
npm install --save okitty
```

### Installation (Developer)
Fork `oyamist/okitty` under your own Github user account.
Then clone your fork to your computer for development:

```
git clone https://github.com/MYUSER/okitty
cd okitty
```

Configure Github authentication credentials used
for read/write access to a Github repository. 

```
./scripts/install.sh
```

### Examples
See [test/okitty.js](https://github.com/oyamist/okitty/blob/test-branch/test/okitty.js)

#### readFile
```
var options = {owner, repo, auth, branch};
var okitty = await new Okitty(options).initialize();
var content = await okitty.readFile("/test/hello.txt");
// hello world
```

#### writeFile
```
var options = {owner, repo, auth, branch};
var okitty = await new Okitty(options).initialize();
var res = await okitty.writeFile("/test/hello.txt", "goodbye");
// { 
//    ref:..., 
//    node_id:...,
//    url:...,
//    object: { sha: ... }
// }
```
