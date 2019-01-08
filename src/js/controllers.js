'use strict';

angular.module('pdmApp.controllers', []).controller('pdmCtrl',
    ['$scope', '$rootScope','$filter', "$uibModal", "$fhirApiServices", "$terminology", "$dynamicModelHelpers", "$resourceBuilderHelpers", "$resourceJson",
    function ($scope, $rootScope, $filter, $uibModal, $fhirApiServices, $terminology, $dynamicModelHelpers, $resourceBuilderHelpers, $resourceJson) {

        $scope.writePermission = true; //Disables all interactions that involve manipulating the resources, if false

        $scope.dmh = $dynamicModelHelpers;
        var rbh = $resourceBuilderHelpers;

        $scope.resourceTypeConfigList = [];
        $scope.selectedResourceTypeConfig = {};
        $scope.selectedResourceActiveMaster = 0;
        $scope.selectedBackBoneElement = {};

        $scope.resourceTypeList = [];
        $scope.selectedResourceType = {};

        $scope.resourceInstanceList = [];
        $scope.selectedResourceInstance = {};
        $scope.selectedResourceReferences = [];
        $scope.selectedResourceReferencesList = [];

        $scope.enteredSearch = '';
        $scope.resourcePages = {};
        $scope.tableOffset = 10;
        $scope.tableOffsetWidth = 220;
        $scope.detailOffset = 130;
        $scope.getValueSetExpansion = $terminology.getValueSetExpansion;
        $scope.dynamicFormTemplate = 'js/templates/dynamicFormInput.html';

        $scope.modalOpen = false;
        $scope.searchBar = false;
        $scope.detailView = false;
        $scope.patientInfo = true;
        $scope.patient = null;
        $scope.showFRED = false;
        $scope.showViewToggle = false;
        $scope.resourceSet = 'Patient';
        $scope.viewName = 'Full';

        $scope.messages = [];

        $scope.notification = function(message){
            $scope.messages = $scope.messages.filter(function( obj ) {
                return (obj.isVisible !== false );
            });

            var finalMessage;
            if (message.text === undefined) {
                finalMessage = {
                    type: 'message',
                    text: message
                }
            } else {
                finalMessage = message;
            }
            $scope.messages.push(finalMessage);
            $scope.$apply();
        };

        /**
         *
         *      UI HELPERS
         *
         **/
        $scope.togglePatientView = function(){
            $scope.patientInfo = !$scope.patientInfo;
            $scope.viewName = $scope.resourceSet;
            if ($scope.patientInfo) {
                $scope.resourceSet = 'Patient';
            } else {
                $scope.resourceSet = 'Full';
            }
            $scope.resourceTypeList = [];
            getAllResources(0, $scope.resourceTypeList, $scope.resourceTypeConfigList);
        };

        $scope.setTableOffset = function(){
            $scope.tableOffset = 140 +
                ($scope.searchBar  ? 50 : 0);
            $scope.tableOffsetWidth = 220 +
                ($scope.detailView  ? 375 : 0);
        };

        $scope.showSearchBar = function(){
            $scope.searchBar = (typeof $scope.selectedResourceTypeConfig.search !== 'undefined'
                && $scope.selectedResourceTypeConfig.search.searchParams);
            $scope.setTableOffset();
        };

        $scope.showPageButtons = function(){
            if (typeof $scope.selectedResourceType === 'undefined') {
                return false;
            }
            return ($scope.hasLink($scope.selectedResourceType.searchObj, 'previous') ||
                $scope.hasLink($scope.selectedResourceType.searchObj, 'next'));
        };

        $scope.hasLink = function (searchResult, linkRelation) {
            var hasLink = false;
            if (searchResult === undefined) {
                return false;
            } else {
                searchResult.data.link.forEach(function(link) {
                    if (link.relation == linkRelation) {
                        hasLink = true;
                    }
                });
            }
            return hasLink;
        };

        /**
         *
         *      SELECTION AND NAVIGATION
         *
         **/
        $scope.selected = false;

        $scope.selectResourceInstance = function(resource) {
            $scope.selected = false;
            $scope.resourceInstanceList = $scope.resourceInstanceList.filter(function( obj ) {
                obj.isSelected = (obj === resource);
                return true;
            });

            if (resource !== undefined && resource.isSelected) {
                $scope.selectedResourceInstance = angular.copy(resource);
                $scope.detailView = true;
//            } else {
//                $scope.selectedResourceInstance = {};
//                $scope.detailView = false;
            }
            $scope.setTableOffset();
            $scope.getAvailableReferences();
            $scope.getAvailableBackboneElements();
            $scope.selected = true;
        };

        $scope.typeAheadSelected = function(item, attribute) {
            var path = attribute.path.substring(0, attribute.path.length - (attribute.name.length+1));
            var parent = $scope.dmh.getModelParent($scope.selectedResourceInstance, path);
            parent[0] = item;
        };

        $scope.closeDetailView = function() {
            $scope.detailView = false;
            $scope.setTableOffset();
        };

        function unselectResource(){
            angular.forEach($scope.resourceInstanceList, function (resource) {
                resource.isSelected = false;
            });
            $scope.selectedResourceInstance = {};
            $scope.closeDetailView();
        }

        $scope.arrowUpDownResourceTable = function(direction) {
            var currentIndex = $.map($scope.resourceInstanceList, function(obj, index) {
                if(obj.id == $scope.selectedResourceInstance.id) {
                    return index;
                }
            });
            if (currentIndex.length === 0)
                return;

            var newSelectedResource;
            if (direction === "up" && currentIndex[0] > 0 ) {
                newSelectedResource = $scope.resourceInstanceList[currentIndex[0] - 1];
            } else if (direction === "down" && currentIndex < $scope.resourceInstanceList.length -1) {
                newSelectedResource = $scope.resourceInstanceList[currentIndex[0] + 1];
            }

            if (newSelectedResource !== undefined) {
                newSelectedResource.isSelected = true;
                $scope.selectResourceInstance(newSelectedResource);
            }
        };

        $scope.selectResourceType = function(resourceType) {
            if (resourceType !== $scope.selectedResourceType) {
                unselectResource();
            }
            $scope.selectedResourceActiveMaster = 0;
            $scope.selectedResourceType = $scope.resourceTypeList[resourceType.index];
            $scope.selectedResourceTypeConfig = $scope.resourceTypeConfigList[resourceType.index];
            for (var i = 0; i < $scope.selectedResourceTypeConfig.displayValues.length; i++) {
                if ($scope.selectedResourceTypeConfig.displayValues[i].view === 'master') {
                    $scope.selectedResourceActiveMaster++;
                }
            }

            rebuildResourceTable($scope.selectedResourceType.pageData);
            $scope.resourcePages.pageCount = $scope.selectedResourceType.pageCount;
            $scope.showPageButtons();
            $scope.showSearchBar();
        };

        $scope.requestResourceSearch = function(clearSearch) {
            if (clearSearch)
                $scope.enteredSearch = "";
            $fhirApiServices.searchResourceInstances($scope.smart, $scope.enteredSearch, $scope.resourceTypeList, $scope.selectedResourceTypeConfig, clearSearch, $scope.notification)
            .done(function(resourceTypeList, resourceTypeConfigIndex){
                updateView(resourceTypeList[resourceTypeConfigIndex]);
            });
        };

        $scope.requestUpdateResource = function(reselect) {
            // TODO: validate
            var modalProgress = openModalProgressDialog("Updating...");
            $fhirApiServices.updateResource($scope.smart, $scope.selectedResourceInstance, $scope.resourceTypeList, $scope.selectedResourceTypeConfig, $scope.notification)
                .done(function(resourceTypeList, resourceTypeConfigIndex){
                    if (reselect) {
                        $scope.selectResourceInstance($scope.selectedResourceInstance);
                    }
                    updateView(resourceTypeList[resourceTypeConfigIndex]);
                    modalProgress.dismiss();
                }, function() {
                    modalProgress.dismiss();
                });
        };

        $scope.json = function (){
            $scope.modalOpen = true;
            $scope.selectedResourceInstance = rbh.formatAttributesFromUIForFhir($scope.selectedResourceTypeConfig, angular.copy($scope.selectedResourceInstance));
            $uibModal.open({
                animation: true,
                templateUrl: 'js/templates/jsonModal.html',
                controller: 'JsonModalInstanceCtrl',
                resolve: {
                    getSettings: function () {
                        return {
                            title:"JSON - " + $scope.selectedResourceInstance.resourceType,
                            resourceTypeConfig:$scope.selectedResourceTypeConfig,
                            ok:"Close",
                            json:$scope.selectedResourceInstance,
                            callback:function(){ //setting callback
                                $scope.modalOpen = false;
                            }
                        }
                    }
                }
            });
        };

        $scope.bundle = function (){
            $scope.modalOpen = true;
            var modalInstance = $uibModal.open({
                animation: true,
                templateUrl: 'js/templates/bundleModal.html',
                controller: 'BundleModalInstanceCtrl',
                size: 'lg',
                resolve: {
                    getSettings: function () {
                        return {
                            callback:function(){ //setting callback
                                $scope.modalOpen = false;
                            }
                        }
                    }
                }
            });

            modalInstance.result.then(function (bundle) {
                var modalProgress = openModalProgressDialog("Saving...");
                $fhirApiServices.createBundle($scope.smart, bundle, $scope.resourceTypeList, $scope.selectedResourceTypeConfig, $scope.notification).then(function () {
                    modalProgress.dismiss();
                }, function() {
                    modalProgress.dismiss();
                });
            });

        };

        $scope.export = function (){
            $fhirApiServices.exportPatientData($scope.resourceTypeList).then(function (exportedBundle) {
                $scope.modalOpen = true;
                $uibModal.open({
                    animation: true,
                    templateUrl: 'js/templates/jsonModal.html',
                    controller: 'JsonModalInstanceCtrl',
                    resolve: {
                        getSettings: function () {
                            return {
                                title:"JSON",
                                ok:"Close",
                                json:exportedBundle,
                                resourceTypeConfig:$scope.selectedResourceTypeConfig,
                                callback:function(){ //setting callback
                                    $scope.modalOpen = false;
                                }
                            }
                        }
                    }
                });
            }, function() {
            });
        };

        function openModalProgressDialog(title) {
            return $uibModal.open({
                animation: true,
                templateUrl: 'js/templates/progressModal.html',
                controller: 'ProgressModalCtrl',
                size: 'sm',
                resolve: {
                    getTitle: function () {
                        return title;
                    }
                }
            });
        }

        $rootScope.$on('error-occurred', function(){
            $scope.error();
        });

        $scope.error = function (){
            $scope.modalOpen = true;
            $uibModal.open({
                animation: true,
                templateUrl: 'js/templates/errorModal.html',
                controller: 'ErrorModalInstanceCtrl',
                resolve: {
                    getSettings: function () {
                        return {
                            callback:function(){ //setting callback
                                $scope.modalOpen = false;
                            }
                        }
                    }
                }
            });
        };

        $scope.fred = function (){
            var initialValue = angular.copy($scope.selectedResourceInstance);
            delete initialValue.meta;
            delete initialValue.isSelected;
            // Stringify & back to object converts dates to ISO format
            var json = JSON.stringify(initialValue);
            initialValue = JSON.parse(json);

            var fredWindow;
            var messageQueue = [];
            function beginEdit(){
                messageQueue.push(initialValue);
                fredWindow = window.open('fred?remote=1', 'fredwin');
                console.log();
            }

            window.onmessage = function(m){
                console.log("Message received", m)
                switch (m.data.action) {
                    case 'fred-ready':
                        fredWindow.postMessage({action: 'edit', resource: messageQueue.shift()}, '*')
                        break;
                    case 'fred-save':
                        var resource = m.data.resource
                        console.log('Edit saved in FRED', resource);
                        resource = rbh.turnStringsIntoDates(resource)
                        $scope.selectedResourceInstance = resource;
                        $scope.selectedResourceInstance.isSelected = true;
                        break;
                    case 'fred-cancel':
                        console.log('Edit canceled in FRED');
                        break;
                }
            };
            beginEdit();
        };

        $scope.confirmModalDialog = function (settings) {

            $uibModal.open({
                animation: true,
                templateUrl: 'js/templates/confirmModal.html',
                controller: 'ConfirmModalInstanceCtrl',
                resolve: {
                    getSettings: function () {
                        return settings;
                    }
                }
            });
        };

        $scope.requestDeleteResource = function() {

            $scope.modalOpen = true;
            var modalProgress = openModalProgressDialog("Deleting...");
            $scope.confirmModalDialog({
                title:"Delete " + $scope.selectedResourceInstance.resourceType,
                ok:"Yes",
                cancel:"No",
                type:"confirm-error",
                text:"Are you sure you want to delete?",
                callback:function(result){ //setting callback
                    $scope.modalOpen = false;
                    if (result == true) {
                        $fhirApiServices.deleteResource($scope.smart, $scope.selectedResourceInstance, $scope.resourceTypeList, $scope.selectedResourceTypeConfig, $scope.notification)
                            .done(function(resourceTypeList, resourceTypeConfigIndex){
                                $scope.closeDetailView();
                                updateView(resourceTypeList[resourceTypeConfigIndex]);
                                modalProgress.dismiss();
                            });
                    }
                }
            });
        };

        $scope.resourceChooser = function(resourceMeta) {
            $scope.modalOpen = true;
            var resourceTypeConfig = getResourceTypeConfig(resourceMeta.resource);
            var isParticipant = $scope.selectedResourceInstance.resourceType === "CareTeam" && resourceMeta.listPath === "participant";
            $uibModal.open({
                animation: true,
                templateUrl: 'js/templates/resourceSearchModal.html',
                controller: 'ResourceSearchController',
                resolve: {
                    getSettings: function () {
                        return {
                            resourceTypeConfig:resourceTypeConfig,
                            isParticipant:isParticipant,
                            callback:function(result){ //setting callback
                                $scope.modalOpen = false;
                                if (result !== undefined) {
                                    setOrUpdateReference(result, resourceMeta, isParticipant);
                                    $scope.requestUpdateResource(true);
                                }
                            }
                        };
                    }
                }
            });
        };

        $scope.removeReference = function(typeConfig){
            if (typeConfig.listPath) {
                var collection = $scope.dmh.getModelParent($scope.selectedResourceInstance, typeConfig.listPath)[ $scope.dmh.getModelLeaf(typeConfig.listPath)];
                if (collection !== undefined) {

                    var newCollection = [];
                    angular.forEach(collection, function (reference) {
                        var item = $scope.dmh.getDynamicModel(reference, typeConfig.subPath);

                        if (item !== typeConfig.relativeUrl) {
                            newCollection.push(reference);
                        }
                    });

                    var parent = $scope.dmh.getModelParent($scope.selectedResourceInstance, typeConfig.listPath);
                    parent[typeConfig.listPath] = newCollection;
                }
            } else {
                var removeItem = $scope.dmh.getModelParent($scope.selectedResourceInstance, typeConfig.path);
                delete removeItem[typeConfig.path];
            }
            $scope.requestUpdateResource(true);
        };

        $scope.resourceReferenceSelected = function(currentReference){
            if (currentReference !== undefined && currentReference !== null) {
                var resourceTypeAndId = currentReference.relativeUrl.split("/");
                $fhirApiServices.getResourceByReference($scope.smart, resourceTypeAndId[0], resourceTypeAndId[1])
                    .done(function(resourceResult){
                        $scope.openModalDialog('readOnly', resourceResult.data);
                    });
            }
        };

        $scope.getAvailableReferences = function(){
            $scope.selectedResourceReferences = [];
            $scope.selectedResourceReferencesList = [];
            angular.forEach($scope.selectedResourceTypeConfig.references, function (reference) {
                if (reference.path !== undefined) {
                    var relativeUrl = $scope.dmh.getDynamicModel($scope.selectedResourceInstance, reference.path);
                    if (relativeUrl !== undefined) {
                        $scope.selectedResourceReferences.push({
                            resource: reference.resource,
                            relativeUrl: relativeUrl,
                            label: reference.label,
                            linkBack: reference.path
                        });
                    } else {
                        // insert
                        $scope.selectedResourceReferences.push({
                            resource: reference.resource,
                            relativeUrl: "Not Set",
                            label: reference.label,
                            linkBack: reference.path
                        });
                    }
                } else if (reference.listPath !== undefined) {
                    var selectedResourceReferencesGroup = {groupName: reference.label, referencesList: []};
                    $scope.selectedResourceReferencesList.push(selectedResourceReferencesGroup);
                    var references = $scope.dmh.getDynamicModel($scope.selectedResourceInstance, reference.listPath);
                    if (references !== undefined) {
                        var referencesList = $scope.dmh.getModelParent($scope.selectedResourceInstance, reference.listPath)[ $scope.dmh.getModelLeaf(reference.listPath) ];
                        angular.forEach(referencesList, function (ref) {
                            var relativeUrl = $scope.dmh.getDynamicModel(ref, reference.subPath);
                            if (relativeUrl !== undefined) {
                                var resourceTypeAndId = relativeUrl.split("/");
                                selectedResourceReferencesGroup.referencesList.push({
                                resource: resourceTypeAndId[0],
                                relativeUrl: relativeUrl,
                                listPath: reference.listPath,
                                subPath: reference.subPath
                            });
                            }
                        });
                    }
                    // inserts
                    if (reference.resource !== undefined) {
                        selectedResourceReferencesGroup.referencesList.push({
                            resource: reference.resource,
                            relativeUrl: "Add",
                            linkBack: reference.path
                        });
                    } else {
                        angular.forEach(reference.resources, function (resource) {
                            selectedResourceReferencesGroup.referencesList.push({
                                resource: resource,
                                relativeUrl: "Add",
                                listPath: reference.listPath,
                                subPath: reference.subPath
                            });
                        });
                    }
                }
            });
        };

        $scope.getAvailableBackboneElements = function() {
            $scope.selectedResourceBackboneElements = [];
            $scope.selectedResourceBackboneElementsList = [];
            angular.forEach($scope.selectedResourceTypeConfig.backboneElements, function (backboneElement) {
                angular.forEach(backboneElement.elements, function (element) {
                    if (element.type === 'variable') {
                        element.variableChoices = [];
                        angular.forEach(element.dataTypes, function (subDataType) {
                            element.variableChoices.push($resourceJson.subsumeVariableDataType(element.namePrefix, subDataType, element));
                        });

                    }
                });
                $scope.selectedResourceBackboneElements.push(backboneElement);
            });
        };

        $scope.removeBackboneElement = function(index, elementName) {
            $scope.selectedResourceInstance[elementName].splice(index, 1);
        };

        $scope.openModalDialog = function (operation, resource) {
            var newResource;
            var resourceTypeConfig = $scope.selectedResourceTypeConfig;
            if (operation === 'create') {
                newResource = rbh.populateResourceTemplateDefaults($scope.selectedResourceTypeConfig, [{type: "Patient", value : $scope.patient.id}]);
            } else if (operation === 'readOnly') {
                newResource = resource;
                resourceTypeConfig = $scope.dmh.getResourceConfigByType($scope.resourceTypeConfigList, resource.resourceType);
            } else {
                newResource = angular.copy($scope.selectedResourceInstance);
                delete newResource.meta;
                delete newResource.isSelected;
                delete newResource.id;
            }

            $scope.modalOpen = true;
            var modalInstance = $uibModal.open({
                animation: true,
                templateUrl: 'js/templates/createModal.html',
                controller: 'ModalInstanceCtrl',
                size:'lg',
                resolve: {
                    getNewResource: function () {
                        return newResource;
                    },
                    getSelectedResourceTypeConfig: function () {
                        return resourceTypeConfig;
                    },
                    isCreate: function () {
                        return operation === 'create';
                    },
                    isReadOnly: function () {
                        return operation === 'readOnly';
                    }
                }
            });

            modalInstance.result.then(function (newResource) {
                var modalProgress = openModalProgressDialog("Saving...");

                $fhirApiServices.createResource($scope.smart, newResource, $scope.resourceTypeList, $scope.selectedResourceTypeConfig, $scope.notification)
                    .done(function(resourceTypeList, resourceTypeConfigIndex){
                        updateView(resourceTypeList[resourceTypeConfigIndex]);
                        $scope.modalOpen = false;
                        modalProgress.dismiss();

                    }, function() {
                        modalProgress.dismiss();
                    });
            }, function () {
                $scope.modalOpen = false;
            });
        };

        $scope.openBackboneElementModalDialog = function (backboneElement, create) {
            $scope.selectedBackBoneElement = backboneElement;
            $scope.modalOpen = true;
            var modalInstance;

            if (create) {
                modalInstance = $uibModal.open({
                    animation: true,
                    templateUrl: 'js/templates/createBackboneElementModal.html',
                    controller: 'BackboneElementModalCtrl',
                    size:'lg',
                    resolve: {
                        getBackboneElement: function () {
                            return backboneElement;
                        },
                        getSelectedResourceInstance: function () {
                            return $scope.selectedResourceInstance;
                        },
                        getSelectedResourceTypeConfig: function () {
                            return $scope.selectedResourceTypeConfig;
                        },
                        getRequestUpdateResource: function () {
                            return $scope.requestUpdateResource;
                        }
                    }
                });
            } else {
                modalInstance = $uibModal.open({
                    animation: true,
                    templateUrl: 'js/templates/detailBackboneElementModal.html',
                    controller: 'BackboneElementModalDetailCtrl',
                    size:'lg',
                    resolve: {
                        getBackboneElement: function () {
                            return backboneElement;
                        },
                        getSelectedResourceInstance: function () {
                            return $scope.selectedResourceInstance;
                        },
                        getSelectedResourceTypeConfig: function () {
                            return $scope.selectedResourceTypeConfig;
                        },
                        getRequestUpdateResource: function () {
                            return $scope.requestUpdateResource;
                        }
                    }
                });
            }

            modalInstance.result.then(function () {
                $scope.modalOpen = false;
            }, function () {
                $scope.modalOpen = false;
            });
        };

        $scope.openAttachmentContentModal = function(element) {
            $scope.modalOpen = true;
            var modalInstance = $uibModal.open({
                animation: true,
                templateUrl: 'js/templates/detailAttachmentContent.html',
                controller: 'DetailAttachmentContentModalCtrl',
                size:'lg',
                resolve: {
                    getElement: function () {
                        return element;
                    }
                }
            });

            modalInstance.result.then(function () {
                $scope.modalOpen = false;
            }, function () {
                $scope.modalOpen = false;
            });
        };

        $scope.pageResourceInstanceList = function(lastResult, direction) {
            if (direction === "nextPage") {
                $scope.resourcePages.currentPage++
            } else {
                $scope.resourcePages.currentPage--
            }
            $fhirApiServices.getNextOrPrevPage($scope.smart, lastResult, direction, $scope.selectedResourceTypeConfig)
                .done(function(resourceList, pageResult){
                    $scope.selectedResourceType.pageData = resourceList;
                    $scope.selectedResourceType.searchObj = pageResult;
                    rebuildResourceTable(resourceList);
                    $scope.$apply();
                });
        };

        function setOrUpdateReference(reference, typeConfig, isParticipant) {
            if (typeConfig.listPath) {
                var collection = $scope.dmh.getModelParent($scope.selectedResourceInstance, typeConfig.listPath)[ $scope.dmh.getModelLeaf(typeConfig.listPath)];
                if (collection === undefined) {
                    var parent = $scope.dmh.getModelParent($scope.selectedResourceInstance, typeConfig.listPath);
                    parent[typeConfig.listPath] = [];
                    collection = $scope.dmh.getModelParent($scope.selectedResourceInstance, typeConfig.listPath)[ $scope.dmh.getModelLeaf(typeConfig.listPath)];
                }
                var item = {};
                if (isParticipant) {
                    if (collection.filter(function(e) { return e.member.reference === reference.member.reference; }).length === 0) {
                        collection.push(reference);
                    }
                } else {
                    item[typeConfig.subPath] = reference.resourceType + "/" + reference.id;
                    if (collection.filter(function(e) { return e.reference === reference.resourceType + "/" + reference.id; }).length === 0) {
                        collection.push(item);
                    }

                }
            } else {
                $scope.dmh.getModelParent($scope.selectedResourceInstance, typeConfig.linkBack)[ $scope.dmh.getModelLeaf(typeConfig.linkBack) ] = reference.resourceType + "/" + reference.id;
            }
        }

        function getResourceTypeConfig(resourceType) {
            var resourceTypeConfig;
            angular.forEach($scope.resourceTypeConfigList, function (typeConfig) {
                if (typeConfig.resource === resourceType){
                    resourceTypeConfig = typeConfig;
                }
            });
            return resourceTypeConfig;
        }

        function rebuildResourceTable(resourceList) {
            while ($scope.resourceInstanceList.length > 0) {
                $scope.resourceInstanceList.pop();
            }
            angular.forEach(resourceList, function (value) {
                $scope.resourceInstanceList.push(value);
            });
        }

        function getAllResources(index, resourceTypeList, resourceTypeConfigList) {
            $fhirApiServices.queryResourceInstances($scope.smart, resourceTypeList, resourceTypeConfigList[index], $scope.notification)
                .done(function(resourceList, index){
                    updateView(resourceTypeList[index]);
                    if(++index < resourceTypeConfigList.length && resourceTypeConfigList[index].showInResourceList === $scope.resourceSet) {
                        getAllResources(index, resourceTypeList, resourceTypeConfigList);
                    }
                    $scope.$digest();
                });
        }

        function updateView(resourceType){
            if (typeof $scope.selectedResourceType.index === 'undefined' ||
                resourceType.index === $scope.selectedResourceType.index) {
                $scope.selectedResourceType = $scope.resourceTypeList[resourceType.index];
                rebuildResourceTable($scope.selectedResourceType.pageData);
                $scope.resourcePages.pageCount = $scope.selectedResourceType.pageCount;
                $scope.resourcePages.currentPage = 1;
                $scope.showPageButtons();
                $scope.showSearchBar();
                $scope.$digest();
            }
        }

        /**
         *
         *      FHIR SERVICE OAUTH2 AUTHENTICATION & APP INITIALIZATION
         *
         **/
        FHIR.oauth2.ready(function(smart){
            //First check to see if the user has writing privilege, if not, disable those features
            var scope = smart.tokenResponse.scope;
            if(!scope.includes(".write")&&!scope.includes(".*")) {
                $scope.writePermission = false;
            }

            $fhirApiServices.setFhirClient(smart);
            $scope.smart = smart;
            $terminology.setUrlBase(smart);
            //$terminology.getObservationCodesValueSetId("http://hl7.org/fhir/ValueSet/observation-codes");
            $fhirApiServices.queryPatient(smart)
                .done(function(patient){
                    $scope.patient = patient;
                });
            var schemaVersion = 1;
            $fhirApiServices.queryFhirVersion(smart)
                .done(function(version){
                    if (version === "1.0.2") {
                        schemaVersion = 1;
                        $scope.showFRED = true;
                    } else if (version === "1.4.0" || version === "1.6.0")  {
                        schemaVersion = 2;
                    } else if (version === "1.8.0")  {
                        schemaVersion = 3;
                    } else if (version === "3.0.1")  {
                        schemaVersion = 4;
                    } else if (version === "3.2.0" || version === "3.4.0")  {
                        schemaVersion = 5;
                    }
                    $resourceJson.getResources(schemaVersion).done(function(resources){
                        $scope.resourceTypeConfigList = resources;
                        $fhirApiServices.queryResourceInstances(smart, $scope.resourceTypeList, $scope.resourceTypeConfigList[0], $scope.notification)
                            .done(function(resourceTypeList, resourceTypeConfigIndex){
                                updateView(resourceTypeList[resourceTypeConfigIndex]);
                                $scope.selectResourceType(resourceTypeList[resourceTypeConfigIndex]);
                                if(1 < $scope.resourceTypeConfigList.length && $scope.resourceTypeConfigList[1].showInResourceList === $scope.resourceSet) {
                                    getAllResources(1, $scope.resourceTypeList, $scope.resourceTypeConfigList);
                                } else {
                                    $scope.$digest();
                                }
                            });
                    });
                });
        });

      // Redirects the page to a "marketing" page if not launched in an EHR/Sandbox environment
      if($scope.patient==null) {
        // window.location.href = '/index.html';
      }

    }]).controller('ModalInstanceCtrl',['$scope', '$uibModalInstance', "$terminology", "$dynamicModelHelpers", "getNewResource", "getSelectedResourceTypeConfig", "isCreate", "isReadOnly",
    function ($scope, $uibModalInstance, $terminology, $dynamicModelHelpers, getNewResource, getSelectedResourceTypeConfig, isCreate, isReadOnly) {
        $scope.selectedResourceInstance = getNewResource;
        $scope.selectedResourceTypeConfig = getSelectedResourceTypeConfig;
        $scope.dmh = $dynamicModelHelpers;
        $scope.isModal = true;
        $scope.isCreate = isCreate;
        $scope.isReadOnly = isReadOnly;
        $scope.dynamicFormTemplate = 'js/templates/dynamicFormInputModal.html';

        if (isReadOnly){
            $scope.dynamicFormTemplate = 'js/templates/dynamicFormReadOnly.html';
        }

        $scope.getValueSetExpansion = function(val, min, uri) {
            return $terminology.getValueSetExpansion(val, min, uri);
        };

        $scope.typeAheadSelected = function(item, attribute) {
            var path = attribute.path.substring(0, attribute.path.length - (attribute.name.length+1));
            var parent = $scope.dmh.getModelParent($scope.selectedResourceInstance, path);
            parent[0] = item;
        };

        $scope.create = function (newResource) {
            $uibModalInstance.close(newResource);
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };
    }]).controller('ConfirmModalInstanceCtrl',['$scope', '$uibModalInstance', 'getSettings',
        function ($scope, $uibModalInstance, getSettings) {

            $scope.title = (getSettings.title !== undefined) ? getSettings.title : "";
            $scope.ok = (getSettings.ok !== undefined) ? getSettings.ok : "Yes";
            $scope.cancel = (getSettings.cancel !== undefined) ? getSettings.cancel : "No";
            $scope.text = (getSettings.text !== undefined) ? getSettings.text : "Continue?";
            var callback = (getSettings.callback !== undefined) ? getSettings.callback : null;

            $scope.confirm = function (result) {
                $uibModalInstance.close(result);
                callback(result);
            };
    }]).controller('JsonModalInstanceCtrl',['$scope', '$uibModalInstance', '$resourceBuilderHelpers', 'getSettings',
    function ($scope, $uibModalInstance, $resourceBuilderHelpers, getSettings) {
        $scope.title = (getSettings.title !== undefined) ? getSettings.title : "";
        $scope.json = (getSettings.json !== undefined) ? getSettings.json : "";
        $scope.ok = (getSettings.ok !== undefined) ? getSettings.ok : "Close";
        $scope.resourceTypeConfig = (getSettings.resourceTypeConfig !== undefined) ? getSettings.json : "";
        $scope.rbh = $resourceBuilderHelpers;
        var callback = (getSettings.callback !== undefined) ? getSettings.callback : null;

        $scope.close = function () {
            $uibModalInstance.close();
            callback();
        };
    }]).controller('BundleModalInstanceCtrl',['$scope', '$uibModalInstance', 'getSettings',
    function ($scope, $uibModalInstance, getSettings) {

        var callback = (getSettings.callback !== undefined) ? getSettings.callback : null;

        $scope.export = function (bundle) {
            $uibModalInstance.close(bundle);
            callback();
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss();
            callback();
        };
    }]).controller("ErrorModalInstanceCtrl",
    function($scope, $uibModalInstance, errorService, getSettings){
        var callback = (getSettings.callback !== undefined) ? getSettings.callback : null;
        $scope.errorMessage = errorService.getErrorMessage();
        $scope.isFormatted = errorService.messageIsFormatted();

        $scope.close = function () {
            $uibModalInstance.close();
        };
    }).controller('ProgressModalCtrl',['$scope', '$uibModalInstance', "getTitle",
    function ($scope, $uibModalInstance, getTitle) {

        $scope.title = getTitle;

    }]).controller('BackboneElementModalCtrl', ['$scope', '$uibModalInstance', "$dynamicModelHelpers", 'getBackboneElement', 'getSelectedResourceTypeConfig', 'getSelectedResourceInstance', 'getRequestUpdateResource',
    function($scope, $uibModalInstance, $dynamicModelHelpers, getBackboneElement, getSelectedResourceTypeConfig, getSelectedResourceInstance, getRequestUpdateResource) {
        $scope.selectedBackBoneElement = getBackboneElement;
        $scope.createdBackBoneElement = {};
        $scope.selectedResourceTypeConfig = getSelectedResourceTypeConfig;
        $scope.selectedResourceInstance = getSelectedResourceInstance;
        $scope.requestUpdateResource = getRequestUpdateResource;
        $scope.dmh = $dynamicModelHelpers;

        $scope.addBackboneElement = function(createdBackBoneElement) {
            var elementKey;
            for (var i = 0; i < $scope.selectedResourceTypeConfig.backboneElements.length; i++) {
                var element = $scope.createdBackBoneElement[$scope.selectedResourceTypeConfig.backboneElements[i].type];
                if (element !== undefined) {
                    elementKey = $scope.selectedResourceTypeConfig.backboneElements[i].type;
                }
            }
            //pick up variable items
            for (var key in createdBackBoneElement) {
                if (key !== elementKey) {
                    createdBackBoneElement[elementKey][key] = createdBackBoneElement[key];
                    delete createdBackBoneElement[key];
                }
            }
            if ($scope.selectedResourceInstance[elementKey] === undefined) {
                $scope.selectedResourceInstance[elementKey] = [];
            }
            $scope.selectedResourceInstance[elementKey].push(createdBackBoneElement[elementKey]);
            $scope.requestUpdateResource();
            $uibModalInstance.close($scope.selectedResourceInstance);
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };
    }]).controller('BackboneElementModalDetailCtrl', ['$scope', '$uibModalInstance', "$dynamicModelHelpers", 'getBackboneElement', 'getSelectedResourceTypeConfig', 'getSelectedResourceInstance', 'getRequestUpdateResource',
    function($scope, $uibModalInstance, $dynamicModelHelpers, getBackboneElement, getSelectedResourceTypeConfig, getSelectedResourceInstance, getRequestUpdateResource) {
        $scope.selectedBackBoneElement = getBackboneElement;
        $scope.createdBackBoneElement = {};
        $scope.selectedResourceTypeConfig = getSelectedResourceTypeConfig;
        $scope.selectedResourceInstance = getSelectedResourceInstance;
        $scope.requestUpdateResource = getRequestUpdateResource;
        $scope.dmh = $dynamicModelHelpers;

        $scope.addBackboneElement = function(createdBackBoneElement) {
            for(var key in createdBackBoneElement){
                $scope.selectedResourceInstance[key].push(createdBackBoneElement[key]);
            }
            $scope.requestUpdateResource();
            $uibModalInstance.close($scope.selectedResourceInstance);
        };
        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };
    }]).controller("DetailAttachmentContentModalCtrl",
    function($scope, $uibModalInstance, $sce, getElement) {
        $scope.element = getElement;
        $scope.hasAttachment = false;
        $scope.hasUrl = false;
        $scope.errorText = "";
        if ($scope.element.attachment !== undefined) {
            $scope.hasAttachment = true;
            if ($scope.element.attachment.url !== undefined) {
                $scope.hasUrl = true;
                $scope.contentUrl = $sce.trustAsResourceUrl($scope.element.attachment.url);
            } else if ($scope.element.attachment.contentType !== undefined) {
                let pdf = $scope.element.attachment.data;

                fetch(`data:${$scope.element.attachment.contentType};base64,${pdf}`)
                    .then(response => response.blob())
                    .then(blob => document.querySelector("iframe").src = URL.createObjectURL(blob));
            } else {
                $scope.errorText = "Please include either a url or data and contentType."
            }
        }
        $scope.close = function () {
            $uibModalInstance.close();
        };
    }).controller('ProgressModalCtrl',['$scope', '$uibModalInstance', "getTitle",
    function ($scope, $uibModalInstance, getTitle) {

        $scope.title = getTitle;

    }]).controller("ResourceSearchController",
    function($rootScope, $scope, $fhirApiServices, $filter, $dynamicModelHelpers, $uibModalInstance, $uibModal, getSettings){

        $scope.dmh = $dynamicModelHelpers;

        $scope.resourceType = getSettings.resourceTypeConfig.resource;
        $scope.searchField =  getSettings.resourceTypeConfig.search.searchFilter.label;
        var isParticipant =  getSettings.isParticipant;
        var callback = (getSettings.callback !== undefined) ? getSettings.callback : null;
        $scope.showing = {searchloading: false};
        $scope.isModal = true;
        $scope.typeConfig = [];
        $scope.selectedResourceInstance = {};
        if (isParticipant) {
            $scope.typeConfig = {
                displayValues : [
                    {type: "coded-display-typeahead", name: "display", label: "Participant Role Code Display" , required: true, path: "role.coding.0.display", default: "", view: "master"},
                    {type: "coded-code-typeahead", name: "code", label: "Participant Role Code" , required: true, path: "participant.role.coding.0.code", default: "", view: "detail"},
                    {type: 'text', name: "system", label: "Participant Role Code System" , required: true, path: "participant.role.coding.0.system", default: "", view: "detail"},
                    {type: "text", name: "text", label: "Participant Role Text" , required: true, path: "participant.role.text", default: "", view: "detail"},
                    {type: "datetime", name: "dateTime", label: "Participant Start DateTime" , required: true, path:"participant.period.start", default: "", view: "master"},
                    {type: "datetime", name: "dateTime", label: "Participant End DateTime" , required: true, path:"participant.period.end", default: "", view: "master"}
                ]
            };
        }

        $scope.close = function () {
            $uibModalInstance.dismiss();
            callback();
        };

        function buildSortMap(resourceTypeConfig) {
            var sortMap = new Map();
            sortMap.set("id", [['_id', "asc"]]);
            sortMap.set(resourceTypeConfig.search.searchFilter.label, resourceTypeConfig.search.searchFilter.search);
            angular.forEach(resourceTypeConfig.search.sortFilters, function (filter) {
                sortMap.set(filter.label, filter.search);
            });
            return sortMap;
        }

        function buildViewValues(resourceTypeConfig) {
            var tableView = [];
            tableView.push({label: resourceTypeConfig.search.searchFilter.label, filter: resourceTypeConfig.search.searchFilter.filter});
            angular.forEach(resourceTypeConfig.search.sortFilters, function (sort) {
                tableView.push({label: sort.label, filter: sort.filter});
            });
            return tableView;
        }

        $scope.sortMap = buildSortMap(getSettings.resourceTypeConfig);
        $scope.tableView = buildViewValues(getSettings.resourceTypeConfig);
        $scope.sortSelected = $scope.searchField;
        $scope.sortReverse = false;

        $scope.resources = [];
        $scope.searchterm = "";
        var lastQueryResult;

        $scope.count = {start: 0, end: 0, total: 0};

        $rootScope.$on('set-loading', function () {
            $scope.showing.searchloading = true;
        });

        $scope.loadMore = function (direction) {
            $scope.showing.searchloading = true;
            var modalProgress = openModalProgressDialog("Searching...");

            $fhirApiServices.getNextOrPrevPageSimple(direction, lastQueryResult).then(function (resultList, queryResult) {
                lastQueryResult = queryResult;
                $scope.resources = resultList;
                $scope.showing.searchloading = false;
                $scope.count = $fhirApiServices.calculateResultSet(queryResult);
                $rootScope.$digest();

                modalProgress.dismiss();
            }, function () {
                modalProgress.dismiss();
            });
        };

        $scope.getColumn = function (index, resource) {
            var result;
            if (index === 'searchField') {
                var value;
                if (getSettings.resourceTypeConfig.search.searchFilter.name === "patient") {
                    
                }
                if (getSettings.resourceTypeConfig.search.searchFilter.path !== undefined) {
                    value = $scope.dmh.getDynamicModel(resource, getSettings.resourceTypeConfig.search.searchFilter.path);
                } else {
                    value = resource;
                }

                result = filterValue(getSettings.resourceTypeConfig.search.searchFilter, value);
            } else if (getSettings.resourceTypeConfig.search.sortFilters !== undefined && getSettings.resourceTypeConfig.search.sortFilters[index] !== undefined ) {
                var sortPath;
                if (getSettings.resourceTypeConfig.search.sortFilters[index].path !== undefined) {
                    sortPath = $scope.dmh.getDynamicModel(resource, getSettings.resourceTypeConfig.search.sortFilters[index].path);
                } else {
                    sortPath = resource;
                }
                result = filterValue(getSettings.resourceTypeConfig.search.sortFilters[index], sortPath);
            }
            return result;    
        };

        function filterValue(searchFilter, value) {
            if (value === undefined) {
                return "";
            }
            if (searchFilter !== undefined && searchFilter.filter !== undefined) {
                if (searchFilter.filter === "fhirTypeFilter") {
                    value = $filter("fhirTypeFilter")(searchFilter.pathType, value);
                } else {
                    value = $filter(searchFilter.filter)(value);
                }
            }
            return value;
        }

        $scope.select = function (i) {

            var reference = $scope.resources[i];
            if (isParticipant) {
                reference = $scope.selectedResourceInstance;
                reference.participant.member = {reference: $scope.resources[i].resourceType + "/" + $scope.resources[i].id};
                callback(reference.participant);
            } else {
                callback(reference);
            }

            $uibModalInstance.dismiss();
        };

        $scope.hasPrev = function () {
            return $fhirApiServices.hasPrev(lastQueryResult);
        };

        $scope.hasNext = function () {
            return $fhirApiServices.hasNext(lastQueryResult);
        };

        $scope.$watchGroup(["searchterm", "sortSelected", "sortReverse"], function () {
            var tokens = [];
            ($scope.searchterm || "").split(/\s/).forEach(function (t) {
                tokens.push(t.toLowerCase());
            });
            $scope.tokens = tokens;
            if ($scope.getMore !== undefined) {
                $scope.getMore();
            }
        });

        var loadCount = 0;
        var search = _.debounce(function (thisLoad) {

            var modalProgress = openModalProgressDialog("Searching...");

            $fhirApiServices.filterResources($scope.resourceType, $scope.tokens, $scope.sortMap.get($scope.sortSelected), $scope.sortReverse, 10, getSettings.resourceTypeConfig)
                .then(function (results, queryResult) {
                    lastQueryResult = queryResult;
                    if (thisLoad < loadCount) {
                        return;
                    }
                    $scope.resources = results;
                    $scope.showing.searchloading = false;
                    $scope.count = $fhirApiServices.calculateResultSet(queryResult);
                    $rootScope.$digest();

                    modalProgress.dismiss();
                }, function() {
                    modalProgress.dismiss();
                });
        }, 600);

        $scope.getMore = function () {
            $scope.showing.searchloading = true;
            search(++loadCount);
        };

        $scope.toggleSort = function (field) {
            $scope.sortReverse = ($scope.sortSelected === field ? !$scope.sortReverse : false);
            $scope.sortSelected = field;
        };

        function openModalProgressDialog(title) {
            return $uibModal.open({
                animation: true,
                templateUrl: 'js/templates/progressModal.html',
                controller: 'ProgressModalCtrl',
                size: 'sm',
                resolve: {
                    getTitle: function () {
                        return title;
                    }
                }
            });
        }


    });

