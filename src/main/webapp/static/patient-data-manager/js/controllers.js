'use strict';

angular.module('pdmApp.controllers', []).controller('pdmCtrl',
    ['$scope','$filter', "$uibModal", "$http", "$terminologyService", "$resourceJson",
    function ($scope, $filter, $uibModal, $http, $terminologyService, $resourceJson ) {

    $scope.patient = {
        name: ''
    };

    $scope.resourceConfig = $resourceJson;
    $scope.resourceList = [];
    $scope.observationList = [];
    $scope.observationFullList = [];
    $scope.observationFilteredList = [];
    $scope.selectedObservation = '';
    $scope.enteredFilter = '';
    $scope.pages = [];
    $scope.selectedPage = {};

    $scope.getValueSetExpansion = $terminologyService.getValueSetExpansion;

    $scope.pageSelected = function(page){
        while ($scope.observationList.length > 0) {
            $scope.observationList.pop();
        }

        $$("obsList").clearAll();
        angular.forEach(page.data, function (value) {
            $$("obsList").add(value);
            $scope.observationList.push(value);
        });
        $$("obsList").refresh();

    };

    $scope.$watchGroup(['enteredFilter'], function() {

//        $scope.observationFilteredList = $scope.observationFullList.filter(function( obj ) {
//
//            if ((typeof obj.code.coding[0].display != undefined && obj.code.coding[0].display.indexOf($scope.enteredFilter) > -1) ||
//                (typeof obj.prettyDate != undefined && obj.prettyDate.indexOf($scope.enteredFilter) > -1) ||
//                (typeof obj.code.coding[0].code != undefined && obj.code.coding[0].code.indexOf($scope.enteredFilter) > -1) ||
//                (typeof obj.code.coding[0].system != undefined && obj.code.coding[0].system.indexOf($scope.enteredFilter) > -1) ||
//                (typeof obj.valueQuantity.value != undefined && obj.valueQuantity.value.toString().indexOf($scope.enteredFilter) > -1) ||
//                (typeof obj.valueQuantity.unit != undefined && obj.valueQuantity.unit.indexOf($scope.enteredFilter) > -1) ||
//                (typeof obj.status && obj.status.indexOf($scope.enteredFilter) > -1)) {
//                return true;
//            }
//        });
//        $$("obsList").refresh();
//        $$("resList").refresh();
//        $$("resList").select($$("resList").getFirstId());
//        $$("obsList").select($$("obsList").getFirstId());

    });

    $scope.selectedObservationList = function() {
        if ($$("obsList").count() == 0 )
            return;
        if (typeof $$("obsList").getItem($$("obsList").getSelectedId()) === 'undefined') {
            if ($$("obsList").getFirstId() !== 'undefined') {
                $$("obsList").select($$("obsList").getFirstId());
            }
        }
        $scope.selectedObservation = angular.copy($$("obsList").getItem($$("obsList").getSelectedId()));
        $scope.selectedObservation.prettyDate = $filter('date')(new Date($scope.selectedObservation.effectiveDateTime), 'MM/dd/yyyy HH:mm');
        $$('detailView').show();
        $scope.$apply();
    };

    $scope.selectedResourceList = function() {
        var selectedId = $$("resList").getSelectedId();
        var result = $.grep($scope.resourceList, function(e){ return e.id == selectedId; });
    };

    $scope.setCoding = function(item, model, label) {
        $scope.selectedObservation.code.coding[0] = item;
    };

    $scope.requestDeleteResource = function() {

        webix.confirm({
            title:"Delete Observation",
            ok:"Yes",
            cancel:"No",
            type:"confirm-error",
            text:"Are you sure you want to delete?",
            callback:function(result){ //setting callback
                if (result == true) {
                    $scope.deleteResource();
                }
            }
        });
    };

    $scope.openCreateDialog = function (operation) {

        if (operation === 'create') {
            $scope.newObservation = {
                "resourceType" : "Observation",
                "code" :
                {
                    "coding" :
                        [
                            {
                                "system" : "http://loinc.org",
                                "code" : "",
                                "display" : ""
                            }
                        ]
                },
                "valueQuantity" :
                {
                    "value" : "",
                    "unit" : "",
                    "code" : "mg/dL"
                },
                "prettyDate" : $filter('date')(new Date(), 'MM/dd/yyyy HH:mm'),
                "status" : "final"
            };
        } else {
            $scope.newObservation = $scope.selectedObservation;
        }

        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: 'js/templates/createObservation.html',
            controller: 'ModalInstanceCtrl',
            size:'lg',
            resolve: {
                newObservation: function () {
                    return $scope.newObservation;
                }
            }
        });

        modalInstance.result.then(function (newObservation) {
            $scope.createNewResource(newObservation);
        }, function () {
        });
    };

    $scope.openWebixCreateDialog = function(operation) {
        var createObsWin = webix.ui({
            view: 'window',
            head: 'Create Observation',
            width:700,
            modal: true,
            position: 'center',
            body: {
                view: 'form',
                width:700,
                elements: [
                    {
                        margin: 10,
                        cols: [
                            {
                                rows: [
                                    { view: 'text', label: 'Observation', name: 'obsDisplay', id: 'obsDisplay',labelWidth: "110", invalidMessage: "Observation display can not be empty" },
                                    { view: 'text', label: 'Code', name: 'obsCode', id: 'obsCode',labelWidth: "110", invalidMessage: "Code can not be empty" },
                                    { view: 'text', label: 'Value', name: 'obsValue', id: 'obsValue', labelWidth: "110", invalidMessage: "Value must be a number" },
                                    { view: 'combo', label: 'Status', id: 'obsStatus',labelWidth: "110" , value:"final",
                                        options: ["final", "registered", "preliminary", "amended","cancelled", "entered-in-error", "unknown"]
                                    }
                                ]
                            },
                            {
                                rows: [
                                    { view: 'datepicker', label: 'Effective Date', id: 'obsDate',labelWidth: "110", timepicker:true },
                                    { view: 'text', label: 'System', name: 'obsSystem', id: 'obsSystem',labelWidth: "110", invalidMessage: "System can not be empty" },
                                    { view: 'text', label: 'Units', name: 'obsUnits', id: 'obsUnits',labelWidth: "110", invalidMessage: "Units can not be empty" }
                                ]
                            }
                        ]
                    },
                    {
                        margin: 10,
                        cols: [
                            {},
                            {
                                view: 'button', value: 'Create', height:40, width:100, align:"right",
                                click:function(){
                                    var form = this.getParentView().getParentView();
                                    if (form.validate()){
                                        this.getTopParentView().hide();
                                        $scope.createResource();
                                    }

                                }
                            },
                            {
                                view: 'button', value: 'Cancel', height:40, width:100, align:"right",
                                click: function (elementId, event) {
                                    this.getTopParentView().hide();
                                }
                            }
                        ]
                    }

                ],
                rules:{
//                    "obsValue":function(value){
//                        return !value || webix.rules.isNumber(value)
//                    },
                    "obsValue": webix.rules.isNumber,
                    "obsDisplay": webix.rules.isNotEmpty,
                    "obsCode": webix.rules.isNotEmpty,
                    "obsUnits": webix.rules.isNotEmpty,
                    "obsSystem": webix.rules.isNotEmpty
                }
            },
            move: true

        });
        if (operation === 'create') {
            $$('obsDate').setValue(new Date());
        } else {

            $$('obsDisplay').setValue($scope.selectedObservation.code.coding[0].display);
            $$('obsDate').setValue(new Date($scope.selectedObservation.prettyDate));
            $$('obsCode').setValue($scope.selectedObservation.code.coding[0].code);
            $$('obsSystem').setValue($scope.selectedObservation.code.coding[0].system);
            $$('obsValue').setValue($scope.selectedObservation.valueQuantity.value);
            $$('obsUnits').setValue($scope.selectedObservation.valueQuantity.unit);
            $$('obsStatus').setValue($scope.selectedObservation.status);

        }
        createObsWin.show();
    };

    $scope.createNewResource = function(newObservation) {

        var newObs = formatJSONTemplate('{ \
            "resourceType" : "Observation",\
            "code" :\
            {\
                "coding" :\
                    [\
                        {\
                            "system" : "{3}",\
                            "code" : "{2}",\
                            "display" : "{0}"\
                        }\
                    ]\
            },\
            "valueQuantity" :\
            {\
                "value" : {4},\
                "unit" : "{5}",\
                "code" : "mg/dL"\
            },\
            "effectiveDateTime" : "{1}",\
            "status" : "{6}",\
            "subject" :\
            {\
                "reference" : "Patient/{7}"\
            }\
        }',
            newObservation.code.coding[0].display,
            new Date(newObservation.prettyDate).toISOString(),
            newObservation.code.coding[0].code,
            newObservation.code.coding[0].system,
            newObservation.valueQuantity.value,
            newObservation.valueQuantity.unit,
            newObservation.status,
            $scope.patient.id);

        $scope.smart.api.create({type: "Observation", data: newObs})
            .done(function(){
                queryObservationData($scope.smart);
                webix.message("Observation Saved");
            }).fail(function(){
                webix.message({ type:"error", text:"Observation failed to Save" });
                console.log("failed to create observation", arguments);
            });
    };

    $scope.createResource = function() {

        var newObs = formatJSONTemplate('{ \
            "resourceType" : "Observation",\
            "code" :\
            {\
                "coding" :\
                    [\
                        {\
                            "system" : "{3}",\
                            "code" : "{2}",\
                            "display" : "{0}"\
                        }\
                    ]\
            },\
            "valueQuantity" :\
            {\
                "value" : {4},\
                "unit" : "{5}",\
                "code" : "mg/dL"\
            },\
            "effectiveDateTime" : "{1}",\
            "status" : "{6}",\
            "subject" :\
            {\
                "reference" : "Patient/{7}"\
            }\
        }',
            $$('obsDisplay').getValue(),
            new Date($$('obsDate').getValue()).toISOString(),
            $$('obsCode').getValue(),
            $$('obsSystem').getValue(),
            $$('obsValue').getValue(),
            $$('obsUnits').getValue(),
            $$('obsStatus').getValue(),
            $scope.patient.id);

        $scope.smart.api.create({type: "Observation", data: newObs})
            .done(function(){
                queryObservationData($scope.smart);
                webix.message("Observation Saved");
            }).fail(function(){
                webix.message({ type:"error", text:"Observation failed to Save" });
                console.log("failed to create observation", arguments);
            });
    };

    $scope.updateResource = function() {
        var modifiedResource = angular.copy($scope.selectedObservation);
        delete modifiedResource.meta;
        modifiedResource.effectiveDateTime = new Date(modifiedResource.prettyDate).toISOString();
        delete modifiedResource.prettyDate;

        $scope.smart.api.update({type: "Observation", data: JSON.stringify(modifiedResource), id: modifiedResource.id})
            .done(function(){
                queryObservationData($scope.smart);
                webix.message("Observation Saved");
            }).fail(function(){
                webix.message({ type:"error", text:"Observation failed to Save" });
                console.log("failed to create observation", arguments);
            });
    };

    $scope.deleteResource = function() {
        var selected = $$("obsList").getSelectedId();
        $scope.smart.api.delete({type: "Observation", id: selected})
            .done(function(){
                queryObservationData($scope.smart);
                webix.message("Observation Deleted");
            }).fail(function(){
                webix.message({ type:"error", text:"Observation failed to Delete" });
                console.log("failed to create observation", arguments);
            });
    };

    function formatJSONTemplate(format) {
        var args = Array.prototype.slice.call(arguments, 1);
        return format.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        });
    }

    $scope.getNextObsPage = function(pageNum, obsLastResult) {
        var deferred = $.Deferred();
        $.when($scope.smart.patient.api.nextPage({bundle: obsLastResult.data}))
        .done(function(obsNextResult){
                var observations = [];
                var obsListFinal = [];
                obsNextResult.data.entry.forEach(function(obs){
                    observations.push(obs.resource);
                });
                if(observations){
                    observations = $filter('orderBy')(observations,"effectiveDateTime");
                }
                angular.forEach(observations, function (value) {
                    if (value.valueQuantity === undefined) {
                        value.valueQuantity = {};
                        value.valueQuantity.unit ="";
                        value.valueQuantity.value="";
                    }
                    value.prettyDate = $filter('date')(new Date(value.effectiveDateTime), 'MM/dd/yyyy HH:mm');
                    obsListFinal.push(value);
                });
                $scope.$apply();
                deferred.resolve(obsListFinal, pageNum, obsNextResult);
            });
        return deferred;
    };

    function hasNext(obsSearchResult) {
        var hasNextLink = false;
        obsSearchResult.data.link.forEach(function(link) {
            if (link.relation == "next") {
                hasNextLink = true;
            }
        });
        return hasNextLink;
    }

    function calculatePages() {
        var pageCnt = Math.floor($scope.obsSearchResult.data.total / 50);
        if (($scope.obsSearchResult.data.total % 50) != 0) {
            pageCnt++;
        }
        $scope.pages.push({pageNum: 1, data: angular.copy($scope.observationList)});
        for (var i = 2; i <= pageCnt; i++) {
            $scope.pages.push({pageNum: i, data: []});
        }
        $scope.selection.selectedPage = $scope.pages[0];
    }

    function getAllPages(pageNum, nextLastResult) {
        $scope.getNextObsPage(pageNum, nextLastResult)
            .done(function(obsList, pageNum, nextPageResult){
                $scope.pages[pageNum].data = obsList;
                if(hasNext(nextPageResult)) {
                   getAllPages(++pageNum, nextPageResult)
                }
            });
    }

    function queryPatient(){
        $.when($scope.smart.patient.read())
            .done(function(patient){
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

    function getAllResources(index, resources) {
        $scope.queryObservationData(index, resources)
            .done(function(obsList, index, nextResult){
                $scope.resourceList[index].data = obsList;
                if(index < $scope.resourceConfig.length) {
                    getAllPages(++index, nextResult)
                }
            });
    }

    function queryObservationData() {
        var deferred = $.Deferred();

        $.when($scope.smart.patient.api.search({type: "Observation", count: 50}))
            .done(function(obsSearchResult){
                $scope.obsSearchResult = obsSearchResult;
                var observations = [];
                obsSearchResult.data.entry.forEach(function(obs){
                    observations.push(obs.resource);
                });
                if(observations){
                    $scope.values = $filter('orderBy')(observations,"effectiveDateTime");
                }

                while ($scope.observationList.length > 0) {
                    $scope.observationList.pop();
                }

                $$("obsList").clearAll();
                //Hack because I can't figure out how to get webix to ignore
                //missing data
                angular.forEach($scope.values, function (value) {
                    if (value.valueQuantity === undefined) {
                        value.valueQuantity = {};
                        value.valueQuantity.unit ="";
                        value.valueQuantity.value="";
                    }
                    value.prettyDate = $filter('date')(new Date(value.effectiveDateTime), 'MM/dd/yyyy HH:mm');
                    $$("obsList").add(value);
                    $scope.observationList.push(value);
                });

                $$("resList").clearAll();
                $scope.resourceList.pop();
                $scope.resourceList.push(JSON.parse('{ "id":"1", "resource": "Observation", ' +
                    '"count": "' + obsSearchResult.data.total + '"}'));
                $$("resList").add($scope.resourceList[0]);
                $$("resList").select($$("resList").getFirstId());
                $$("obsList").select($$("obsList").getFirstId());

                $$("resList").refresh();
                $$("obsList").refresh();
                $scope.pages = [];
                calculatePages();
                getAllPages(1, $scope.obsSearchResult);

                deferred.resolve();
            });
        return deferred;
    }

    FHIR.oauth2.ready(function(smart){
        $scope.smart = smart;
        queryPatient(smart);
        queryObservationData(smart)
            .done(function(){
                webix.ready(function() {
//                    $$("detailView").hide();
                    $$("resList").attachEvent("onAfterLoad", function(){
                        $$("resList").select($$("resList").getFirstId());
                    });
                    $$("obsList").attachEvent("onAfterLoad", function(){
                        $$("obsList").select($$("obsList").getFirstId());
                    });
                });
                $scope.$digest();
            });
        $terminologyService.getObservationCodesValueSetId();
    });

}]).controller('ModalInstanceCtrl',['$scope', '$uibModalInstance', "$http", "$terminologyService", "newObservation",
    function ($scope, $uibModalInstance, $http, $terminologyService, newObservation) {

    $scope.newObservation = newObservation;

    $scope.getValueSetExpansion = $terminologyService.getValueSetExpansion;

    $scope.create = function (newObsResult) {
        $uibModalInstance.close(newObsResult);
    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    };

    $scope.setCoding = function(item, model, label) {
        $scope.newObservation.code.coding[0] = item;
    };
}]);