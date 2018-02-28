#!/usr/bin/env bash

docker build --build-arg TARGET_ENV=local -t patient-data-manager/node-web-app .
docker run -p 8096:8096 patient-data-manager/node-web-app