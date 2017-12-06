#!/usr/bin/env bash

set -e

[[ -z "$IMAGE_NAME" ]] && { echo "Error: IMAGE_NAME is not provided"; exit 1; } || echo "IMAGE_NAME: $IMAGE_NAME"
[[ -z "$DOCKER_PUSH" ]] && { echo "Warning: DOCKER_PUSH is not provided, defaulting to true..."; DOCKER_PUSH=true; } || echo "DOCKER_PUSH: $DOCKER_PUSH"

echo "starting ci-2-docker-image.sh..."

if [ $DOCKER_PUSH = "true" ]
then
    export IMAGE_NAME=$(cat container-definitions_test.json | jq --raw-output '.[0].image')
    docker login -u $NEXUS_USR -p $NEXUS_PWD nexus.hspconsortium.org:18083
    docker build -t $IMAGE_NAME .

    echo "docker push..."
    docker push "$IMAGE_NAME"
else
    echo "docker push skipped"
fi





echo "finished ci-2-docker-image.sh"