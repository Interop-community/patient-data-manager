#!/usr/bin/env bash

echo "starting ci-2-docker-image.sh..."

if [ $DOCKER_PUSH = "true" ]
then
    docker login -u $NEXUS_USR -p $NEXUS_PWD nexus.hspconsortium.org:18083
    docker build -t $IMAGE_NAME .

    echo "docker push..."
    docker push "$IMAGE_NAME"
else
    echo "docker push skipped"
fi





echo "finished ci-2-docker-image.sh"