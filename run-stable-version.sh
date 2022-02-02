#!/bin/bash
export LOCAL_HOST=172.31.10.197
export CLUSTER=true
nohup node app.js 8081 > log.txt 2>&1 &
