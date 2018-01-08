#!/usr/bin/env bash

#cat /src/.well-known/smart/manifest.json
echo $ACTIVE_ENV
if [ "$ACTIVE_ENV" = "prod" ]; then
    rm /src/.well-known/smart/manifest.json
    mv /src/.well-known/smart/manifest.prod.json /src/.well-known/smart/manifest.json
elif [ "$ACTIVE_ENV" = "test" ]; then
    rm /src/.well-known/smart/manifest.json
    mv /src/.well-known/smart/manifest.test.json /src/.well-known/smart/manifest.json
fi