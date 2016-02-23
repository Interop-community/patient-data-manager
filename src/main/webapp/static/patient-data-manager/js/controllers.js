'use strict';

angular.module('pdmApp.controllers', []).controller('pdmCtrl',
    ['$scope','$filter', "$uibModal", "$fhirApiServices", "$terminology", "$dynamicModelHelpers", "$resourceBuilderHelpers", "$resourceJson",
    function ($scope, $filter, $uibModal, $fhirApiServices, $terminology, $dynamicModelHelpers, $resourceBuilderHelpers, $resourceJson ) {

        $scope.dmh = $dynamicModelHelpers;
        var rbh = $resourceBuilderHelpers;

        $scope.resourceTypeConfigList = [];
        $scope.selectedResourceTypeConfig = {};

        $scope.resourceTypeList = [];
        $scope.selectedResourceType = {};

        $scope.resourceInstanceList = [];
        $scope.selectedResourceInstance = {};
        $scope.selectedResourceReferences = [];
        $scope.selectedResourceReferencesList = [];

        $scope.enteredSearch = '';
        $scope.resourcePages = {};
        $scope.tableOffset = 215;
        $scope.tableOffsetWidth = 220;
        $scope.detailOffset = 130;
        $scope.getValueSetExpansion = $terminology.getValueSetExpansion;
        $scope.dynamicFormTemplate = 'js/templates/dynamicFormInput.html';

        $scope.modalOpen = false;
        $scope.searchBar = false;
        $scope.detailView = false;
        $scope.patientInfo = true;
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
            $scope.tableOffset = 215 +
                ($scope.searchBar  ? 0 : -65);
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
        $scope.selectResourceInstance = function(resource) {
            $scope.resourceInstanceList = $scope.resourceInstanceList.filter(function( obj ) {
//                if (resource.isSelected) {
                    obj.isSelected = (obj === resource);
//                }
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
            $scope.selectedResourceType = $scope.resourceTypeList[resourceType.index];
            $scope.selectedResourceTypeConfig = $scope.resourceTypeConfigList[resourceType.index];
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

        $scope.requestUpdateResource = function() {
            // TODO: validate
            $fhirApiServices.updateResource($scope.smart, $scope.selectedResourceInstance, $scope.resourceTypeList, $scope.selectedResourceTypeConfig, $scope.notification)
                .done(function(resourceTypeList, resourceTypeConfigIndex){
                    updateView(resourceTypeList[resourceTypeConfigIndex]);
                });
        };

        $scope.json = function (){
            $scope.modalOpen = true;
            $uibModal.open({
                animation: true,
                templateUrl: 'js/templates/jsonModal.html',
                controller: 'JsonModalInstanceCtrl',
                resolve: {
                    getSettings: function () {
                        return {
                            title:"JSON -" + $scope.selectedResourceInstance.resourceType,
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
                fredWindow = window.open('fred/index.html?remote=1', 'fredwin');
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
                        resource = rbh.formatAttributesFromFhirForUI($scope.selectedResourceTypeConfig, resource, $scope.selectedResourceTypeConfig)
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
                            });
                    }
                }
            });
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
                if (reference.resource !== undefined) {
                    var relativeUrl = $scope.dmh.getDynamicModel($scope.selectedResourceInstance, reference.path);
                    if (relativeUrl !== undefined) {
                        $scope.selectedResourceReferences.push({
                            "resource": reference.resource,
                            "relativeUrl": relativeUrl
                        });
                    }
                } else if (reference.resources !== undefined) {
                    var references = $scope.dmh.getDynamicModel($scope.selectedResourceInstance, reference.listPath);
                    if (references !== undefined) {
                        angular.forEach(references, function (ref) {
                            var relativeUrl = $scope.dmh.getDynamicModel(ref, reference.subPath);
                                if (relativeUrl !== undefined) {
                                    $scope.selectedResourceReferencesList.push({
                                    "resource": ref.resource,
                                    "relativeUrl": relativeUrl
                                });
                            }
                        });
                    }
                }
            });
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
                $fhirApiServices.createResource($scope.smart, newResource, $scope.resourceTypeList, $scope.selectedResourceTypeConfig, $scope.notification)
                    .done(function(resourceTypeList, resourceTypeConfigIndex){
                        updateView(resourceTypeList[resourceTypeConfigIndex]);
                        $scope.modalOpen = false;
                    });
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
            $scope.smart = smart;
            $terminology.setUrlBase(smart);
            $terminology.getObservationCodesValueSetId("http://hl7.org/fhir/ValueSet/observation-codes");
            $fhirApiServices.queryPatient(smart)
                .done(function(patient){
                    $scope.patient = patient;
                });
            $resourceJson.getResources().done(function(resources){
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

    }]).controller('ModalInstanceCtrl',['$scope', '$uibModalInstance', "$terminology", "$dynamicModelHelpers", "getNewResource", "getSelectedResourceTypeConfig", "isCreate", "isReadOnly",
    function ($scope, $uibModalInstance, $terminology, $dynamicModelHelpers, getNewResource, getSelectedResourceTypeConfig, isCreate, isReadOnly) {

        $scope.selectedResourceInstance = getNewResource;
        $scope.selectedResourceTypeConfig = getSelectedResourceTypeConfig;
        $scope.dmh = $dynamicModelHelpers;
        $scope.isModal = true;
        $scope.isCreate = isCreate;
        $scope.isReadOnly = isReadOnly;
        $scope.dynamicFormTemplate = 'js/templates/dynamicFormInput.html';

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
    }]).controller('JsonModalInstanceCtrl',['$scope', '$uibModalInstance', 'getSettings',
    function ($scope, $uibModalInstance, getSettings) {

        $scope.title = (getSettings.title !== undefined) ? getSettings.title : "";
        $scope.json = (getSettings.json !== undefined) ? getSettings.json : "";
        $scope.ok = (getSettings.ok !== undefined) ? getSettings.ok : "Close";
        var callback = (getSettings.callback !== undefined) ? getSettings.callback : null;

        $scope.close = function () {
            $uibModalInstance.close();
            callback();
        };
    }]);