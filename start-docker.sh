#!/bin/bash

docker rm -f event-proxy & true
docker build -t airlytics/event-proxy .

docker run -p 8081:8081 -p 8084:8084 \
-e CLUSTER=true \
-e LOCAL_HOST=0.0.0.0 \
-e VERSION=1.0 \
-e KAFKA_MOCK=true \
-e BUILD_NUMBER=0.0 \
-e METRICS_PORT=8084 \
-e DEBUG=true \
-e METRICS_PORT=8084 \
-e SWAGGER=true \
-e CLUSTER=true \
-e EVENT_SCHEMA_BUCKET=airlytics-event-proxy-config-dev \
--name event-proxy --rm  -v $(pwd)/logs:/usr/src/app/logs  772723803090.dkr.ecr.eu-west-1.amazonaws.com/event-proxy