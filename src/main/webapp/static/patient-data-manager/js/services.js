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
        } ;

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
            angular.forEach(selectedResourceTypeConfig.references, function (value) {
                dmh.getModelParent(template, value.path)[ dmh.getModelLeaf(value.path) ] = "";
            });
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

    }).factory('$resourceJson', ['$http',function($http) {
    return $http.get('config/resources.json');
}]).factory('$fhirDatatypesJson', ['$http',function($http) {
    return $http.get('config/fhirDatatypes.json');
}]);
