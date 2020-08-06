#!/bin/bash
DIR=`dirname $0`
echo -e "INSTALL\t: Testing requires Github authentication."
DEFAULT_OWNER=`git config --list | grep remote.origin.url | sed -re "s/.*github.com.([^\/]*).*/\1/"`
echo -e "INSTALL\t: Enter Github account owner ($DEFAULT_OWNER):"
read -p "OWNER ($DEFAULT_OWNER)? " OWNER
if [ "$OWNER" == "" ]; then 
  OWNER=$DEFAULT_OWNER
fi
echo -e "INSTALL\t: Enter Github personal access token and press ENTER:"
read -p "TOKEN? " TOKEN
if [ "$TOKEN" == "" ]; then 
  echo -e "INSTALL\t: A personal access token is required (FAIL)"
  exit
fi
DEFAULT_REPO=okitty
echo -e "INSTALL\t: Enter Github repository ($DEFAULT_REPO):"
read -p "REPO ($DEFAULT_REPO)? " REPO
if [ "$REPO" == "" ]; then 
  REPO=$DEFAULT_REPO
fi

CONFIG=$DIR/../local/test-config.json
$DIR/config.js $TOKEN $OWNER $REPO | tee $CONFIG
RC=$?; if [ "$RC" != "0" ]; then
  echo -e "INSTALL\t: failed"
  exit -1
fi
chmod 600 $CONFIG

echo -e "INSTALL\t: credentials saved to $CONFIG"

# npm install
