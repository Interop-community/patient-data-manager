#!/usr/bin/env bash

TEMPLATE_FILE="../aws/container-definitions-${ACTIVE_ENV}.json"

../aws/build-template.sh $TEMPLATE_FILE $PROJECT_FULL_NAME $DOCKER_IMAGE_COORDINATES $PROJECT_PORT $AWS_CONTAINER_MEMORY_RESERVE

cat ${TEMPLATE_FILE}

echo $(aws ecs register-task-definition --region ${AWS_REGION} --family ${PROJECT_FULL_NAME} --cli-input-json file://${TEMPLATE_FILE})
