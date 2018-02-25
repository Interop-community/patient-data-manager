#!/usr/bin/env bash

if [ $DOCKER_PUSH = "true" ]
then
    docker login -u ${DOCKER_HUB_USERNAME} -p ${DOCKER_HUB_PASSWORD}
    docker build --build-arg ACTIVE_ENV=$ACTIVE_ENV -t $DOCKER_IMAGE_COORDINATES ..
    echo "docker push..."
    docker push "$DOCKER_IMAGE_COORDINATES"
else
    echo "docker push skipped"
fi
