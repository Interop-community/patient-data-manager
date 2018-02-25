#!/usr/bin/env bash

export PROJECT_FULL_NAME="${PROJECT_NAME}-${ACTIVE_ENV}"

export PROJECT_VERSION=$(cat ../package.json | jq --raw-output '.version')

export PROJECT_PORT=$(cat ../package.json | jq --raw-output '.config.port')

export DOCKER_PROJECT_REPO="hspconsortium"

export DOCKER_IMAGE_COORDINATES=${DOCKER_PROJECT_REPO}/${PROJECT_NAME}:${PROJECT_VERSION}

export AWS_REGION="us-west-2"

export AWS_UPDATE=$([ ! -z "$BITBUCKET_BRANCH" ] && [ "$BITBUCKET_BRANCH" == "develop" ])

export AWS_CONTAINER_MEMORY_RESERVE=$(cat ../package.json | jq --raw-output '.config.memory')

