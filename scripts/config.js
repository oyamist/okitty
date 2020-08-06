#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const argv = process.argv;

var token = argv[2];
var owner = argv[3];
var repo = argv[4];
if (!token) {throw new Error("token is required");}
if (!owner) {throw new Error("owner is required");}
if (!repo) {throw new Error("repo is required");}
var warning = [
    "Confidential credentials: DO NOT SHARE",
].join("\n");

var json = JSON.stringify({ warning, token, owner, repo, }, null, 2);
console.log(json);
