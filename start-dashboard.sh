#!/bin/zsh

if command -v node >/dev/null 2>&1; then
  node server.js
  exit $?
fi

for NODE in \
  /opt/homebrew/bin/node \
  /usr/local/bin/node \
  /Applications/Codex.app/Contents/Resources/app/bin/node
do
  if [ -x "$NODE" ]; then
    "$NODE" server.js
    exit $?
  fi
done

if command -v python3 >/dev/null 2>&1; then
  python3 dashboard_server.py
  exit $?
fi

echo "Neither Node.js nor Python 3 was found on this Mac terminal."
echo "Install Node from https://nodejs.org/ or Python from https://python.org/."
exit 1
