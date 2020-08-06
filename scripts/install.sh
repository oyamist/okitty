#!/bin/bash
DIR=`dirname $0`
echo -e "INSTALL\t: Testing requires Github authentication."
echo -e "INSTALL\t: Enter Github personal access token and press ENTER:"
read -p "TOKEN? " TOKEN
if [ "$TOKEN" == "" ]; then 
  echo -e "INSTALL\t: A personal access token is required (FAIL)"
  exit
fi
echo -e 'INSTALL\t: Enter Github account owner:'
read -p "OWNER? " OWNER
if [ "$OWNER" == "" ]; then 
  echo -e "INSTALL\t: A Github user name is required (FAIL)"
  exit
fi
echo -e 'INSTALL\t: Enter Github repository:'
read -p "REPO? " REPO
if [ "$REPO" == "" ]; then 
  echo -e "INSTALL\t: A Github repository name is required (FAIL)"
  exit
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
