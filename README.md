# Okitty
Simple Github applications that only require file CRUD
can use Okitty as a minimalist wrapper for octokit, which
is the huge official client API for accessing Github.
Octokit file CRUD requires a lot of calls to generate
blobs, trees, commits and references. Okitty simplifies those
calls to:

```
const Okitty = require("okitty");
var okitty = new Okitty({owner, repo, auth});
var resWrite = await okitty.writeFile("hello world", "test/hello.txt");
var { content } = await okitty.readFile("test/hello.txt");
console.log(content); // hello world
```

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

### writeFile
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
