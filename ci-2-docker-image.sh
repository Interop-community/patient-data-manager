#!/usr/bin/env bash

echo "starting ci-2-docker-image.sh..."

if [ $DOCKER_PUSH = "true" ]
then
    export IMAGE_NAME=$(cat container-definitions_prod.json | jq --raw-output '.[0].image')
    docker login -u $NEXUS_USR -p $NEXUS_PWD nexus.hspconsortium.org:18083
    docker build --build-arg ACTIVE_ENV=$ACTIVE_ENV -t $IMAGE_NAME .

    echo "docker push..."
    docker push "$IMAGE_NAME"
else
    echo "docker push skipped"
fi





echo "finished ci-2-docker-image.sh"