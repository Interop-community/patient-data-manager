'use strict';

angular.module('pdmApp.controllers', []).controller('pdmCtrl',
    ['$scope','$filter', "$uibModal", "$http", "$terminologyService", "$resourceJson",
    function ($scope, $filter, $uibModal, $http, $terminologyService, $resourceJson ) {

        $scope.resourceTypeConfigList = [];
        $scope.selectedResourceTypeConfig = {};

        $scope.resourceTypeList = [];
        $scope.selectedResourceType = {};

        $scope.resourceInstanceList = [];
        $scope.selectedResourceInstance = {};

        $scope.enteredSearch = '';

        $scope.tableOffset = 410;
        $scope.getValueSetExpansion = $terminologyService.getValueSetExpansion;

        /**
         *
         *      UI HELPERS
         *
         **/
        $scope.setTableOffset = function(){
            $scope.tableOffset = 410 +
                ($$("searchBar").isVisible() ? 0 : -55) +
                ($$("detailView").isVisible() ? 0 : -210) +
                ($scope.showPageButtons() ? 0 : -32);
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
         *      DYNAMIC UI BUILDER HELPERS
         *
         **/
        $scope.getDynamicModel = function(resource, path) {
            var root = $scope.getModelParent(resource, path);
            var leaf = $scope.getModelLeaf(path);

            if (typeof root !== 'undefined' && typeof leaf !== 'undefined' ) {
                return root[ leaf ];
            }
            return "";
        };

        $scope.getModelParent = function(obj,path) {
            var segs = path.split('.');
            var rootParent = obj;
            var parentStep = "";
            var root = obj;

            while (segs.length > 1) {
                var pathStep = segs.shift();
                if (typeof root[pathStep] === 'undefined') {
                    if (isNaN(pathStep)) {
                        root[pathStep] = {};
                    } else {
                        rootParent[parentStep] = [{}];
                        root = rootParent[parentStep];
                    }
                }
                parentStep = pathStep;
                rootParent = root;
                root = root[pathStep];
            }
            return root;
        };

        $scope.getModelLeaf = function(path) {
            var segs = path.split('.');
            return segs[segs.length-1];
        } ;

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
        };

        $scope.selectResourceType = function() {
            var selectedId = $$("resGroupListId").getSelectedId();
            var result = $.grep($scope.resourceTypeList, function(e){ return e.id == selectedId; });
            $scope.selectedResourceType = $scope.resourceTypeList[result[0].index];
            $scope.selectedResourceTypeConfig = $scope.resourceTypeConfigList[result[0].index];
            rebuildResourceTable($scope.selectedResourceType.pageData);
            $scope.showPageButtons();
            $scope.showSearchBar();
            $scope.$apply();
        };

        $scope.requestUpdateResource = function() {
            // TODO: validate
            updateResource();
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
                        deleteResource();
                    }
                }
            });
        };

        $scope.openCreateDialog = function (operation) {
           var newResource;
            if (operation === 'create') {
                newResource = populateResourceTemplateDefaults($scope.selectedResourceTypeConfig);
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
                    newResource: function () {
                        return newResource;
                    },
                    selectedResourceTypeConfig: function () {
                        return $scope.selectedResourceTypeConfig;
                    }
                }
            });

            modalInstance.result.then(function (newResource) {
                createResource(newResource);
            }, function () {
            });
        };

        $scope.requestResourceSearch = function(clearSearch) {
            if (clearSearch)
                $scope.enteredSearch = "";
            searchResourceInstances(clearSearch);
        };

        $scope.pageResourceInstanceList = function(lastResult, direction) {
            getNextOrPrevPage(lastResult, direction)
                .done(function(resourceList, pageResult){
                    $scope.selectedResourceType.pageData = resourceList;
                    $scope.selectedResourceType.searchObj = pageResult;
                    rebuildResourceTable(resourceList);
                });

        };

        function rebuildResourceTable(resourceList) {
            while ($scope.resourceInstanceList.length > 0) {
                $scope.resourceInstanceList.pop();
            }
            angular.forEach(resourceList, function (value) {
                $scope.resourceInstanceList.push(value);
            });
            $scope.selectResourceInstance($scope.resourceInstanceList[0]);
            $scope.$apply();
        }

        function calculatePages(searchResult) {
            var pageCnt = Math.floor(searchResult.data.total / 50);
            if ((searchResult.data.total % 50) != 0) {
                pageCnt++;
            }
            return pageCnt;
        }

        /**
         *
         *      RESOURCE BUILDER HELPERS
         *
         **/
        function formatAttributesFromUIForFhir(resource) {
            angular.forEach($scope.selectedResourceTypeConfig.displayValues, function (value) {
                var newValue = $scope.getModelParent(resource, value.path)[ $scope.getModelLeaf(value.path) ];
                if (value.type === "date") {
                    $scope.getModelParent(resource, value.path)[ $scope.getModelLeaf(value.path) ] = new Date(newValue).toISOString();
                }
                if (newValue === "" || newValue === undefined) {
                    delete $scope.getModelParent(resource, value.path)[ $scope.getModelLeaf(value.path) ];
                }
            });
            return resource;
        }

        function formatAttributesFromFhirForUI(resource, resourceTypeConfigIndex) {
            var resourceConfig = $scope.selectedResourceTypeConfig;
            if (resourceTypeConfigIndex !== undefined){
                resourceConfig = $scope.resourceTypeConfigList[resourceTypeConfigIndex];
            }
            angular.forEach(resourceConfig.displayValues, function (value) {
                var newValue = $scope.getModelParent(resource, value.path)[ $scope.getModelLeaf(value.path) ];
                if (typeof value === 'undefined') {

                }
                if (value.type === "date" && typeof newValue !== 'undefined') {
                    var newDate = new Date(newValue);
                    if (newValue.lastIndexOf("T00:00:00.000Z") != -1) {
                        newDate.setHours(0,0,0,0);
                    }
                    $scope.getModelParent(resource, value.path)[ $scope.getModelLeaf(value.path) ] = newDate;
                }
            });
            return resource;
        }

        function buildResourceObjectFromConfig(selectedResourceTypeConfig) {
            var template = {
                resourceType: selectedResourceTypeConfig.resource
            };
            angular.forEach(selectedResourceTypeConfig.displayValues, function (value) {
                $scope.getModelParent(template, value.path)[ $scope.getModelLeaf(value.path) ] = "";
            });
            angular.forEach(selectedResourceTypeConfig.references, function (value) {
                $scope.getModelParent(template, value.path)[ $scope.getModelLeaf(value.path) ] = "";
            });
            return template;
        }

        function populateResourceTemplateDefaults(selectedResourceTypeConfig) {
            var newResource = buildResourceObjectFromConfig(selectedResourceTypeConfig);

            angular.forEach($scope.selectedResourceTypeConfig.displayValues, function (value) {
                var newValue = value.default;
                if (value.type === "date") {
                    newValue = new Date();
                    newValue.setSeconds(0,0)
                }
                $scope.getModelParent(newResource, value.path)[ $scope.getModelLeaf(value.path) ] = newValue;
            });
            newResource = addReferenceValues(newResource, "Patient", $scope.patient.id);
            return newResource;
        }

        function addReferenceValues(resource, type, refValue) {
            angular.forEach($scope.selectedResourceTypeConfig.references, function (value) {
                if (value.resource === type) {
                    $scope.getModelParent(resource, value.path)[ $scope.getModelLeaf(value.path) ] = type + "/" + refValue;
                }
            });
            return resource;
        }

        function buildQueryString(search, enteredSearch) {
            var queryTerm = {};
            if (typeof search.searchParams !== 'undefined' && enteredSearch !== undefined && enteredSearch !== "") {

                // Only supporting one query string right now
                var queryItem = search.searchParams[0].name;
                if (search.searchParams[0].modifier) {
                    queryItem += ":" + search.searchParams[0].modifier;
                }
                queryTerm[queryItem] =  enteredSearch;
            }
            if (typeof search.sortParams !== 'undefined') {
                queryTerm["$sort"] = [];
                angular.forEach(search.sortParams, function (sort) {
                    var sortItem;
                    if (sort.name !== undefined && sort.modifier !== undefined) {
                        sortItem = [sort.name, sort.modifier];
                    } else if (sort.name !== undefined && sort.modifier !== undefined) {
                        sortItem = sort.name;
                    }
                    queryTerm["$sort"].push(sortItem);
                });
            }
            return queryTerm;
        }

        /**
         *
         *      FHIR SERVICE API CALLS
         *
         **/
        function searchResourceInstances(clearSearch){
            if (typeof $scope.selectedResourceTypeConfig.search !== 'undefined' && clearSearch === undefined) {
                queryResourceInstances($scope.selectedResourceType.index, buildQueryString($scope.selectedResourceTypeConfig.search, $scope.enteredSearch));
            } else {
                queryResourceInstances($scope.selectedResourceType.index);
            }
        }

        function createResource(newResource) {
            $scope.smart.api.create({type: newResource.resourceType, data: JSON.stringify(formatAttributesFromUIForFhir(angular.copy(newResource)))})
                .done(function(){
                    queryResourceInstances($scope.selectedResourceType.index);
                    webix.message(newResource.resourceType + " Saved");
                }).fail(function(){
                    webix.message({ type:"error", text: newResource.resourceType + " failed to Save" });
                    console.log("failed to create " + newResource.resourceType, arguments);
                });
        }

        function updateResource () {
            var modifiedResource = angular.copy($scope.selectedResourceInstance);
            delete modifiedResource.meta;

            $scope.smart.api.update({type: modifiedResource.resourceType, data: JSON.stringify(modifiedResource), id: modifiedResource.id})
                .done(function(){
                    queryResourceInstances($scope.selectedResourceType.index);
                    webix.message(modifiedResource.resourceType + " Saved");
                }).fail(function(){
                    webix.message({ type:"error", text:modifiedResource.resourceType + " failed to Save" });
                    console.log("failed to create " + modifiedResource.resourceType, arguments);
                });
        }

        function deleteResource() {
            $scope.smart.api.delete({type: $scope.selectedResourceInstance.resourceType, id: $scope.selectedResourceInstance.id})
                .done(function(){
                    queryResourceInstances($scope.selectedResourceType.index);
                    webix.message($scope.selectedResourceInstance.resourceType + " Deleted");
                }).fail(function(){
                    webix.message({ type:"error", text:$scope.selectedResourceInstance.resourceType + " failed to Delete" });
                    console.log("failed to create " + $scope.selectedResourceInstance.resourceType, arguments);
                });
        }

        function getNextOrPrevPage(lastResult, direction) {
            var deferred = $.Deferred();
            $.when($scope.smart.patient.api[direction]({bundle: lastResult.data}))
            .done(function(pageResult){
                    var resources = [];
                    if (pageResult.data.entry) {
                        pageResult.data.entry.forEach(function(entry){
                            resources.push(formatAttributesFromFhirForUI(entry.resource));
                        });
                    }
                    deferred.resolve(resources, pageResult);
                });
            return deferred;
        }

        function queryPatient(){
            $.when($scope.smart.patient.read())
                .done(function(patient){
                    $scope.patient = {name:""};
                    angular.forEach(patient.name[0].given, function (value) {
                        $scope.patient.name = $scope.patient.name + ' ' + String(value);
                    });
                    angular.forEach(patient.name[0].family, function (value) {
                        $scope.patient.name = $scope.patient.name + ' ' + value;
                    });
                    $scope.patient.sex = patient.gender;
                    $scope.patient.dob = patient.birthDate;
                    $scope.patient.id  = patient.id;
                });
        }

        function queryResourceInstances(resourceTypeConfigIndex, searchValue) {
            var deferred = $.Deferred();

            var searchParams = {type: $scope.resourceTypeConfigList[resourceTypeConfigIndex].resource, count: 50};
            if (searchValue !== undefined) {
                searchParams.query = searchValue;
            } else if (typeof $scope.resourceTypeConfigList[resourceTypeConfigIndex].search !== 'undefined' ) {
                var sortOnly = buildQueryString($scope.resourceTypeConfigList[resourceTypeConfigIndex].search);
                if ('$sort' in sortOnly){
                    searchParams.query = sortOnly;
                }
            }

            $.when($scope.smart.patient.api.search(searchParams))
                .done(function(resourceSearchResult){
                    var resourceResults = [];
                    if (resourceSearchResult.data.entry) {
                        resourceSearchResult.data.entry.forEach(function(entry){
                            resourceResults.push(formatAttributesFromFhirForUI(entry.resource, resourceTypeConfigIndex));
                        });
                    } else {
                        webix.message({ type:"error", text:"No Results found for the Search"});
                    }
                    var resourceType = { index: resourceTypeConfigIndex,
                                         resourceType: $scope.resourceTypeConfigList[resourceTypeConfigIndex].resource,
                                         count: resourceSearchResult.data.total };

                    if ($scope.resourceTypeList.length === resourceTypeConfigIndex) {
                        $scope.resourceTypeList.push(resourceType);
                    } else {
                        $scope.resourceTypeList[resourceTypeConfigIndex].count = resourceSearchResult.data.total;
                    }

                    var resourceListId = $$("resGroupListId").getIdByIndex(resourceTypeConfigIndex);
                    var resGroup = $$("resGroupListId").getItem(resourceListId);
                    if (typeof resGroup === "undefined") {
                        $$("resGroupListId").add(resourceType);
                    }else{
                        resGroup.count = resourceSearchResult.data.total;
                        $$("resGroupListId").updateItem(resourceListId, resourceType);
                    }

                    $scope.resourceTypeList[resourceTypeConfigIndex].pageData = resourceResults;
                    $scope.resourceTypeList[resourceTypeConfigIndex].pageCount = calculatePages(resourceSearchResult);
                    $scope.resourceTypeList[resourceTypeConfigIndex].searchObj = resourceSearchResult;
                    if (typeof $scope.selectedResourceType.index === 'undefined' ||
                        resourceTypeConfigIndex === $scope.selectedResourceType.index) {
                        $scope.selectedResourceType = $scope.resourceTypeList[resourceTypeConfigIndex];
                        rebuildResourceTable(resourceResults);
                        $scope.showPageButtons();
                        $scope.showSearchBar();
                    }
                    deferred.resolve(resourceResults, resourceTypeConfigIndex);
                });
            return deferred;
        }

        function getAllResources(index) {
            queryResourceInstances(index)
                .done(function(resourceList, index){
                    $scope.resourceTypeList[index].pageData = angular.copy(resourceList);
                    if(++index < $scope.resourceTypeConfigList.length) {
                        getAllResources(index);
                    }
                });
        }

        /**
         *
         *      FHIR SERVICE OAUTH2 AUTHENTICATION & APP INITIALIZATION
         *
         **/
        FHIR.oauth2.ready(function(smart){
            $scope.smart = smart;
            $terminologyService.getObservationCodesValueSetId();
            queryPatient();
            $resourceJson.success(function(resources){
                $scope.resourceTypeConfigList = resources;
                queryResourceInstances(0)
                    .done(function(){
                        webix.ready(function() {
                            $$("resGroupListId").select($$("resGroupListId").getFirstId());
                            $$("searchBar").define("css", "searchBar");
                            $$("detailView").hide();
                            $$("searchBar").hide();
                            $$("placeholder").hide();
                            $scope.showSearchBar();
                        });
                        $scope.$digest();
                        getAllResources(1);
                    });
            });
        });

}]).controller('ModalInstanceCtrl',['$scope', '$uibModalInstance', "$http", "$terminologyService", "newResource", "selectedResourceTypeConfig",
    function ($scope, $uibModalInstance, $http, $terminologyService, newResource, selectedResourceTypeConfig) {

        $scope.selectedResourceInstance = newResource;
        $scope.selectedResourceTypeConfig = selectedResourceTypeConfig;

        $scope.getValueSetExpansion = function(val, min) {
            return $terminologyService.getValueSetExpansion(val, min);
        };

        $scope.create = function (newResource) {
            $uibModalInstance.close(newResource);
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };

        $scope.getModelParent = function(obj,path) {
            var segs = path.split('.');
            var root = obj;

            while (segs.length > 1) {
                var pathStep = segs.shift();
                if (typeof root[pathStep] === 'undefined') {
                    root[pathStep] = {};
                }
                root = root[pathStep];
            }
            return root;
        };

        $scope.getModelLeaf = function(path) {
            var segs = path.split('.');
            return segs[segs.length-1];
        };

    }]);