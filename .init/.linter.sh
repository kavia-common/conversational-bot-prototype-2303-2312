#!/bin/bash
cd /home/kavia/workspace/code-generation/conversational-bot-prototype-2303-2312/frontend_reactjs
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

