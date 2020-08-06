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
Fork `oyamist/okitty` under your own Github user account

```
git clone https://github.com/MYUSER/okitty
cd okitty
```

Configure Github authentication credentials used
for read/write access to a Github repository. 

```
./scripts/install.sh
```
