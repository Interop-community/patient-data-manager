#!/usr/bin/env bash

echo "running $0..."

if [ $# -eq 6 ]; then
    echo "usage: $0 {template-file} {project-name} {docker-image-coordinates} {project-port} {aws-container-memory-reserve}";
    exit 1;
fi

if ! [ -s "${1}" ]
then
  echo "${1} is empty!"
  exit 1
end
fi

set -x

echo "dynamically fix ${1}"
jq ".family=\"${2}\"" ${1} > tmp.json && mv tmp.json ${1}
jq ".containerDefinitions[0].name=\"${2}\"" ${1} > tmp.json && mv tmp.json ${1}
jq ".containerDefinitions[0].image=\"${3}\"" ${1} > tmp.json && mv tmp.json ${1}
jq ".containerDefinitions[0].portMappings[0].containerPort=(${4} | tonumber)" ${1} > tmp.json && mv tmp.json ${1}
jq ".containerDefinitions[0].memoryReservation=(${5} | tonumber)" ${1} > tmp.json && mv tmp.json ${1}

if ! [ -s "${1}" ]
then
  echo "${1} is empty!"
  exit 1
end
fi

echo "finished $0"
