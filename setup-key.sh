#!/bin/zsh

echo ""
echo "Massive API key setup"
echo ""
echo "Paste your NEW Massive API key here."
echo "It will be saved only to local .env."
echo "Do not paste it into chat or screenshots."
echo ""

read -r -s "KEY?Massive API key (hidden): "
echo ""

if [ ${#KEY} -lt 12 ]; then
  echo "No valid-looking key was entered. Nothing was changed."
  exit 1
fi

cat > .env <<EOF
DATA_PROVIDER=massive
MASSIVE_API_KEY=$KEY
WATCHLIST=SMH,NVDA,AMD,MU,AVGO,INTC,QQQ,SPY
HVL_VALUE=7495
EOF

echo ""
echo "Done. Your .env file is configured."
echo "Next run: zsh start-dashboard.sh"
