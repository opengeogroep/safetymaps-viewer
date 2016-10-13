#!/bin/bash
nodejs nodeless.js --skip-db
nodejs images2base64.js nodeless_output
cp -r api_bak/* nodeless_output/api

