#!/usr/bin/env bash

set -e

[[ -z "$IMAGE_NAME" ]] && { echo "Error: IMAGE_NAME is not provided"; exit 1; } || echo "IMAGE_NAME: $IMAGE_NAME"
[[ -z "$DOCKER_PUSH" ]] && { echo "Warning: DOCKER_PUSH is not provided, defaulting to true..."; DOCKER_PUSH=true; } || echo "DOCKER_PUSH: $DOCKER_PUSH"

echo "starting ci-2-docker-image.sh..."

echo "docker build..."
echo "IMAGE_NAME: $IMAGE_NAME"
docker build -t "$IMAGE_NAME" .

if [ $DOCKER_PUSH = "true" ]
then
    [[ -z "$DOCKER_ID" ]] && { echo "Error: DOCKER_ID is not provided"; exit 1; } || echo "DOCKER_ID: $DOCKER_ID"
    [[ -z "$DOCKER_PASSWORD" ]] && { echo "Error: DOCKER_PASSWORD is not provided"; exit 1; } || echo "DOCKER_PASSWORD: $DOCKER_PASSWORD"
    echo "docker login..."
    docker login -u $DOCKER_ID -p $DOCKER_PASSWORD

    echo "docker push..."
    docker push "$IMAGE_NAME"
else
    echo "docker push skipped"
fi

echo "finished ci-2-docker-image.sh"