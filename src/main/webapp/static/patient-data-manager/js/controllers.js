'use strict';

angular.module('pdmApp.controllers', []).controller('pdmCtrl',
    ['$scope','$filter', "$uibModal", "$fhirApiServices", "$terminology", "$dynamicModelHelpers", "$resourceBuilderHelpers", "$resourceJson", "$fhirDatatypesJson",
        function ($scope, $filter, $uibModal, $fhirApiServices, $terminology, $dynamicModelHelpers, $resourceBuilderHelpers, $resourceJson, $fhirDatatypesJson ) {

            $scope.dmh = $dynamicModelHelpers;
            var rbh = $resourceBuilderHelpers;

            $scope.fhirDataTypeList = [];

            $scope.resourceTypeConfigList = [];
            $scope.selectedResourceTypeConfig = {};

            $scope.resourceTypeList = [];
            $scope.selectedResourceType = {};

            $scope.resourceInstanceList = [];
            $scope.selectedResourceInstance = {};
            $scope.selectedResourceReferences = [];

            $scope.enteredSearch = '';
            $scope.resourcePages = {};
            $scope.tableOffset = 168;
            $scope.detailOffset = 120;
            $scope.getValueSetExpansion = $terminology.getValueSetExpansion;
            $scope.dynamicFormTemplate = 'js/templates/dynamicFormInput.html';

            /**
             *
             *      UI HELPERS
             *
             **/
            $scope.setTableOffset = function(){
                $scope.tableOffset = 168 +
                    ($$("searchBar").isVisible() ? 0 : -55);
            };

            $scope.showSearchBar = function(){
                if (typeof $scope.selectedResourceTypeConfig.search !== 'undefined' && $scope.selectedResourceTypeConfig.search.searchParams) {
                    $$("searchBar").show();
                } else {
                    $$("searchBar").hide();
                }
                $scope.setTableOffset();
            };

            $scope.showPageButtons = function(){
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
                    if (resource.isSelected) {
                        obj.isSelected = (obj === resource);
                    }
                    return true;
                });

                if (resource !== undefined && resource.isSelected) {
                    $scope.selectedResourceInstance = angular.copy(resource);
                    $$('detailView').show();
                } else {
                    $scope.selectedResourceInstance = {};
                    $$('detailView').hide();
                }
                $scope.setTableOffset();
                $scope.getAvailableReferences();
            };

            $scope.unselectResource = function(resource){
                var selectedResourceList = $scope.resourceInstanceList.filter(function( obj ) {
                    if ( obj.id === resource.id )
                        return true;
                });
                selectedResourceList[0].isSelected = false;
                $scope.selectResourceInstance(selectedResourceList[0]);
            };

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

            $scope.selectResourceType = function() {
                var selectedId = $$("resGroupListId").getSelectedId();
                var result = $.grep($scope.resourceTypeList, function(e){ return e.id == selectedId; });
                $scope.selectedResourceType = $scope.resourceTypeList[result[0].index];
                $scope.selectedResourceTypeConfig = $scope.resourceTypeConfigList[result[0].index];
                rebuildResourceTable($scope.selectedResourceType.pageData);
                $scope.resourcePages.pageCount = $scope.selectedResourceType.pageCount;
                $scope.showPageButtons();
                $scope.showSearchBar();
                $scope.$apply();
            };

            $scope.requestUpdateResource = function() {
                // TODO: validate
                $fhirApiServices.updateResource($scope.smart, $scope.selectedResourceInstance, $scope.resourceTypeList, $scope.selectedResourceTypeConfig)
                    .done(function(resourceTypeList, resourceTypeConfigIndex){
                        updateView(resourceTypeList[resourceTypeConfigIndex]);
                    });
            };

            $scope.requestDeleteResource = function() {

                webix.confirm({
                    title:"Delete " + $scope.selectedResourceInstance.resourceType,
                    ok:"Yes",
                    cancel:"No",
                    type:"confirm-error",
                    text:"Are you sure you want to delete?",
                    callback:function(result){ //setting callback
                        if (result == true) {
                            $fhirApiServices.deleteResource($scope.smart, $scope.selectedResourceInstance, $scope.resourceTypeList, $scope.selectedResourceTypeConfig)
                                .done(function(resourceTypeList, resourceTypeConfigIndex){
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
                angular.forEach($scope.selectedResourceTypeConfig.references, function (reference) {
                    var relativeUrl = $scope.dmh.getDynamicModel($scope.selectedResourceInstance, reference.path);
                    if (relativeUrl !== undefined) {
                        $scope.selectedResourceReferences.push({
                            "resource": reference.resource,
                            "relativeUrl": relativeUrl
                        });
                        $scope.selectedResourceReferences.push({
                            "resource": reference.resource,
                            "relativeUrl": relativeUrl
                        });
                        $scope.selectedResourceReferences.push({
                            "resource": reference.resource,
                            "relativeUrl": relativeUrl
                        });
                        $scope.selectedResourceReferences.push({
                            "resource": reference.resource,
                            "relativeUrl": relativeUrl
                        });
                        $scope.selectedResourceReferences.push({
                            "resource": reference.resource,
                            "relativeUrl": relativeUrl
                        });
                        $scope.selectedResourceReferences.push({
                            "resource": reference.resource,
                            "relativeUrl": relativeUrl
                        });
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
                        getFhirDataTypeList: function () {
                            return $scope.fhirDataTypeList;
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
                    $fhirApiServices.createResource($scope.smart, newResource, $scope.resourceTypeList, $scope.selectedResourceTypeConfig)
                        .done(function(resourceTypeList, resourceTypeConfigIndex){
                            updateView(resourceTypeList[resourceTypeConfigIndex]);
                        });
                }, function () {
                });
            };

            $scope.requestResourceSearch = function(clearSearch) {
                if (clearSearch)
                    $scope.enteredSearch = "";
                $fhirApiServices.searchResourceInstances($scope.smart, $scope.enteredSearch, $scope.resourceTypeList, $scope.selectedResourceTypeConfig, clearSearch)
                    .done(function(resourceTypeList, resourceTypeConfigIndex){
                        updateView(resourceTypeList[resourceTypeConfigIndex]);
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
                    });
            };

            function rebuildResourceTable(resourceList) {
                $scope.resourceInstanceList = [];
                angular.forEach(resourceList, function (value) {
                    $scope.resourceInstanceList.push(value);
                });
                $scope.selectResourceInstance($scope.resourceInstanceList[0]);
                $scope.$apply();
            }

            function getAllResources(index, resourceTypeList, resourceTypeConfigList) {
                $fhirApiServices.queryResourceInstances($scope.smart, resourceTypeList, resourceTypeConfigList[index])
                    .done(function(resourceList, index){
                        updateView(resourceTypeList[index]);
                        if(++index < resourceTypeConfigList.length && resourceTypeConfigList[index].showInResourceList == true) {
                            getAllResources(index, resourceTypeList, resourceTypeConfigList);
                        }
                    });
            }

            function updateView(resourceType){
                var resourceListId = $$("resGroupListId").getIdByIndex(resourceType.index);
                var resGroup = $$("resGroupListId").getItem(resourceListId);
                if (typeof resGroup === "undefined") {
                    $$("resGroupListId").add(resourceType);
                }else{
                    resGroup.count = resourceType.count;
                    $$("resGroupListId").updateItem(resourceListId, resourceType);
                }

                if (typeof $scope.selectedResourceType.index === 'undefined' ||
                    resourceType.index === $scope.selectedResourceType.index) {
                    $scope.selectedResourceType = $scope.resourceTypeList[resourceType.index];
                    rebuildResourceTable($scope.selectedResourceType.pageData);
                    $scope.resourcePages.pageCount = $scope.selectedResourceType.pageCount;
                    $scope.resourcePages.currentPage = 1;
                    $scope.showPageButtons();
                    $scope.showSearchBar();
                }
            }

            /**
             *
             *      FHIR SERVICE OAUTH2 AUTHENTICATION & APP INITIALIZATION
             *
             **/
            FHIR.oauth2.ready(function(smart){
                $scope.smart = smart;
                $terminology.getObservationCodesValueSetId();
                $fhirApiServices.queryPatient(smart)
                    .done(function(patient){
                        $scope.patient = patient;
                    });
                $fhirDatatypesJson.success(function(dataTypes){
                    $scope.fhirDataTypeList = dataTypes;
                    $resourceJson.success(function(resources){
                        $scope.resourceTypeConfigList = resources;
                        $fhirApiServices.queryResourceInstances(smart, $scope.resourceTypeList, $scope.resourceTypeConfigList[0])
                            .done(function(resourceTypeList, resourceTypeConfigIndex){
                                updateView(resourceTypeList[resourceTypeConfigIndex]);
                                webix.ready(function() {
                                    $$("resGroupListId").select($$("resGroupListId").getFirstId());
                                    $$("searchBar").define("css", "searchBar");
                                    $$("detailView").hide();
                                    $$("searchBar").hide();
                                    $scope.showSearchBar();
                                });
                                $scope.$digest();
                                getAllResources(1, $scope.resourceTypeList, $scope.resourceTypeConfigList);
                            });
                    });
                });
            });

        }]).controller('ModalInstanceCtrl',['$scope', '$uibModalInstance', "$terminology", "$dynamicModelHelpers", "getNewResource", "getSelectedResourceTypeConfig", "getFhirDataTypeList", "isCreate", "isReadOnly",
    function ($scope, $uibModalInstance, $terminology, $dynamicModelHelpers, getNewResource, getSelectedResourceTypeConfig, getFhirDataTypeList, isCreate, isReadOnly) {

        $scope.selectedResourceInstance = getNewResource;
        $scope.selectedResourceTypeConfig = getSelectedResourceTypeConfig;
        $scope.fhirDataTypeList = getFhirDataTypeList;
        $scope.dmh = $dynamicModelHelpers;
        $scope.isModal = true;
        $scope.isCreate = isCreate;
        $scope.isReadOnly = isReadOnly;
        $scope.dynamicFormTemplate = 'js/templates/dynamicFormInput.html';

        if (isReadOnly){
            $scope.dynamicFormTemplate = 'js/templates/dynamicFormReadOnly.html';
        }

        $scope.getValueSetExpansion = function(val, min) {
            return $terminology.getValueSetExpansion(val, min);
        };

        $scope.create = function (newResource) {
            $uibModalInstance.close(newResource);
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };
    }]).controller('ReferenceTableCtrl',['$scope', "$dynamicModelHelpers", "getNewResource", "getSelectedResourceTypeConfig", "getFhirDataTypeList",
    function ($scope, $dynamicModelHelpers, getNewResource, getSelectedResourceTypeConfig, getFhirDataTypeList) {

        $scope.selectedResourceInstance = getNewResource;
        $scope.selectedResourceTypeConfig = getSelectedResourceTypeConfig;
        $scope.fhirDataTypeList = getFhirDataTypeList;
        $scope.dmh = $dynamicModelHelpers;

        $scope.getAvailableReferences = function(selectedResourceInstance){
            var resourceReferences = [];
            if ($scope.selectedResourceTypeConfig !== undefined &&
                $scope.selectedResourceTypeConfig.references !== undefined &&
                selectedResourceInstance !== undefined &&
                selectedResourceInstance !== {}) {
                angular.forEach($scope.selectedResourceTypeConfig.references, function (reference) {
                    var relativeUrl = $scope.dmh.getDynamicModel(selectedResourceInstance, reference.path);
                    if (relativeUrl !== undefined) {
                        var ref = {
                            "resource": reference.resource,
                            "relativeUrl": relativeUrl
                        };
                        resourceReferences.push(relativeUrl);
                    }
                });
            }
            return resourceReferences;
        };
    }]);