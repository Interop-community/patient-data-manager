'use strict';

angular.module('pdmApp.services', []).factory('$terminology', function ($http) {

    var terminologyServer = 'http://localhost:8080/hsp-reference-api/data/_services/terminology';
    var observationCodesId;

    var terminologyService = {};

    terminologyService.fhirService = FHIR.client({
        serviceUrl: terminologyServer
    });

    // Any function returning a promise object can be used to load values asynchronously
    terminologyService.getValueSetExpansion = function(val, min) {
        if (val.length >= min) {
            var path = encodeURI('/ValueSet/' + observationCodesId + '/$expand?filter=' + val);
            return $http.get(terminologyServer + '?uri=' + path, {
                params: {}
            }).then(function(response){
                    if (response.data.expansion.contains !== undefined) {
                        return response.data.expansion.contains.map(function(item){
                            return item;
                        });
                    }
                });
        }
    };

    terminologyService.getObservationCodesValueSetId = function() {
        var deferred = $.Deferred();
        var path = encodeURI('/ValueSet?url=' + 'http://hl7.org/fhir/ValueSet/observation-codes');
        $http.get(terminologyServer + '?uri=' + path, {
            params: {}
        }).then(function(valueSet){
                if (valueSet.data.entry[0] !== 'undefined'){
                    observationCodesId = valueSet.data.entry[0].resource.id;
                }
                deferred.resolve();
            });
        return deferred;
    };

    return terminologyService;
}).factory('$dynamicModelHelpers', function ($filter) {

        /**
         *
         *      DYNAMIC MODEL HELPERS
         *
         **/
        var dynamicModelHelpers = {};

        dynamicModelHelpers.getDynamicModelByName = function(resource, attribute) {

            var parent;
            if (stringIsEmpty(attribute.path)) {
                parent = resource;
            } else {
                parent = dynamicModelHelpers.getDynamicModel(resource, attribute.path);
            }
            var properties = Object.keys(parent).filter(function( property ) {
                var start = attributeFilterType(attribute.filter);
                if (stringStartsWith(property, start)) {
                    return true;
                }
            });
            return $filter(attribute.filter)(properties[0], parent[properties[0]]);
        };

        function getFhirDatatypeName(resource, attribute) {

            var parent;
            if (stringIsEmpty(attribute.path)) {
                parent = resource;
            } else {
                parent = dynamicModelHelpers.getDynamicModel(resource, attribute.path);
            }
            var properties = Object.keys(parent).filter(function( property ) {
                var start = attributeFilterType(attribute.filter);
                if (stringStartsWith(property, start)) {
                    return true;
                }
            });
            return properties[0];
        }

        dynamicModelHelpers.getFhirDatatypeOnResource = function(fhirDataTypes, resource, attribute) {
            return dynamicModelHelpers.getFhirDatatypeByName(fhirDataTypes, getFhirDatatypeName(resource, attribute), attribute);
        };

        dynamicModelHelpers.getFhirDatatypeByName = function(fhirDataTypes, dataTypeName, attribute) {
            var result = [];
            angular.forEach(fhirDataTypes, function (datatype) {
                if (datatype.variableTypeArray === attribute.filter) {
                    angular.forEach(datatype.dataTypes, function (value) {
                        if (value.dataType === dataTypeName) {
                            result = value.displayValues;
                        }
                    });
                }
            });
            return result;
        };


        dynamicModelHelpers.getFhirDatatypeChoices = function(fhirDataTypes, attribute) {
            var result = [];
            angular.forEach(fhirDataTypes, function (datatype) {
                if (datatype.variableTypeArray === attribute.filter) {
                    angular.forEach(datatype.dataTypes, function (value) {
                        result.push(value.dataType);
                    });
                }
            });
            return result;
        };

        dynamicModelHelpers.getDynamicModel = function(resource, path) {
            var root = dynamicModelHelpers.getModelParent(resource, path);
            var leaf = dynamicModelHelpers.getModelLeaf(path);

            if (typeof root !== 'undefined' && typeof leaf !== 'undefined' ) {
                return root[ leaf ];
            }
            return "";
        };

        dynamicModelHelpers.getModelParent = function(obj,path) {
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

        dynamicModelHelpers.getModelLeaf = function(path) {
            var segs = path.split('.');
            return segs[segs.length-1];
        };

        dynamicModelHelpers.getResourceConfigDisplayValuesByType = function(resourceTypeConfigList, type) {
            var result = dynamicModelHelpers.getResourceConfigByType()
            return result.displayValues;
        };

        dynamicModelHelpers.getResourceConfigByType = function(resourceTypeConfigList, type) {
            var result = {};
            angular.forEach(resourceTypeConfigList, function (resourceTypeConfig) {
                if (resourceTypeConfig.resource === type) {
                    result = resourceTypeConfig;
                }
            });
            return result;
        };

        function attributeFilterType (string) {
            return string.slice(0, string.length - 1);
        }

        function stringStartsWith (string, prefix) {
            return string.slice(0, prefix.length) == prefix;
        }

        function stringIsEmpty (string) {
            return (typeof string === 'undefined' || string === "");
        }

        return dynamicModelHelpers;

    }).factory('$resourceBuilderHelpers', function ($dynamicModelHelpers) {

        /**
         *
         *      RESOURCE BUILDER HELPERS
         *
         **/
        var dmh = $dynamicModelHelpers;

        var resourceBuilderHelpers = {};

        resourceBuilderHelpers.formatAttributesFromUIForFhir = function(selectedResourceTypeConfig, resource) {
            angular.forEach(selectedResourceTypeConfig.displayValues, function (value) {
                var newValue = dmh.getModelParent(resource, value.path)[ dmh.getModelLeaf(value.path) ];
                if (value.type === "date") {
                    dmh.getModelParent(resource, value.path)[ dmh.getModelLeaf(value.path) ] = new Date(newValue).toISOString();
                }
                if (stringIsEmpty(newValue)) {
                    delete dmh.getModelParent(resource, value.path)[ dmh.getModelLeaf(value.path) ];
                }
            });
            return resource;
        };

        resourceBuilderHelpers.formatAttributesFromFhirForUI = function(selectedResourceTypeConfig, resource, resourceTypeConfig) {
            angular.forEach(selectedResourceTypeConfig.displayValues, function (value) {
                var newValue = dmh.getModelParent(resource, value.path)[ dmh.getModelLeaf(value.path) ];
                if (typeof value === 'undefined') {

                }
                if (value.type === "date" && typeof newValue !== 'undefined') {
                    var newDate = new Date(newValue);
                    if (newValue.lastIndexOf("T00:00:00.000Z") != -1) {
                        newDate.setHours(0,0,0,0);
                    }
                    dmh.getModelParent(resource, value.path)[ dmh.getModelLeaf(value.path) ] = newDate;
                }
            });
            return resource;
        };

        resourceBuilderHelpers.populateResourceTemplateDefaults = function(selectedResourceTypeConfig, references) {
            var newResource = buildResourceObjectFromConfig(selectedResourceTypeConfig);

            angular.forEach(selectedResourceTypeConfig.displayValues, function (value) {
                var newValue = value.default;
                if (value.type === "variable") {
                    return;
                } else if (value.type === "date") {
                    newValue = new Date();
                    newValue.setSeconds(0,0)
                }
                dmh.getModelParent(newResource, value.path)[ dmh.getModelLeaf(value.path) ] = newValue;
            });

            angular.forEach(references, function (reference) {
                newResource = addReferenceValues(newResource, reference.type, reference.value, selectedResourceTypeConfig);
            });
            return newResource;
        };

        function buildResourceObjectFromConfig(selectedResourceTypeConfig) {
            var template = {
                resourceType: selectedResourceTypeConfig.resource
            };
            angular.forEach(selectedResourceTypeConfig.displayValues, function (value) {
                if (value.type !== 'variable') {
                    dmh.getModelParent(template, value.path)[ dmh.getModelLeaf(value.path) ] = "";
                }
            });
//            angular.forEach(selectedResourceTypeConfig.references, function (value) {
//                dmh.getModelParent(template, value.path)[ dmh.getModelLeaf(value.path) ] = "";
//            });
            return template;
        }

        function addReferenceValues(resource, type, refValue, selectedResourceTypeConfig) {
            angular.forEach(selectedResourceTypeConfig.references, function (value) {
                if (value.resource === type) {
                    dmh.getModelParent(resource, value.path)[ dmh.getModelLeaf(value.path) ] = type + "/" + refValue;
                }
            });
            return resource;
        }

        function stringIsEmpty (string) {
            return (typeof string === 'undefined' || string === "");
        }

        return resourceBuilderHelpers;
    }).factory('$fhirApiServices', function ($resourceBuilderHelpers) {

        /**
         *
         *      FHIR SERVICE API CALLS
         *
         **/

        var rbh = $resourceBuilderHelpers;

        var fhirServices = {};

        fhirServices.searchResourceInstances = function (smart, enteredSearch, resourceTypeList, resourceTypeConfig, clearSearch, notification){
            var deferred = $.Deferred();
            if (typeof resourceTypeConfig.search !== 'undefined' && clearSearch === undefined) {
                fhirServices.queryResourceInstances(smart, resourceTypeList, resourceTypeConfig, notification, buildQueryString(resourceTypeConfig.search, enteredSearch))
                    .done(function(resourceTypeList, index){
                        deferred.resolve(resourceTypeList, index );
                    }).fail(function(){deferred.reject()});

            } else {
                fhirServices.queryResourceInstances(smart, resourceTypeList, resourceTypeConfig, notification)
                    .done(function(resourceTypeList, index){
                        deferred.resolve(resourceTypeList, index );
                    }).fail(function(){deferred.reject()});
            }
            return deferred;
        };

        fhirServices.createResource = function(smart, newResource, resourceTypeList, resourceTypeConfig, notification) {
            var deferred = $.Deferred();
            smart.api.create({type: newResource.resourceType, data: JSON.stringify(rbh.formatAttributesFromUIForFhir(resourceTypeConfig, angular.copy(newResource)))})
                .done(function(){
                    fhirServices.queryResourceInstances(smart, resourceTypeList, resourceTypeConfig, notification)
                        .done(function(resourceTypeList, index){
                            notification(newResource.resourceType + " Created");
                            deferred.resolve(resourceTypeList, index );
                        }).fail(function(){deferred.reject()});
                }).fail(function(){
                    notification({ type:"error", text: newResource.resourceType + " failed to Save" });
                    console.log("failed to create " + newResource.resourceType, arguments);
                    deferred.reject()
                });
            return deferred;
        };

        fhirServices.updateResource = function(smart, resourceInstance, resourceTypeList, resourceTypeConfig, notification) {
            var deferred = $.Deferred();
            var modifiedResource = angular.copy(resourceInstance);
            delete modifiedResource.meta;
            delete modifiedResource.isSelected;

            smart.api.update({type: modifiedResource.resourceType, data: JSON.stringify(modifiedResource), id: modifiedResource.id})
                .done(function(){
                    fhirServices.queryResourceInstances(smart, resourceTypeList, resourceTypeConfig, notification)
                        .done(function(resourceTypeList, index){
                            notification(modifiedResource.resourceType + " Saved");
                            deferred.resolve(resourceTypeList, index );
                        }).fail(function(){deferred.reject()});
                }).fail(function(){
                    notification({ type:"error", text:modifiedResource.resourceType + " failed to Save" });
                    console.log("failed to create " + modifiedResource.resourceType, arguments);
                    deferred.reject()
                });
            return deferred;
        };

        fhirServices.deleteResource = function(smart, resourceInstance, resourceTypeList, resourceTypeConfig, notification) {
            var deferred = $.Deferred();
            smart.api.delete({type: resourceInstance.resourceType, id: resourceInstance.id})
                .done(function(){
                    fhirServices.queryResourceInstances(smart, resourceTypeList, resourceTypeConfig, notification)
                        .done(function(resourceTypeList, index){
                            notification(resourceInstance.resourceType + " Deleted");
                            deferred.resolve(resourceTypeList, index );
                        }).fail(function(){deferred.reject()});
                }).fail(function(){
                    notification({ type:"error", text:resourceInstance.resourceType + " failed to Delete" });
                    console.log("failed to create " + resourceInstance.resourceType, arguments);
                    deferred.reject();
                });
            return deferred;
        };

        fhirServices.getNextOrPrevPage = function(smart, lastResult, direction, resourceTypeConfig) {
            var deferred = $.Deferred();
            $.when(smart.patient.api[direction]({bundle: lastResult.data}))
                .done(function(pageResult){
                    var resources = [];
                    if (pageResult.data.entry) {
                        pageResult.data.entry.forEach(function(entry){
                            resources.push(rbh.formatAttributesFromFhirForUI(resourceTypeConfig, entry.resource));
                        });
                    }
                    deferred.resolve(resources, pageResult);
                });
            return deferred;
        };

        fhirServices.getResourceByReference = function(smart, resourceType, resourceId){
            var deferred = $.Deferred();
            $.when(smart.api.read({type: resourceType, id: resourceId}))
                .done(function(referenceResult){
                    deferred.resolve(referenceResult);
                });
            return deferred;
        };


        fhirServices.queryPatient = function(smart){
            var deferred = $.Deferred();
            $.when(smart.patient.read())
                .done(function(patientResult){
                    var patient = {name:""};
                    angular.forEach(patientResult.name[0].given, function (value) {
                        patient.name = patient.name + ' ' + String(value);
                    });
                    angular.forEach(patientResult.name[0].family, function (value) {
                        patient.name = patient.name + ' ' + value;
                    });
                    patient.sex = patientResult.gender;
                    patient.dob = patientResult.birthDate;
                    patient.id  = patientResult.id;
                    deferred.resolve(patient);
                });
            return deferred;
        };

        fhirServices.queryResourceInstances = function(smart, resourceTypeList, resourceTypeConfig, notification, searchValue) {
            var deferred = $.Deferred();

            var searchParams = {type: resourceTypeConfig.resource, count: 50};
            if (searchValue !== undefined) {
                searchParams.query = searchValue;
            } else if (typeof resourceTypeConfig.search !== 'undefined' ) {
                var sortOnly = buildQueryString(resourceTypeConfig.search);
                if ('$sort' in sortOnly){
                    searchParams.query = sortOnly;
                }
            }

            $.when(smart.patient.api.search(searchParams))
                .done(function(resourceSearchResult){
                    var resourceResults = [];
                    if (resourceSearchResult.data.entry) {
                        resourceSearchResult.data.entry.forEach(function(entry){
                            resourceResults.push(rbh.formatAttributesFromFhirForUI(resourceTypeConfig, entry.resource));
                        });
                    } else {
                        notification({ type:"error", text:"No Results found for the Search"});
                    }
                    var resourceType = { index: resourceTypeConfig.index,
                        resourceType: resourceTypeConfig.resource,
                        count: resourceSearchResult.data.total };

                    if (resourceTypeList.length === resourceTypeConfig.index) {
                        resourceTypeList.push(resourceType);
                    } else {
                        resourceTypeList[resourceTypeConfig.index].count = resourceSearchResult.data.total;
                    }
                    resourceTypeList[resourceTypeConfig.index].pageData = angular.copy(resourceResults);
                    resourceTypeList[resourceTypeConfig.index].pageCount = calculatePages(resourceSearchResult);
                    resourceTypeList[resourceTypeConfig.index].searchObj = resourceSearchResult;

                    deferred.resolve(resourceTypeList, resourceTypeConfig.index);
                });
            return deferred;
        };

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

        function calculatePages(searchResult) {
            var pageCnt = Math.floor(searchResult.data.total / 50);
            if ((searchResult.data.total % 50) != 0) {
                pageCnt++;
            }
            return pageCnt;
        }

        return fhirServices;

    }).factory('$resourceJson', ['$http',function($http) {
    return $http.get('config/resources.json');
}]).factory('$fhirDatatypesJson', ['$http',function($http) {
    return $http.get('config/fhirDatatypes.json');
}]);
