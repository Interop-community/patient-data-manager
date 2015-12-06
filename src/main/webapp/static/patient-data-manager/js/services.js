'use strict';

angular.module('pdmApp.services', []).factory('$terminologyService', function ($http) {

    var terminologyServer = 'http://fhir2.healthintersections.com.au/open';
    //var terminologyServer = 'http://fhirtest.uhn.ca/baseDstu2/'
    var observationCodesId;

    var terminologyService = {};

    terminologyService.fhirService = FHIR.client({
        serviceUrl: terminologyServer
    });

    // Any function returning a promise object can be used to load values asynchronously
    terminologyService.getValueSetExpansion = function(val, min) {
        if (val.length >= min) {
            return $http.get(terminologyServer + '/ValueSet/' + observationCodesId + '/$expand?filter=' + val, {
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
        terminologyService.fhirService.api.search({type: 'ValueSet', query: {url: 'http://hl7.org/fhir/ValueSet/observation-codes'}})
            .done(function(valueSet){
                if (valueSet.data.entry[0] !== 'undefined'){
                    observationCodesId = valueSet.data.entry[0].resource.id;
                }
                deferred.resolve();
            });
        return deferred;
    };

    return terminologyService;
}).factory('$resourceJson', ['$http',function($http) {
    return $http.get('config/resources.json');
}]);
