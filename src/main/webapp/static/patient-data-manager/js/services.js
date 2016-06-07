'use strict';

angular.module('pdmApp.services', []).factory('$terminology', function ($http) {

    var terminologyServerEndpoint = '/_services/smart/terminology';
    var urlBase = "";

    var valueSetCodeEndpointMap = {};
    var terminologyService = {};

    terminologyService.setUrlBase = function(smart) {
        urlBase = smart.server.serviceUrl;
    };

    // Any function returning a promise object can be used to load values asynchronously
    terminologyService.getValueSetExpansion = function(val, min, url) {
        var deferred = $.Deferred();
        terminologyService.getObservationCodesValueSetId(url).done(function(lookupUrl){
            if (val.length >= min) {
                var path = encodeURI('/ValueSet/' + lookupUrl + '/$expand?filter=' + val);
                deferred.resolve($http.get(urlBase  + terminologyServerEndpoint + '?uri=' + path, {
                    params: {}
                }).then(function(response){
                        if (response.data.expansion !== undefined && response.data.expansion.contains !== undefined) {
                            return response.data.expansion.contains.map(function(item){
                                return item;
                            });
                        }
                    })
                )
            }
        });
        return deferred;
    };

    terminologyService.getObservationCodesValueSetId = function(url) {
        var deferred = $.Deferred();
        if (valueSetCodeEndpointMap[url] !== undefined) {
            deferred.resolve(valueSetCodeEndpointMap[url]);
        } else {
            var path = encodeURI('/ValueSet?url=' + url);
            $http.get(urlBase + terminologyServerEndpoint + '?uri=' + path, {
                params: {}
            }).then(function(valueSet){
                    if (valueSet.data.entry[0] !== 'undefined'){
                        valueSetCodeEndpointMap[url] = valueSet.data.entry[0].resource.id;
                    }
                    deferred.resolve(valueSetCodeEndpointMap[url]);
                });
        }
        return deferred;
    };

    return terminologyService;
}).factory('errorService', function($rootScope) {
    var errorMessage;
    var messageIsFormatted = false;
    return {
        getErrorMessage: function () {
            return errorMessage;
        },
        messageIsFormatted: function () {
            return messageIsFormatted;
        },
        setErrorMessage: function (error, isFormatted) {
            errorMessage = error;
            messageIsFormatted = isFormatted;
            $rootScope.$emit('error-occurred', {});

        }
    };
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
            var properties = [];
                if (attribute.type === 'variable') {
                        properties = Object.keys(parent).filter(function( property ) {
                        if (stringStartsWith(property, attribute.namePrefix)) {
                            return true;
                        }
                    });
                }
            if (properties.length > 0 ) {
                return $filter("fhirTypeFilter")(attributeFilterType (attribute.namePrefix, properties[0]), parent[properties[0]]);
            }
            return "";
        };

        function getFhirDatatypeName(resource, attribute) {

            var parent;
            if (stringIsEmpty(attribute.path)) {
                parent = resource;
            } else {
                parent = dynamicModelHelpers.getModelParent(resource, attribute.path);
            }

            var properties = [];
            if (attribute.type === 'variable') {
                properties = Object.keys(parent).filter(function( property ) {
                        if (stringStartsWith(property, attribute.namePrefix)) {
                            return true;
                        }
                });
            }
            return properties[0];
        }

        dynamicModelHelpers.getFhirDatatypeOnResource = function(resource, attribute) {
            if (attribute.type === 'variable') {
                return dynamicModelHelpers.getFhirDatatypeByName(getFhirDatatypeName(resource, attribute), attribute);
            }
        };

        dynamicModelHelpers.getFhirDatatypeByName = function(dataType, variableType) {
            var result = [];

            if (dataType !== undefined) {
                angular.forEach(variableType.variableChoices, function (choice) {
                    if (choice.dataType === dataType) {
                        result = choice.displayValues;
                    }
                });
            }
            return result;
        };

        dynamicModelHelpers.getFhirDatatypeChoices = function(attribute) {
            var result = [];
            angular.forEach(attribute.variableChoices, function (choice) {
                result.push(choice.dataType);
            });
            return result;
        };

        dynamicModelHelpers.dataTypeChoiceChange = function(selectedDataType, previousSelectedDataType, selectedResourceInstance) {
            if (selectedDataType !== previousSelectedDataType) {
                if (previousSelectedDataType !== undefined && previousSelectedDataType !== "") {
                    delete selectedResourceInstance[previousSelectedDataType];
                }
            }
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

        function attributeFilterType (start, name) {
            return name.slice(start.length);
        }

        function stringStartsWith (string, prefix) {
            return string.slice(0, prefix.length) === prefix;
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

        resourceBuilderHelpers.turnStringsIntoDates = function(resource) {
            for (var property in resource) {
                if (resource.hasOwnProperty(property) && (property.lastIndexOf("date") > -1 || property.lastIndexOf("Date") > -1))  {
                    if (typeof resource[property] !== "string") {
                        resource[property] = resourceBuilderHelpers.turnStringsIntoDates(resource[property])
                    } else {
                        // if there is a time component, then convert it to a date
                        // YYYY-MM-DDTHH:mm:ss.sssZ
                        if (resource[property].length > 10) {
                            resource[property] = new Date(resource[property]);
                        }
                        // otherwise leave it as a string
                        // ex: birthDate = "2015-10-20" not "2015-10-19T16:00:00.000-6000"
                    }
                }
            }
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
    }).factory('$fhirApiServices', function ($resourceBuilderHelpers, errorService) {

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
                }).fail(function(error){
                    errorService.setErrorMessage(error.data.responseText, true);
                    deferred.reject()
                });
            return deferred;
        };

        fhirServices.updateResource = function(smart, resourceInstance, resourceTypeList, resourceTypeConfig, notification) {
            var deferred = $.Deferred();
            var modifiedResource = angular.copy(resourceInstance);
            delete modifiedResource.meta;
            delete modifiedResource.isSelected;

            smart.api.update({type: modifiedResource.resourceType, data: JSON.stringify(rbh.formatAttributesFromUIForFhir(resourceTypeConfig, angular.copy(modifiedResource))), id: modifiedResource.id})
                .done(function(){
                    fhirServices.queryResourceInstances(smart, resourceTypeList, resourceTypeConfig, notification)
                        .done(function(resourceTypeList, index){
                            notification(modifiedResource.resourceType + " Saved");
                            deferred.resolve(resourceTypeList, index );
                        }).fail(function(){deferred.reject()});
                }).fail(function(error){
                errorService.setErrorMessage(error.data.responseText, true);
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
                }).fail(function(error){
                errorService.setErrorMessage(error.data.responseText, true);
                deferred.reject()
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
                            resources.push(rbh.turnStringsIntoDates(entry.resource));
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
                            resourceResults.push(rbh.turnStringsIntoDates(entry.resource));
                        });
                    } else {
//                        notification({ type:"error", text:"No Results found for the Search"});
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

        fhirServices.createBundle = function(smart, bundle, resourceTypeList, resourceTypeConfig, notification) {
            var deferred = $.Deferred();
            smart.api.transaction({data: angular.copy(bundle)})
                .done(function(){
                    fhirServices.queryResourceInstances(smart, resourceTypeList, resourceTypeConfig, notification)
                        .done(function(resourceTypeList, index){
                            notification("Bundle Uploaded");
                            deferred.resolve(resourceTypeList, index );
                        }).fail(function(){deferred.reject()});
                }).fail(function(error){
                errorService.setErrorMessage(error.data.responseText, true);
                deferred.reject()
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

    var importedFhirDataTypes;
    var importedResources;

    function getFhirTypeByName(name) {
        var type;
        angular.forEach(importedFhirDataTypes, function (fhirDataType) {
            if (fhirDataType.dataType === name){
                type = angular.copy(fhirDataType);
            }
        });
        return type;
    }

    function subsumeDataType(value, dataTypeValue) {
//        switch(value.type) {
//            case 'fhirDatatype':
//
//                break;
//            case 'variable':
//                break;
//            default:
                if (value.name === "CodeableConcept") {
                    dataTypeValue.codedUri = value.codedUri;
                }
                if (value.labelPrefix !== "" && value.labelPrefix !== undefined) {
                    dataTypeValue.label = value.labelPrefix + dataTypeValue.label;
                }
                if (value.path !== "" && value.path !== undefined) {
                    dataTypeValue.path = value.path + "." +  dataTypeValue.path;
                }
                return dataTypeValue;
//        }
//        return {};
    }

    function subsumeVariableDataType(variableDatatypeName, dataType) {

        var fhirDatatypePrefix = variableDatatypeName + dataType.name;
        var fhirDataType = getFhirTypeByName(dataType.name);
        var newPathStart = variableDatatypeName + dataType.name;
        var subsumption = [];

        if (fhirDataType !== undefined) {
            if (fhirDataType.displayValues !== undefined) {
                angular.forEach(fhirDataType.displayValues, function (dataTypeValue) {
                switch(dataTypeValue.type) {
                    case 'fhirDatatype':
                        dataTypeValue.path = fhirDatatypePrefix + "." + dataTypeValue.path;
                        subsumption = subsumption.concat(buildResourceDataType(dataTypeValue));
                        break;
                    case 'variable':
                        break;
                    default:
                        dataTypeValue.path = newPathStart + "." +  dataTypeValue.path;
                        subsumption.push(dataTypeValue);
                }
            });
            } else if (fhirDataType.displayValue !== undefined) {
                if (fhirDataType.displayValue.path === "") {
                    fhirDataType.displayValue.path = newPathStart;
                } else {
                    fhirDataType.displayValue.path = newPathStart + "." +  fhirDataType.displayValue.path;
                }
                subsumption.push(fhirDataType.displayValue);

            }
            return {dataType: newPathStart, displayValues: subsumption};
        }
        return {};
    }

    function buildResourceDataType(dataType) {
        var newDisplayValues = [];
        switch(dataType.type) {
            case 'fhirDatatype':
                var fhirDataType = getFhirTypeByName(dataType.name);
                if (fhirDataType.displayValues !== undefined) {
                    angular.forEach(fhirDataType.displayValues, function (dataTypeValue) {
                        newDisplayValues.push(subsumeDataType(dataType, dataTypeValue));
                    });
                } else if (fhirDataType.displayValue !== undefined) {
                    newDisplayValues.push(subsumeDataType(dataType, fhirDataType.displayValue));
                }
                break;
            case 'variable':
                dataType.variableChoices = [];
                angular.forEach(dataType.dataTypes, function (subDataType) {
                    dataType.variableChoices.push(subsumeVariableDataType(dataType.namePrefix, subDataType));
                });
                newDisplayValues.push(dataType);
                break;
            default:
                newDisplayValues.push(dataType);
        }
        return newDisplayValues;
    }

    function buildResourceList(resource) {
        var newDisplayValues = [];
        for (var i = 0; i < resource.displayValues.length; i++) {
            newDisplayValues = newDisplayValues.concat(buildResourceDataType(resource.displayValues[i]));
        }
        delete resource.displayValues;
        resource.displayValues = newDisplayValues;
        return resource;
    }

    return {
        getResources: function() {
            var deferred = $.Deferred();
            $http.get('config/resources.json').success(function(resources){
                importedResources = resources;
                $http.get('config/fhirDatatypes.json').success(function(fhirDataTypes){
                    importedFhirDataTypes = fhirDataTypes;
                    var finalResources = [];
                    var index = 0;
                    angular.forEach(importedResources, function (resource) {
                        resource.index = index++;
                        finalResources.push(buildResourceList(resource));
                    });
                    deferred.resolve(resources);
                });
            });

            return deferred;
        }
    }
}]);
