#!/usr/bin/env bash

#cat /src/.well-known/smart/manifest.json
echo $TARGET_ENV
if [ "$TARGET_ENV" = "prod" ]; then
    rm /src/.well-known/smart/manifest.json
    mv /src/.well-known/smart/manifest.prod.json /src/.well-known/smart/manifest.json
elif [ "$TARGET_ENV" = "test" ]; then
    rm /src/.well-known/smart/manifest.json
    mv /src/.well-known/smart/manifest.test.json /src/.well-known/smart/manifest.json
fi