[
  {
    "name": "{{$PROJECT_NAME}}",
    "image": "nexus.hspconsortium.org:18083/hspc/hspc-patient-data-manager:1.0.4",
    "cpu": 0,
    "portMappings": [
      {
        "containerPort": 8096,
        "hostPort": 0,
        "protocol": "tcp"
      }
    ],
    "memoryReservation": 100,
    "essential": true
  }
]
