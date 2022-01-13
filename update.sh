#!/bin/bash
ACCOUNT=745222113226
export AWS_PROFILE=iol

docker build --build-arg TARGET_ENV=prod -t ${ACCOUNT}.dkr.ecr.us-east-1.amazonaws.com/interop/patient-data-manager:kube .
cliversion=$(aws --version)
[[ $cliversion = aws-cli/1* ]] && aws ecr get-login --no-include-email --region us-east-1 | source /dev/stdin
[[ $cliversion = aws-cli/2* ]] && aws ecr get-login-password | docker login --username AWS --password-stdin ${ACCOUNT}.dkr.ecr.us-east-1.amazonaws.com
docker push ${ACCOUNT}.dkr.ecr.us-east-1.amazonaws.com/interop/patient-data-manager:kube

unset AWS_PROFILE