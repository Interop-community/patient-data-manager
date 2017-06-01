# README #

Welcome to the HSPC Patient Data Manager!  

### How do I get set up? ###

#### Build and Deploy ####
    mvn clean install
    copy target/hspc-patient-data-manager.war to a web container

#### Configuration ####
HSPC Patient Data Manager is a SMART on FHIR application.  It must be launched from a EHR simulator such as the HSPC Sandbox.  You may launch a local deployment of this application using the [HSPC Sandbox](https://sandbox.hspconsortium.org/hspc-sandbox-manager) "Custom App" Launch Scenario.

* App API: patient_data_manager
* Launch URL: http://localhost:8096/static/patient-data-manager/launch.html

### Where to go from here ###
https://healthservices.atlassian.net/wiki/display/HSPC/Healthcare+Services+Platform+Consortium