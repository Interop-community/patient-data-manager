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

        $scope.getValueSetExpansion = $terminologyService.getValueSetExpansion;

        /**
         *
         *      UI HELPERS
         *
         **/
        $scope.showSearchBar = function(){
            if ($scope.selectedResourceTypeConfig.searchParams) {
                $$("searchBar").show();
            } else {
                $$("searchBar").hide();
            }
        };

        $scope.showPageButtons = function(){
            if ($scope.hasLink($scope.selectedResourceType.searchObj, 'previous') ||
                $scope.hasLink($scope.selectedResourceType.searchObj, 'next')) {
                $$("pageButtons").show();
            } else {
                $$("pageButtons").hide();
            }
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
            var root = obj;
            if (root === undefined)
                return {};

            while (segs.length > 1) {
                var pathStep = segs.shift();
                if (typeof root === 'undefined' || root === "")
                    return {};
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
        } ;

        /**
         *
         *      SELECTION AND NAVIGATION
         *
         **/
        $scope.selectResourceInstance = function(resource) {
            $scope.resourceInstanceList = $scope.resourceInstanceList.filter(function( obj ) {
                obj.isSelected = (obj === resource);
                return true;
            });

            $scope.selectedResourceInstance = angular.copy(resource);
            $$('detailView').show();
        };

        $scope.selectResourceType = function() {
            var selectedId = $$("resGroupListId").getSelectedId();
            var result = $.grep($scope.resourceTypeList, function(e){ return e.id == selectedId; });
            $scope.selectedResourceType = $scope.resourceTypeList[result[0].id];
            $scope.selectedResourceTypeConfig = $scope.resourceTypeConfigList[result[0].id];
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

            if (operation === 'create') {
                $scope.newResource = populateResourceTemplateDefaults();
            } else {
                $scope.newResource = $scope.selectedResourceInstance;
            }

            var modalInstance = $uibModal.open({
                animation: true,
                templateUrl: 'js/templates/createModal.html',
                controller: 'ModalInstanceCtrl',
                size:'lg',
                resolve: {
                    newResource: function () {
                        return angular.copy($scope.newResource);
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

        $scope.requestResourceSearch = function() {
            // TODO: build search string
            searchResourceInstances();
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
        function populateResourceTemplate(resource) {
            var args = [];

            angular.forEach($scope.selectedResourceTypeConfig.displayValues, function (value) {

                var newValue = $scope.getModelParent(resource, value.path)[ $scope.getModelLeaf(value.path) ];
                if (value.type === "date") {
                    newValue = new Date(newValue).toISOString();
                }
                args.push(newValue);
            });
            return args;
        }

        function populateResourceTemplateDefaults() {
            var newResource = angular.copy($scope.selectedResourceTypeConfig.resourceTemplate);

            angular.forEach($scope.selectedResourceTypeConfig.displayValues, function (value) {
                var newValue = value.default;
                if (value.type === "date") {
                    newValue = $filter('date')(new Date(), 'MM/dd/yyyy HH:mm');
                }
                $scope.getModelParent(newResource, value.path)[ $scope.getModelLeaf(value.path) ] = newValue;
            });
            return newResource;
        }

        function formatJSONTemplateWithArgs(format, args) {
            return format.replace(/{(\d+)}/g, function(match, number) {
                return typeof args[number] != 'undefined'
                    ? args[number]
                    : match
                    ;
            });
        }

        function formatJSONTemplate(format) {
            var args = Array.prototype.slice.call(arguments, 1);
            return format.replace(/{(\d+)}/g, function(match, number) {
                return typeof args[number] != 'undefined'
                    ? args[number]
                    : match
                    ;
            });
        }

        function buildQueryString(resourceIndex, searchParams) {
            var queryString = "";
            angular.forEach(searchParams, function (value) {

            });

            return queryString;
        }

        /**
         *
         *      FHIR SERVICE API CALLS
         *
         **/
        function searchResourceInstances(){
            var searchParams = $scope.selectedResourceTypeConfig.searchParams;
            if ($scope.enteredSearch !== undefined && $scope.enteredSearch !== "") {
                var queryTerm = {};
                var strName = searchParams[0].name + ":" + searchParams[0].modifier;
                queryTerm[strName] =  $scope.enteredSearch;
                queryResourceInstances($scope.selectedResourceType.index, queryTerm)
            } else {
                queryResourceInstances($scope.selectedResourceType.index)
            }
        }

        function createResource(newResource) {

            var args = populateResourceTemplate(newResource);
            args.push($scope.patient.id);
            var populatedResource = formatJSONTemplateWithArgs(JSON.stringify($scope.selectedResourceTypeConfig.resourceTemplate), args)

            $scope.smart.api.create({type: newResource.resourceType, data: populatedResource})
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
                    var resListFinal = [];
                    pageResult.data.entry.forEach(function(resource){
                        resources.push(resource.resource);
                    });
                    if(resources){
                        resources = $filter('orderBy')(resources,"effectiveDateTime");
                    }
                    angular.forEach(resources, function (value) {
                        if (value.valueQuantity === undefined) {
                            value.valueQuantity = {};
                            value.valueQuantity.unit ="";
                            value.valueQuantity.value="";
                        }
                        resListFinal.push(value);
                    });
                    deferred.resolve(resListFinal, pageResult);
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

        function queryResourceInstances(resourceIndex, searchValue) {
            var deferred = $.Deferred();

            var searchParams = {type: $scope.resourceTypeConfigList[resourceIndex].resource, count: 50};
            if (searchValue !== undefined) {
                searchParams.query = searchValue;
            }

            $.when($scope.smart.patient.api.search(searchParams))
                .done(function(resourceSearchResult){
                    var resourceResultsFinal = [];
                    var resourceResults = [];
                    if (resourceSearchResult.data.entry) {
                        resourceSearchResult.data.entry.forEach(function(entry){
                            resourceResults.push(entry.resource);
                        });
                    }

                    //TODO Move Resource Specific Initialization out
                    if(resourceResults){
                        resourceResults = $filter('orderBy')(resourceResults,"effectiveDateTime");
                    }

                    //Hack because I can't figure out how to get webix to ignore
                    //missing data
                    angular.forEach(resourceResults, function (value) {
                        if (value.valueQuantity === undefined) {
                            value.valueQuantity = {
                                "unit" : "",
                                "value" : ""
                            };
                        }
                        resourceResultsFinal.push(value);
                    });

                    var resourceType = JSON.parse('{ "id":"' + resourceIndex + '", "resourceType": "' + $scope.resourceTypeConfigList[resourceIndex].resource + '", ' +
                        '"count": "' + resourceSearchResult.data.total + '"}');

                    if ($scope.resourceTypeList.length === resourceIndex) {
                        $scope.resourceTypeList.push(resourceType);
                    } else {
                        $scope.resourceTypeList[resourceIndex] = resourceType;
                    }

                    var resGroup = $$("resGroupListId").getItem(resourceIndex);
                    if (typeof resGroup === "undefined") {
                        $$("resGroupListId").add(resourceType);
                    }else{
                        $$("resGroupListId").updateItem(resourceIndex, resourceType);
                    }

                    $scope.resourceTypeList[resourceIndex].index = resourceIndex;
                    $scope.resourceTypeList[resourceIndex].pageData = resourceResultsFinal;
                    $scope.resourceTypeList[resourceIndex].pageCount = calculatePages(resourceSearchResult);
                    $scope.resourceTypeList[resourceIndex].searchObj = resourceSearchResult;
                    if (resourceIndex === $scope.selectedResourceType.index) {
                        $$("resGroupListId").refresh();
                        rebuildResourceTable(resourceResultsFinal);
                        $scope.showPageButtons();
                        $scope.showSearchBar();
                    }
                    deferred.resolve(resourceResultsFinal, resourceIndex);
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
                            $$("detailView").hide();
                            $$("searchBar").hide();
                            $$("pageButtons").hide();
                            $$("resGroupListId").attachEvent("onAfterLoad", function(){
                                $$("resGroupListId").select($$("resGroupListId").getFirstId());
                            });
                        });
                        $scope.$digest();
                    });
                getAllResources(1);
            });
        });

}]).controller('ModalInstanceCtrl',['$scope', '$uibModalInstance', "$http", "$terminologyService", "newResource", "selectedResourceTypeConfig",
    function ($scope, $uibModalInstance, $http, $terminologyService, newResource, selectedResourceTypeConfig) {

        $scope.selectedResourceInstance = newResource;
        $scope.selectedResourceTypeConfig = selectedResourceTypeConfig;

        $scope.getValueSetExpansion = function(val) {
            return $terminologyService.getValueSetExpansion(val);
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